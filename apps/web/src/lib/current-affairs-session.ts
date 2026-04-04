import { createHash, randomUUID } from "node:crypto";
import type {
  StoredCurrentAffairsPack,
} from "@/lib/current-affairs-pack";
import type { ExtractedUpload } from "@/lib/file-extract";

type CurrentAffairsSourceKind =
  | "admin-newspaper"
  | "admin-magazine"
  | "user-newspaper";

export type CurrentAffairsChunk = {
  id: string;
  sourceKind: CurrentAffairsSourceKind;
  sourceName: string;
  title: string;
  crux: string;
  text: string;
  keywords: string[];
  relevanceScore: number;
};

export type CurrentAffairsSession = {
  id: string;
  createdAt: string;
  updatedAt: string;
  sourceSignature: string;
  chunks: CurrentAffairsChunk[];
  shortlistChunkIds: string[];
  activeChunkIds: string[];
};

const POSITIVE_KEYWORDS = [
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
  "quad",
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
  "federalism",
  "cooperative federalism",
  "heat action plan",
  "public health",
  "resilience",
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

const STOP_WORDS = new Set([
  "aaj",
  "about",
  "after",
  "and",
  "article",
  "articles",
  "class",
  "current",
  "discuss",
  "discussion",
  "editorial",
  "explain",
  "for",
  "from",
  "give",
  "issue",
  "kya",
  "news",
  "paper",
  "please",
  "take",
  "that",
  "the",
  "this",
  "today",
  "topic",
  "want",
  "with",
]);

const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const MIN_BLOCK_LENGTH = 80;
const MIN_CHUNK_LENGTH = 420;
const MAX_CHUNK_LENGTH = 1800;
const MAX_CHUNKS_PER_SOURCE = 10;
const SHORTLIST_COUNT = 4;
const ACTIVE_CONTEXT_COUNT = 2;

const globalSessionStore = globalThis as typeof globalThis & {
  __tamgamCurrentAffairsSessions?: Map<string, CurrentAffairsSession>;
};

const sessionStore =
  globalSessionStore.__tamgamCurrentAffairsSessions ??
  (globalSessionStore.__tamgamCurrentAffairsSessions = new Map<
    string,
    CurrentAffairsSession
  >());

function nowIso() {
  return new Date().toISOString();
}

function normalizeWhitespace(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .trim();
}

function splitBlocks(text: string) {
  return normalizeWhitespace(text)
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length >= MIN_BLOCK_LENGTH);
}

function countOccurrences(text: string, token: string) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.match(new RegExp(`\\b${escaped}\\b`, "g"))?.length || 0;
}

function scoreTextForUpsc(text: string) {
  const normalized = text.toLowerCase();
  let score = 0;

  for (const keyword of POSITIVE_KEYWORDS) {
    if (normalized.includes(keyword)) {
      score += 3 + countOccurrences(normalized, keyword);
    }
  }

  for (const keyword of NEGATIVE_KEYWORDS) {
    if (normalized.includes(keyword)) {
      score -= 6;
    }
  }

  return score;
}

