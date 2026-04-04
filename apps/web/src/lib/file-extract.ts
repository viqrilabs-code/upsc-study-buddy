import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import {
  getConfiguredModel,
  getOpenAIClient,
  getReasoningConfig,
  getTextVerbosity,
} from "@/lib/openai";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const MAX_EXTRACTED_CHARACTERS = 12000;
const SUPPORTED_TEXT_EXTENSIONS = ["md", "markdown", "txt", "json", "csv", "html", "xml"];
const SUPPORTED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const IMAGE_MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};
const moduleRequire = createRequire(import.meta.url);

type ExtractionOptions = {
  maxCharacters?: number | null;
};

type PdfParseModule = {
  PDFParse: new (options: { data: Buffer }) => {
    getText: () => Promise<{ text?: string }>;
    destroy: () => Promise<void>;
  };
};

type CanvasRuntimeModule = {
  DOMMatrix?: typeof globalThis.DOMMatrix;
  DOMPoint?: typeof globalThis.DOMPoint;
  DOMRect?: typeof globalThis.DOMRect;
  ImageData?: typeof globalThis.ImageData;
  Path2D?: typeof globalThis.Path2D;
};

let cachedPdfParseModule: PdfParseModule | null = null;
let pdfRuntimePrepared = false;

export type ExtractedUpload = {
  name: string;
  text: string;
};

function getFileExtension(name: string) {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() || "" : "";
}

function truncateText(
  value: string,
  maxCharacters: number | null | undefined = MAX_EXTRACTED_CHARACTERS,
) {
  const trimmed = value.trim();
  const safeMaxCharacters =
    typeof maxCharacters === "number" && Number.isFinite(maxCharacters) ? maxCharacters : null;

  if (safeMaxCharacters === null || safeMaxCharacters <= 0) {
    return trimmed;
  }

  if (trimmed.length <= safeMaxCharacters) {
    return trimmed;
  }

  return `${trimmed.slice(0, safeMaxCharacters)}\n\n[Truncated for upload limits]`;
}

function isPlainTextFile(file: File) {
  if (file.type.startsWith("text/")) {
    return true;
  }

  return SUPPORTED_TEXT_EXTENSIONS.includes(getFileExtension(file.name));
}

function getSupportedImageMimeType(file: File) {
  const normalizedType = file.type.trim().toLowerCase();

  if (normalizedType === "image/jpg") {
    return "image/jpeg";
  }

  if (SUPPORTED_IMAGE_MIME_TYPES.includes(normalizedType)) {
    return normalizedType;
  }

  return IMAGE_MIME_TYPE_BY_EXTENSION[getFileExtension(file.name)] || "";
}

function isSupportedImageFile(file: File) {
  return Boolean(getSupportedImageMimeType(file));
}

function extractResponseText(response: { output_text?: unknown; output?: unknown }) {
  const directText = typeof response.output_text === "string" ? response.output_text.trim() : "";

  if (directText) {
    return directText;
  }

  if (!Array.isArray(response.output)) {
    return "";
  }

  const parts: string[] = [];

  for (const item of response.output) {
    if (!item || typeof item !== "object" || !("type" in item) || item.type !== "message") {
      continue;
    }

    const content = "content" in item ? item.content : undefined;

    if (!Array.isArray(content)) {
      continue;
    }

    for (const entry of content) {
      if (!entry || typeof entry !== "object" || !("type" in entry)) {
        continue;
      }

      if (entry.type === "output_text" && "text" in entry && typeof entry.text === "string") {
        const value = entry.text.trim();

        if (value) {
          parts.push(value);
        }
      }
    }
  }

  return parts.join("\n\n").trim();
}

async function extractPdfText(file: File, options: ExtractionOptions = {}) {
  const { PDFParse } = loadPdfParseModule();
  const buffer = Buffer.from(await file.arrayBuffer());
  const parser = new PDFParse({ data: buffer });

  try {
    const parsed = await parser.getText();

    return truncateText(parsed.text || "", options.maxCharacters);
  } finally {
    await parser.destroy();
  }
}

function loadPdfParseModule() {
  if (cachedPdfParseModule) {
    return cachedPdfParseModule;
  }

  ensurePdfRuntimeGlobals();
  cachedPdfParseModule = moduleRequire("pdf-parse") as PdfParseModule;

  return cachedPdfParseModule;
}

