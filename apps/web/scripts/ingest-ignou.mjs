import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFParse } from "pdf-parse";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const APP_ROOT = process.cwd();
const DATA_ROOT = path.join(APP_ROOT, "data", "private", "ignou");
const PDF_ROOT = path.join(DATA_ROOT, "pdfs");
const INDEX_PATH = path.join(DATA_ROOT, "index.json");
const BASE_URL = "https://www.egyankosh.ac.in";
const MAX_DOCS_PER_SUBJECT = 3;
const MAX_CHUNKS_PER_DOC = 8;
const CHUNK_SIZE = 1400;

const SUBJECTS = [
  {
    key: "polity",
    label: "Polity",
    queries: ["political theory", "political culture", "modern indian political thought"],
  },
  {
    key: "history",
    label: "History",
    queries: ["urban history", "colonial history writing", "history writing india"],
  },
  {
    key: "geography",
    label: "Geography",
    queries: ["geography", "settlement geography", "foundation of geography"],
  },
  {
    key: "economy",
    label: "Economy",
    queries: ["indian economy unit 1", "development economics unit 1", "public economics unit 1"],
  },
  {
    key: "environment",
    label: "Environment",
    queries: ["environmental studies", "ecology environment", "sustainable development"],
  },
  {
    key: "science-tech",
    label: "Science and Tech",
    queries: ["science and technology in india", "science literacy", "science and philosophy"],
  },
  {
    key: "ethics",
    label: "Ethics",
    queries: ["introduction to ethics", "ethics philosophy", "perspectives in ethics"],
  },
  {
    key: "essay",
    label: "Essay",
    queries: ["academic writing composition", "writing a composition", "writing effectively"],
  },
  {
    key: "csat",
    label: "CSAT",
    queries: ["logical reasoning", "basic mathematics", "aptitude reasoning"],
  },
];

function stripHtml(value) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeFileName(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function cleanExtractedText(value) {
  return value
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function chunkText(value) {
  const paragraphs = cleanExtractedText(value)
    .split(/\n\s*\n+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 80);

  const sourceParagraphs = paragraphs.length ? paragraphs : [cleanExtractedText(value)];
  const chunks = [];
  let current = "";

  for (const paragraph of sourceParagraphs) {
    const nextValue = current ? `${current}\n\n${paragraph}` : paragraph;

    if (nextValue.length > CHUNK_SIZE && current) {
      chunks.push(current.trim());
      current = paragraph;
    } else {
      current = nextValue;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.slice(0, MAX_CHUNKS_PER_DOC);
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 UPSC-Study-Buddy IGNOU Ingest",
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

async function fetchBuffer(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 UPSC-Study-Buddy IGNOU Ingest",
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to download ${url}: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function extractHandleLinks(html) {
  const seen = new Set();
  const results = [];

  for (const match of html.matchAll(/<a[^>]+href="(\/handle\/123456789\/\d+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = `${BASE_URL}${match[1]}`;
    const title = stripHtml(match[2] || "");

    if (!title || seen.has(href)) {
      continue;
    }

    seen.add(href);
    results.push({ href, title });
  }

  return results;
}

function extractPdfLinks(html) {
  const seen = new Set();
  const results = [];

  for (const match of html.matchAll(/href="(\/bitstream\/123456789\/[^"]+?\.pdf)"/gi)) {
    const href = `${BASE_URL}${match[1]}`;

    if (!seen.has(href)) {
      seen.add(href);
      results.push(href);
    }
  }

  return results;
}

function extractPageTitle(html) {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  return stripHtml(match?.[1] || "IGNOU study material").replace(/^eGyanKosh:\s*/i, "");
}

async function downloadAndExtractPdf(pdfUrl, outputPath) {
  const pdfBuffer = await fetchBuffer(pdfUrl);
  await writeFile(outputPath, pdfBuffer);

  const parser = new PDFParse({ data: pdfBuffer });

  try {
    const result = await parser.getText();
    return cleanExtractedText(result.text || "");
  } finally {
    await parser.destroy();
  }
}

async function collectSubjectDocs(subject) {
  const outputDir = path.join(PDF_ROOT, subject.key);
  await mkdir(outputDir, { recursive: true });

  const docs = [];
  const seenHandles = new Set();
  const seenPdfUrls = new Set();
  const seenTitles = new Set();

  for (const query of subject.queries) {
    if (docs.length >= MAX_DOCS_PER_SUBJECT) {
      break;
    }

    console.log(`Searching IGNOU for ${subject.label}: ${query}`);
    const searchHtml = await fetchText(
      `${BASE_URL}/simple-search?query=${encodeURIComponent(query)}`,
    );
    const handles = extractHandleLinks(searchHtml);

    for (const handle of handles) {
      if (docs.length >= MAX_DOCS_PER_SUBJECT) {
        break;
      }

      if (seenHandles.has(handle.href)) {
        continue;
      }

      seenHandles.add(handle.href);

      try {
        const handleHtml = await fetchText(handle.href);
        const pdfLinks = extractPdfLinks(handleHtml);

        if (!pdfLinks.length) {
          continue;
        }

        const pdfUrl = pdfLinks[0];

        if (seenPdfUrls.has(pdfUrl)) {
          continue;
        }

        seenPdfUrls.add(pdfUrl);

        const title = extractPageTitle(handleHtml) || handle.title;

        if (seenTitles.has(title.toLowerCase())) {
          continue;
        }

        const localFileName = `${docs.length + 1}-${sanitizeFileName(title) || "ignou"}.pdf`;
        const localPdfPath = path.join(outputDir, localFileName);
        const extractedText = await downloadAndExtractPdf(pdfUrl, localPdfPath);
        const chunks = chunkText(extractedText);

        if (!chunks.length) {
          continue;
        }

        seenTitles.add(title.toLowerCase());
        console.log(`  Saved ${subject.label}: ${title}`);
        docs.push({
          title,
          handleUrl: handle.href,
          pdfUrl,
          localPdf: path.relative(APP_ROOT, localPdfPath).replace(/\\/g, "/"),
          chunks,
        });
      } catch (error) {
        console.warn(`  Skipped ${handle.href}: ${error instanceof Error ? error.message : error}`);
      }
    }
  }

  return docs;
}

async function loadExistingIndex() {
  try {
    const contents = await readFile(INDEX_PATH, "utf8");
    return JSON.parse(contents);
  } catch {
    return null;
  }
}

async function main() {
  await mkdir(DATA_ROOT, { recursive: true });
  await mkdir(PDF_ROOT, { recursive: true });

  const existingIndex = await loadExistingIndex();
  const index = {
    generatedAt: new Date().toISOString(),
    source: `${BASE_URL}/`,
    subjects: {},
    previousGeneratedAt: existingIndex?.generatedAt || null,
  };

  for (const subject of SUBJECTS) {
    const docs = await collectSubjectDocs(subject);

    index.subjects[subject.key] = {
      label: subject.label,
      queryTerms: subject.queries,
      docs,
    };
  }

  await writeFile(INDEX_PATH, JSON.stringify(index, null, 2), "utf8");

  const summary = Object.entries(index.subjects).map(
    ([key, bucket]) => `${key}: ${bucket.docs.length} docs`,
  );

  console.log("IGNOU ingestion complete.");
  console.log(summary.join(" | "));
  console.log(`Index written to ${INDEX_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