function mergeBlocksIntoChunks(blocks: string[]) {
  const chunks: string[] = [];
  let current = "";

  for (const block of blocks) {
    const candidate = current ? `${current}\n\n${block}` : block;

    if (candidate.length <= MAX_CHUNK_LENGTH) {
      current = candidate;
      continue;
    }

    if (current.length >= MIN_CHUNK_LENGTH) {
      chunks.push(current);
      current = block;
      continue;
    }

    chunks.push(candidate.slice(0, MAX_CHUNK_LENGTH));
    current = candidate.slice(MAX_CHUNK_LENGTH).trim();
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.filter((chunk) => chunk.length >= MIN_BLOCK_LENGTH);
}

function cleanTitleCandidate(value: string) {
  return value
    .replace(/^[^A-Za-z0-9]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function deriveChunkTitle(text: string, sourceName: string, position: number) {
  const firstLine = cleanTitleCandidate(text.split("\n")[0] || "");
  const firstSentence = cleanTitleCandidate(text.split(/(?<=[.?!])\s+/)[0] || "");
  const candidate = (firstLine || firstSentence).slice(0, 90).trim();

  if (candidate && /[A-Za-z]{3,}/.test(candidate)) {
    return candidate;
  }

  return `${sourceName} | Issue ${position + 1}`;
}

function deriveChunkCrux(text: string) {
  return text.replace(/\s+/g, " ").slice(0, 260).trim();
}

function extractKeywords(text: string) {
  const normalized = text.toLowerCase();
  return POSITIVE_KEYWORDS.filter((keyword) => normalized.includes(keyword)).slice(0, 6);
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function inferOrdinalSelection(message: string) {
  const normalized = message.toLowerCase();

  if (/\b(first|1st|option 1|one|1)\b/.test(normalized)) {
    return 0;
  }

  if (/\b(second|2nd|option 2|two|2)\b/.test(normalized)) {
    return 1;
  }

  if (/\b(third|3rd|option 3|three|3)\b/.test(normalized)) {
    return 2;
  }

  if (/\b(fourth|4th|option 4|four|4)\b/.test(normalized)) {
    return 3;
  }

  return -1;
}

function getLastUserMessage(messages: { role: string; content: string }[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message?.role === "user" && message.content) {
      return message.content;
    }
  }

  return "";
}

function buildSourceSignature(input: {
  adminPack: StoredCurrentAffairsPack | null;
  userNewspapers: ExtractedUpload[];
}) {
  const hash = createHash("sha256");
  const { adminPack, userNewspapers } = input;

  if (adminPack) {
    hash.update(`admin:${adminPack.uploadedAt}|${adminPack.newspaperCount}|${adminPack.magazineCount}`);

    for (const doc of [...adminPack.newspapers, ...adminPack.magazines]) {
      hash.update(`${doc.name}|${doc.filteredText.length}|${doc.rawExcerpt.length}`);
    }
  }

  for (const doc of userNewspapers) {
    hash.update(`${doc.name}|${doc.text.length}`);
  }

  return hash.digest("hex");
}

function toChunkSourceDocuments(input: {
  adminPack: StoredCurrentAffairsPack | null;
  userNewspapers: ExtractedUpload[];
}) {
  const documents: Array<{
    sourceKind: CurrentAffairsSourceKind;
    sourceName: string;
    text: string;
  }> = [];

  if (input.adminPack) {
    for (const doc of input.adminPack.newspapers) {
      documents.push({
        sourceKind: "admin-newspaper",
        sourceName: doc.name,
        text: doc.filteredText || doc.rawExcerpt,
      });
    }

    for (const doc of input.adminPack.magazines) {
      documents.push({
        sourceKind: "admin-magazine",
        sourceName: doc.name,
        text: doc.filteredText || doc.rawExcerpt,
      });
    }
  }

  for (const doc of input.userNewspapers) {
    documents.push({
      sourceKind: "user-newspaper",
      sourceName: doc.name,
      text: doc.text,
    });
  }

  return documents;
}

function buildChunksForDocument(input: {
  sourceKind: CurrentAffairsSourceKind;
  sourceName: string;
  text: string;
}) {
  const blocks = splitBlocks(input.text);
  const normalizedText = normalizeWhitespace(input.text);
  const fallbackBlocks =
    blocks.length || !normalizedText
      ? blocks
      : normalizedText.match(new RegExp(`.{1,${MAX_CHUNK_LENGTH}}`, "g")) || [];
  const merged = mergeBlocksIntoChunks(fallbackBlocks);
  const scored = merged
    .map((text, index) => ({
      text,
      index,
      relevanceScore: scoreTextForUpsc(text),
    }))
    .filter((entry) => entry.relevanceScore > 0)
    .sort((left, right) => right.relevanceScore - left.relevanceScore)
    .slice(0, MAX_CHUNKS_PER_SOURCE);

  const fallback = merged.slice(0, Math.min(MAX_CHUNKS_PER_SOURCE, 4)).map((text, index) => ({
    text,
    index,
    relevanceScore: scoreTextForUpsc(text),
  }));

  const selected = scored.length ? scored : fallback;

  return selected.map((entry, position) => ({
    id: randomUUID(),
    sourceKind: input.sourceKind,
    sourceName: input.sourceName,
    title: deriveChunkTitle(entry.text, input.sourceName, position),
    crux: deriveChunkCrux(entry.text),
    text: entry.text,
    keywords: extractKeywords(entry.text),
    relevanceScore: entry.relevanceScore,
  }));
}

function rankChunksForQuery(
  chunks: CurrentAffairsChunk[],
  query: string,
  shortlistedIds: string[],
  activeIds: string[],
) {
  const queryTokens = tokenize(query);
  const ordinalSelection = inferOrdinalSelection(query);

  return chunks
    .map((chunk, index) => {
      const haystack = `${chunk.title}\n${chunk.crux}\n${chunk.text}`.toLowerCase();
      let score = chunk.relevanceScore;

      if (shortlistedIds.includes(chunk.id)) {
        score += 8;
      }

      if (activeIds.includes(chunk.id)) {
        score += 12;
      }

      if (ordinalSelection >= 0 && shortlistedIds[ordinalSelection] === chunk.id) {
        score += 60;
      }

      for (const token of queryTokens) {
        if (haystack.includes(token)) {
          score += 5 + countOccurrences(haystack, token);
        }
      }

      return {
        chunk,
        score,
        index,
      };
    })
    .sort((left, right) => right.score - left.score);
}

function cleanupExpiredSessions() {
  const now = Date.now();

  for (const [sessionId, session] of sessionStore.entries()) {
    if (now - new Date(session.updatedAt).getTime() > SESSION_TTL_MS) {
      sessionStore.delete(sessionId);
    }
  }
}

function touchSession(session: CurrentAffairsSession) {
  session.updatedAt = nowIso();
  sessionStore.set(session.id, session);
  return session;
}

export function ensureCurrentAffairsSession(input: {
  sessionId?: string;
  adminPack: StoredCurrentAffairsPack | null;
  userNewspapers: ExtractedUpload[];
}) {
  cleanupExpiredSessions();
  const sourceSignature = buildSourceSignature(input);

  if (input.sessionId) {
    const existing = sessionStore.get(input.sessionId);

    if (existing && (!input.userNewspapers.length || existing.sourceSignature === sourceSignature)) {
      return touchSession(existing);
    }
  }

  const chunks = toChunkSourceDocuments(input)
    .flatMap((document) => buildChunksForDocument(document))
    .sort((left, right) => right.relevanceScore - left.relevanceScore);

  const shortlistChunkIds = chunks.slice(0, SHORTLIST_COUNT).map((chunk) => chunk.id);
  const session: CurrentAffairsSession = {
    id: randomUUID(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    sourceSignature,
    chunks,
    shortlistChunkIds,
    activeChunkIds: [],
  };

  sessionStore.set(session.id, session);
  return session;
}

export function buildCurrentAffairsTurnContext(
  session: CurrentAffairsSession,
  input: {
    messages: { role: string; content: string }[];
    isBroadRequest: boolean;
  },
) {
  if (!session.chunks.length) {
    return {
      session: touchSession(session),
      context: "",
    };
  }

  const latestUserMessage = getLastUserMessage(input.messages);

  if (input.isBroadRequest) {
    const shortlist = session.shortlistChunkIds
      .map((chunkId) => session.chunks.find((chunk) => chunk.id === chunkId))
      .filter((chunk): chunk is CurrentAffairsChunk => Boolean(chunk));

    return {
      session: touchSession(session),
      context: [
        "Today's shortlisted UPSC-relevant issues:",
        ...shortlist.map(
          (chunk, index) =>
            `${index + 1}. ${chunk.title}\nCrux: ${chunk.crux}\nKeywords: ${
              chunk.keywords.length ? chunk.keywords.join(", ") : "UPSC relevance"
            }`,
        ),
      ].join("\n\n"),
    };
  }

  const ranked = rankChunksForQuery(
    session.chunks,
    latestUserMessage,
    session.shortlistChunkIds,
    session.activeChunkIds,
  );
  const selected = ranked
    .slice(0, ACTIVE_CONTEXT_COUNT)
    .filter((entry, index) => index === 0 || entry.score >= ranked[0].score * 0.72)
    .map((entry) => entry.chunk);

  const fallback = selected.length
    ? selected
    : session.shortlistChunkIds
        .map((chunkId) => session.chunks.find((chunk) => chunk.id === chunkId))
        .filter((chunk): chunk is CurrentAffairsChunk => Boolean(chunk))
        .slice(0, 1);

  session.activeChunkIds = fallback.map((chunk) => chunk.id);

  return {
    session: touchSession(session),
    context: [
      "Current affairs focus for this turn:",
      ...fallback.map(
        (chunk, index) =>
          `Focus ${index + 1}: ${chunk.title}\nCrux: ${chunk.crux}\nKeywords: ${
            chunk.keywords.length ? chunk.keywords.join(", ") : "UPSC relevance"
          }\nDetailed issue slice:\n${chunk.text}`,
      ),
    ].join("\n\n"),
  };
}
