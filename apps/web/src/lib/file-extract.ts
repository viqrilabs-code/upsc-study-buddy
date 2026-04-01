import { createRequire } from "node:module";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const MAX_EXTRACTED_CHARACTERS = 12000;
const moduleRequire = createRequire(import.meta.url);

type PdfParseModule = {
  PDFParse: new (options: { data: Buffer }) => {
    getText: () => Promise<{ text?: string }>;
    destroy: () => Promise<void>;
  };
};

let cachedPdfParseModule: PdfParseModule | null = null;

export type ExtractedUpload = {
  name: string;
  text: string;
};

function getFileExtension(name: string) {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() || "" : "";
}

function truncateText(value: string) {
  const trimmed = value.trim();

  if (trimmed.length <= MAX_EXTRACTED_CHARACTERS) {
    return trimmed;
  }

  return `${trimmed.slice(0, MAX_EXTRACTED_CHARACTERS)}\n\n[Truncated for upload limits]`;
}

function isPlainTextFile(file: File) {
  if (file.type.startsWith("text/")) {
    return true;
  }

  return ["md", "markdown", "txt", "json", "csv", "html", "xml"].includes(
    getFileExtension(file.name),
  );
}

async function extractPdfText(file: File) {
  const { PDFParse } = loadPdfParseModule();
  const buffer = Buffer.from(await file.arrayBuffer());
  const parser = new PDFParse({ data: buffer });

  try {
    const parsed = await parser.getText();

    return truncateText(parsed.text || "");
  } finally {
    await parser.destroy();
  }
}

function loadPdfParseModule() {
  if (cachedPdfParseModule) {
    return cachedPdfParseModule;
  }

  cachedPdfParseModule = moduleRequire("pdf-parse") as PdfParseModule;

  return cachedPdfParseModule;
}

async function extractPlainText(file: File) {
  const buffer = await file.arrayBuffer();
  const text = new TextDecoder("utf-8").decode(buffer);

  return truncateText(text);
}

export async function extractFileText(file: File) {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`${file.name} is too large. Keep uploads under 8 MB.`);
  }

  const extension = getFileExtension(file.name);

  if (file.type === "application/pdf" || extension === "pdf") {
    return extractPdfText(file);
  }

  if (isPlainTextFile(file)) {
    return extractPlainText(file);
  }

  throw new Error(
    `${file.name} is not supported yet. Please upload PDF, TXT, MD, CSV, JSON, HTML, or XML files.`,
  );
}

export async function extractUploadFiles(files: File[]) {
  const extracted: ExtractedUpload[] = [];

  for (const file of files) {
    const text = await extractFileText(file);

    if (text) {
      extracted.push({
        name: file.name,
        text,
      });
    }
  }

  return extracted;
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