function ensurePdfRuntimeGlobals() {
  if (pdfRuntimePrepared) {
    return;
  }

  try {
    const canvasRuntime = moduleRequire("@napi-rs/canvas") as CanvasRuntimeModule;

    if (!globalThis.DOMMatrix && canvasRuntime.DOMMatrix) {
      globalThis.DOMMatrix = canvasRuntime.DOMMatrix;
    }

    if (!globalThis.DOMPoint && canvasRuntime.DOMPoint) {
      globalThis.DOMPoint = canvasRuntime.DOMPoint;
    }

    if (!globalThis.DOMRect && canvasRuntime.DOMRect) {
      globalThis.DOMRect = canvasRuntime.DOMRect;
    }

    if (!globalThis.ImageData && canvasRuntime.ImageData) {
      globalThis.ImageData = canvasRuntime.ImageData;
    }

    if (!globalThis.Path2D && canvasRuntime.Path2D) {
      globalThis.Path2D = canvasRuntime.Path2D;
    }
  } catch {
    // Leave globals untouched. If pdf-parse still needs DOM APIs, its own error will surface.
  }

  pdfRuntimePrepared = true;
}

async function extractPlainText(file: File, options: ExtractionOptions = {}) {
  const buffer = await file.arrayBuffer();
  const text = new TextDecoder("utf-8").decode(buffer);

  return truncateText(text, options.maxCharacters);
}

async function extractImageText(file: File, options: ExtractionOptions = {}) {
  const mimeType = getSupportedImageMimeType(file);

  if (!mimeType) {
    throw new Error(
      `${file.name} is not supported yet. Please upload JPG, PNG, WEBP, PDF, TXT, MD, CSV, JSON, HTML, or XML files.`,
    );
  }

  const client = getOpenAIClient();
  const model = getConfiguredModel();
  const reasoning = getReasoningConfig(model);
  const textVerbosity = getTextVerbosity(model, "low");
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const response = await client.responses.create({
    model,
    ...(reasoning ? { reasoning } : {}),
    text: {
      verbosity: textVerbosity,
    },
    instructions:
      "You are extracting OCR text from a UPSC study-material image. Return only the readable text from the image. Preserve useful headings, bullets, and short line breaks where clear. Ignore decorative elements, borders, shadows, and background clutter. Do not summarize or explain the content.",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: "Transcribe this study-material image into plain text only.",
          },
          {
            type: "input_image",
            image_url: `data:${mimeType};base64,${base64}`,
            detail: "high",
          },
        ],
      },
    ],
    max_output_tokens: 2400,
  });
  const text = truncateText(extractResponseText(response), options.maxCharacters);

  if (!text) {
    throw new Error(
      `${file.name} could not be read clearly. Try a sharper image, better lighting, or upload a PDF instead.`,
    );
  }

  return text;
}

export async function extractFileText(file: File, options: ExtractionOptions = {}) {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`${file.name} is too large. Keep uploads under 8 MB.`);
  }

  const extension = getFileExtension(file.name);

  if (file.type === "application/pdf" || extension === "pdf") {
    return extractPdfText(file, options);
  }

  if (isPlainTextFile(file)) {
    return extractPlainText(file, options);
  }

  if (isSupportedImageFile(file)) {
    return extractImageText(file, options);
  }

  throw new Error(
    `${file.name} is not supported yet. Please upload JPG, PNG, WEBP, PDF, TXT, MD, CSV, JSON, HTML, or XML files.`,
  );
}

export async function extractUploadFiles(files: File[], options: ExtractionOptions = {}) {
  const extracted: ExtractedUpload[] = [];

  for (const file of files) {
    const text = await extractFileText(file, options);

    if (text) {
      extracted.push({
        name: file.name,
        text,
      });
    }
  }

  return extracted;
}

export function getUploadFileSignature(file: File) {
  return createHash("sha256")
    .update(
      [
        file.name.trim().toLowerCase(),
        String(file.size),
        file.type.trim().toLowerCase(),
        String(file.lastModified || 0),
      ].join("|"),
    )
    .digest("hex");
}

export function buildUploadsContextFromExtracted(
  studyMaterials: ExtractedUpload[],
  newspapers: ExtractedUpload[],
) {
  const sections: string[] = [];

  for (const file of studyMaterials) {
    sections.push(`Study material: ${file.name}\n${file.text}`);
  }

  for (const file of newspapers) {
    sections.push(`User uploaded newspaper: ${file.name}\n${file.text}`);
  }

  if (!sections.length) {
    return "";
  }

  return [
    "Use the uploaded material below as context for this conversation.",
    "If a newspaper file is uploaded, treat it as the preferred current-affairs source for this response instead of relying only on the default digest framing.",
    "",
    ...sections,
  ].join("\n\n");
}

export async function buildUploadsContext(studyMaterialFiles: File[], newspaperFiles: File[]) {
  const studyMaterials = await extractUploadFiles(studyMaterialFiles);
  const newspapers = await extractUploadFiles(newspaperFiles);

  return buildUploadsContextFromExtracted(studyMaterials, newspapers);
}
