import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getAdminFirestore } from "@/lib/app-db";
import type { ExtractedUpload } from "@/lib/file-extract";
import { isLocalJsonStoreAllowed } from "@/lib/runtime-config";

export type StoredCurrentAffairsDocument = {
  name: string;
  filteredText: string;
  rawExcerpt: string;
};

export type StoredCurrentAffairsPack = {
  uploadedAt: string;
  uploadedByEmail: string;
  newspaperCount: number;
  magazineCount: number;
  newspapers: StoredCurrentAffairsDocument[];
  magazines: StoredCurrentAffairsDocument[];
};

const CURRENT_AFFAIRS_STORE_PATH = path.join(
  process.cwd(),
  "data",
  "private",
  "current-affairs",
  "latest-pack.json",
);

const POSITIVE_KEYWORDS = [
  "upsc",
  "gs1",
  "gs2",
  "gs3",
  "gs4",
  "constitution",
  "constitutional",
  "parliament",
  "assembly",
  "supreme court",
  "high court",
  "judiciary",
  "federal",
  "governance",
  "government",
  "ministry",
  "scheme",
  "policy",
  "bill",
  "act",
  "law",
  "rights",
  "welfare",
  "health",
  "education",
  "women",
  "children",
  "caste",
  "poverty",
  "nutrition",
  "employment",
  "inflation",
  "gdp",
  "fiscal",
  "monetary",
  "rbi",
  "banking",
  "trade",
  "industry",
  "agriculture",
  "farmer",
  "food security",
  "environment",
  "climate",
  "biodiversity",
  "forest",
  "wildlife",
  "pollution",
  "disaster",
  "energy",
  "science",
  "technology",
  "space",
  "ai",
  "semiconductor",
  "cyber",
  "security",
  "defence",
  "international",
  "foreign policy",
  "geopolitics",
  "united nations",
  "g20",
  "brics",
  "ethics",
  "accountability",
  "transparency",
  "reforms",
  "social justice",
  "urban",
  "rural",
  "infrastructure",
  "water",
  "migration",
  "tribal",
  "governor",
  "election",
  "census",
  "reservation",
];

const NEGATIVE_KEYWORDS = [
  "cricket",
  "ipl",
  "football",
  "tennis",
  "movie",
  "film",
  "celebrity",
  "actor",
  "actress",
  "box office",
  "fashion",
  "lifestyle",
  "horoscope",
  "crossword",
  "sudoku",
  "recipe",
  "travel tips",
  "gossip",
  "music review",
  "match report",
  "sports page",
];

function normalizeWhitespace(value: string) {
  return value.replace(/\r/g, "").replace(/\t/g, " ").replace(/[ ]{2,}/g, " ").trim();
}

function splitIntoBlocks(text: string) {
  return normalizeWhitespace(text)
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length >= 80);
}

function scoreBlock(block: string) {
  const normalized = block.toLowerCase();
  let score = 0;

  for (const keyword of POSITIVE_KEYWORDS) {
    if (normalized.includes(keyword)) {
      score += normalized.includes(` ${keyword} `) ? 3 : 2;
    }
  }

  for (const keyword of NEGATIVE_KEYWORDS) {
    if (normalized.includes(keyword)) {
      score -= 5;
    }
  }

  return score;
}

function pickRelevantBlocks(text: string, limit: number) {
  const blocks = splitIntoBlocks(text)
    .map((block) => ({
      block,
      score: scoreBlock(block),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((entry) => entry.block);

  if (blocks.length) {
    return blocks;
  }

  return splitIntoBlocks(text).slice(0, Math.max(1, Math.min(limit, 4)));
}

function filterNewspaperForUpsc(text: string) {
  const blocks = pickRelevantBlocks(text, 10);
  return blocks.join("\n\n");
}

function filterMagazineForUpsc(text: string) {
  const blocks = pickRelevantBlocks(text, 12);
  return blocks.join("\n\n");
}

function toStoredDocument(
  file: ExtractedUpload,
  type: "newspaper" | "magazine",
): StoredCurrentAffairsDocument {
  const filteredText =
    type === "newspaper" ? filterNewspaperForUpsc(file.text) : filterMagazineForUpsc(file.text);

  return {
    name: file.name,
    filteredText,
    rawExcerpt: file.text.slice(0, 2200),
  };
}

export async function saveAdminCurrentAffairsPack(input: {
  newspapers: ExtractedUpload[];
  magazines: ExtractedUpload[];
  uploadedByEmail: string;
}) {
  const pack: StoredCurrentAffairsPack = {
    uploadedAt: new Date().toISOString(),
    uploadedByEmail: input.uploadedByEmail,
    newspaperCount: input.newspapers.length,
    magazineCount: input.magazines.length,
    newspapers: input.newspapers.map((file) => toStoredDocument(file, "newspaper")),
    magazines: input.magazines.map((file) => toStoredDocument(file, "magazine")),
  };

  const firestore = getAdminFirestore();

  if (firestore) {
    await firestore.collection("adminState").doc("currentAffairsLatest").set(pack);
    return pack;
  }

  if (!isLocalJsonStoreAllowed()) {
    throw new Error(
      "Current affairs admin uploads require Firestore in production. Local file fallback is disabled.",
    );
  }

  await mkdir(path.dirname(CURRENT_AFFAIRS_STORE_PATH), { recursive: true });
  await writeFile(CURRENT_AFFAIRS_STORE_PATH, JSON.stringify(pack, null, 2), "utf8");

  return pack;
}

export async function getLatestAdminCurrentAffairsPack() {
  const firestore = getAdminFirestore();

  if (firestore) {
    const snapshot = await firestore.collection("adminState").doc("currentAffairsLatest").get();
    return snapshot.exists ? (snapshot.data() as StoredCurrentAffairsPack) : null;
  }

  if (!isLocalJsonStoreAllowed()) {
    return null;
  }

  try {
    const raw = await readFile(CURRENT_AFFAIRS_STORE_PATH, "utf8");
    return JSON.parse(raw) as StoredCurrentAffairsPack;
  } catch {
    return null;
  }
}

export function buildAdminCurrentAffairsContext(pack: StoredCurrentAffairsPack | null) {
  if (!pack) {
    return "";
  }

  const sections: string[] = [
    `Admin daily current affairs pack uploaded at ${pack.uploadedAt} by ${pack.uploadedByEmail}.`,
  ];

  if (pack.newspapers.length) {
    sections.push(
      [
        "Admin newspaper pack already filtered for UPSC relevance:",
        ...pack.newspapers.map(
          (doc) => `Daily newspaper: ${doc.name}\n${doc.filteredText || doc.rawExcerpt}`,
        ),
      ].join("\n\n"),
    );
  }

  if (pack.magazines.length) {
    sections.push(
      [
        "Admin UPSC magazine/reference pack:",
        ...pack.magazines.map(
          (doc) => `UPSC magazine: ${doc.name}\n${doc.filteredText || doc.rawExcerpt}`,
        ),
      ].join("\n\n"),
    );
  }

  return sections.join("\n\n");
}

export function buildUserNewspaperContext(userNewspapers: ExtractedUpload[]) {
  if (!userNewspapers.length) {
    return "";
  }

  return [
    "User uploaded newspaper pack, filtered for UPSC relevance:",
    ...userNewspapers.map(
      (doc) => `User newspaper: ${doc.name}\n${filterNewspaperForUpsc(doc.text) || doc.text.slice(0, 2200)}`,
    ),
  ].join("\n\n");
}
