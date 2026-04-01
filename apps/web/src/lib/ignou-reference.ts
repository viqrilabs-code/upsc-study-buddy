import { readFile } from "node:fs/promises";
import path from "node:path";

type IgnouDocument = {
  title: string;
  handleUrl: string;
  pdfUrl: string;
  localPdf: string;
  chunks: string[];
};

type IgnouSubjectBucket = {
  label: string;
  queryTerms: string[];
  docs: IgnouDocument[];
};

type IgnouIndex = {
  generatedAt: string;
  source: string;
  subjects: Record<string, IgnouSubjectBucket>;
};

type ScoredChunk = {
  title: string;
  handleUrl: string;
  text: string;
  score: number;
};

const SUBJECT_ALIASES: Record<string, string> = {
  polity: "polity",
  "political science": "polity",
  history: "history",
  geography: "geography",
  economy: "economy",
  economics: "economy",
  environment: "environment",
  "science and tech": "science-tech",
  "science & tech": "science-tech",
  "science and technology": "science-tech",
  ethics: "ethics",
  essay: "essay",
  csat: "csat",
};

const STOP_WORDS = new Set([
  "about",
  "after",
  "against",
  "along",
  "also",
  "among",
  "an",
  "and",
  "any",
  "are",
  "article",
  "articles",
  "because",
  "been",
  "before",
  "being",
  "between",
  "both",
  "can",
  "civil",
  "constitution",
  "current",
  "each",
  "exam",
  "explain",
  "for",
  "from",
  "fundamental",
  "give",
  "government",
  "have",
  "how",
  "into",
  "its",
  "lets",
  "local",
  "make",
  "more",
  "need",
  "notes",
  "one",
  "only",
  "practice",
  "question",
  "questions",
  "raj",
  "rights",
  "study",
  "subject",
  "than",
  "that",
  "the",
  "their",
  "them",
  "there",
  "these",
  "they",
  "this",
  "topic",
  "under",
  "upsc",
  "user",
  "using",
  "what",
  "when",
  "which",
  "with",
  "would",
  "your",
]);

let cachedIndexPromise: Promise<IgnouIndex | null> | null = null;

function getIndexPath() {
  return path.join(process.cwd(), "data", "private", "ignou", "index.json");
}

function normalizeSubject(subject: string) {
  return SUBJECT_ALIASES[subject.trim().toLowerCase()] || subject.trim().toLowerCase();
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function countOccurrences(text: string, token: string) {
  const matches = text.match(new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"));
  return matches?.length || 0;
}

function scoreChunk(text: string, tokens: string[]) {
  const lowerText = text.toLowerCase();
  let score = 0;

  for (const token of tokens) {
    if (lowerText.includes(token)) {
      score += 3 + countOccurrences(lowerText, token);
    }
  }

  return score;
}

async function loadIndex() {
  if (!cachedIndexPromise) {
    cachedIndexPromise = readFile(getIndexPath(), "utf8")
      .then((contents) => JSON.parse(contents) as IgnouIndex)
      .catch(() => null);
  }

  return cachedIndexPromise;
}

export async function buildIgnouReferenceContext(subject: string, query: string) {
  const index = await loadIndex();

  if (!index) {
    return "";
  }

  const normalizedSubject = normalizeSubject(subject);
  const bucket = index.subjects[normalizedSubject];

  if (!bucket?.docs?.length) {
    return "";
  }

  const tokens = tokenize(`${subject} ${query}`);
  const candidates: ScoredChunk[] = bucket.docs.flatMap((doc) =>
    doc.chunks.map((chunk) => ({
      title: doc.title,
      handleUrl: doc.handleUrl,
      text: chunk,
      score: scoreChunk(chunk, tokens),
    })),
  );

  const ranked = candidates
    .sort((left, right) => right.score - left.score)
    .filter((item, indexPosition) => indexPosition < 12);

  const selected = ranked.filter((item) => item.score > 0).slice(0, 3);

  const fallbackSelection =
    selected.length > 0
      ? selected
      : bucket.docs.slice(0, 2).flatMap((doc) =>
          doc.chunks.slice(0, 1).map((chunk) => ({
            title: doc.title,
            handleUrl: doc.handleUrl,
            text: chunk,
            score: 0,
          })),
        );

  if (!fallbackSelection.length) {
    return "";
  }

  return [
    `Use the official IGNOU study material excerpts below as background reference for ${bucket.label} when relevant.`,
    "This is local private reference material fetched from eGyanKosh; summarise it instead of quoting long passages.",
    ...fallbackSelection.map(
      (item, indexPosition) =>
        `IGNOU reference ${indexPosition + 1}: ${item.title}\nSource: ${item.handleUrl}\n${item.text}`,
    ),
  ].join("\n\n");
}
