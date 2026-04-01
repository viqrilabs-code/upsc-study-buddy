export type RevisionTrack = "gs" | "optional";

export type ValidationInput = {
  text: string;
  track: RevisionTrack;
  subject?: string;
  optionalSubject?: string;
  topic?: string;
};

export type ValidationResult = {
  valid: boolean;
  reason: string;
  matchedKeywords: string[];
  subjectLabel: string;
};

export const gsSubjectOptions = [
  "Polity",
  "History",
  "Geography",
  "Economy",
  "Environment",
  "Science and Tech",
  "Ethics",
  "Essay",
  "CSAT",
] as const;

export const optionalSubjectOptions = [
  "PSIR",
  "Sociology",
  "Anthropology",
  "History",
  "Geography",
  "Public Administration",
  "Philosophy",
  "Economics",
  "Law",
  "Psychology",
] as const;

const genericAcademicKeywords = [
  "syllabus",
  "topic",
  "paper",
  "unit",
  "chapter",
  "concept",
  "theory",
  "governance",
  "constitution",
  "history",
  "society",
  "economy",
  "ethics",
  "geography",
  "science",
  "technology",
  "state",
  "government",
  "policy",
  "essay",
  "question",
  "answer",
];

const unrelatedKeywords = [
  "invoice",
  "billing",
  "checkout",
  "cart",
  "discount",
  "coupon",
  "wedding",
  "recipe",
  "restaurant",
  "hotel",
  "javascript",
  "react component",
  "docker",
  "deployment",
  "meeting agenda",
  "job description",
  "resume",
  "lyrics",
  "poem collection",
  "marketing campaign",
];

const gsSubjectKeywordMap: Record<string, string[]> = {
  polity: [
    "constitution",
    "fundamental rights",
    "directive principles",
    "parliament",
    "judiciary",
    "executive",
    "federalism",
    "governance",
    "representation of the people act",
    "panchayati raj",
    "local government",
    "constitutional amendment",
  ],
  history: [
    "ancient india",
    "medieval india",
    "modern india",
    "indian national movement",
    "freedom struggle",
    "post independence",
    "world history",
    "art and culture",
    "colonialism",
    "renaissance",
    "revolt of 1857",
    "independence",
  ],
  geography: [
    "physical geography",
    "monsoon",
    "climate",
    "geomorphology",
    "resources",
    "agriculture",
    "industries",
    "population",
    "ocean currents",
    "earthquake",
    "disaster management",
    "human geography",
  ],
  economy: [
    "indian economy",
    "inclusive growth",
    "budget",
    "banking",
    "inflation",
    "fiscal policy",
    "monetary policy",
    "agriculture",
    "infrastructure",
    "poverty",
    "growth",
    "planning",
  ],
  environment: [
    "biodiversity",
    "ecosystem",
    "conservation",
    "climate change",
    "pollution",
    "environmental impact",
    "protected areas",
    "wildlife",
    "sustainable development",
    "ecology",
    "wetlands",
    "environment",
  ],
  "science and tech": [
    "science and technology",
    "biotechnology",
    "space",
    "robotics",
    "artificial intelligence",
    "nanotechnology",
    "indigenization",
    "applications",
    "innovation",
    "semiconductor",
    "quantum",
    "cyber security",
  ],
  ethics: [
    "ethics",
    "integrity",
    "aptitude",
    "attitude",
    "emotional intelligence",
    "civil service values",
    "probity",
    "accountability",
    "ethical dilemma",
    "case study",
    "compassion",
    "conscience",
  ],
  essay: [
    "essay",
    "argument",
    "society",
    "governance",
    "education",
    "ethics",
    "democracy",
    "development",
    "justice",
    "technology",
    "woman",
    "environment",
  ],
  csat: [
    "comprehension",
    "logical reasoning",
    "analytical ability",
    "decision making",
    "problem solving",
    "numeracy",
    "data interpretation",
    "basic mathematics",
    "passage",
    "reasoning",
  ],
};

const optionalKeywordMap: Record<string, string[]> = {
  psir: [
    "political theory",
    "western political thought",
    "indian political thought",
    "comparative politics",
    "international relations",
    "foreign policy",
    "thinker",
    "state",
    "power",
    "justice",
  ],
  sociology: [
    "society",
    "social structure",
    "stratification",
    "modernity",
    "family",
    "kinship",
    "religion",
    "thinker",
    "social change",
    "rural society",
  ],
  anthropology: [
    "anthropology",
    "tribe",
    "culture",
    "kinship",
    "evolution",
    "archaeological",
    "human genetics",
    "social anthropology",
    "biological anthropology",
    "tribal issues",
  ],
  history: [
    "ancient india",
    "medieval india",
    "modern india",
    "historiography",
    "world history",
    "colonialism",
    "national movement",
    "post independence",
    "sources",
    "culture",
  ],
  geography: [
    "geomorphology",
    "climatology",
    "oceanography",
    "perspectives in geography",
    "population geography",
    "settlement geography",
    "regional planning",
    "economic geography",
    "models and theories",
    "india geography",
  ],
  "public administration": [
    "public administration",
    "administrative thought",
    "organization theory",
    "personnel administration",
    "financial administration",
    "accountability",
    "governance",
    "district administration",
    "comparative public administration",
    "administrative reforms",
  ],
  philosophy: [
    "philosophy",
    "metaphysics",
    "epistemology",
    "ethics",
    "logic",
    "indian philosophy",
    "western philosophy",
    "thinker",
    "knowledge",
    "reality",
  ],
  economics: [
    "microeconomics",
    "macroeconomics",
    "public finance",
    "international economics",
    "growth and development",
    "indian economy",
    "welfare economics",
    "money and banking",
    "econometrics",
    "trade",
  ],
  law: [
    "constitutional law",
    "international law",
    "law of torts",
    "criminal law",
    "contract",
    "legal theory",
    "rights",
    "justice",
    "judiciary",
    "administrative law",
  ],
  psychology: [
    "psychology",
    "learning",
    "motivation",
    "personality",
    "cognition",
    "social psychology",
    "research methods",
    "aptitude",
    "emotion",
    "behavior",
  ],
};

function normalizeValue(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeSubjectKey(value: string) {
  const normalized = normalizeValue(value);

  if (normalized === "science tech" || normalized === "science and technology") {
    return "science and tech";
  }

  return normalized;
}

function getCanonicalGsSubject(subject: string) {
  const normalized = normalizeSubjectKey(subject);

  return gsSubjectOptions.find(
    (option) => normalizeSubjectKey(option) === normalized || normalizeValue(option) === normalized,
  );
}

function getOptionalSubjectLabel(optionalSubject: string) {
  const normalized = normalizeSubjectKey(optionalSubject);

  return (
    optionalSubjectOptions.find((option) => normalizeSubjectKey(option) === normalized) ||
    optionalSubject.trim() ||
    "Optional"
  );
}

function getTopicTokens(topic: string) {
  return normalizeValue(topic)
    .split(" ")
    .filter((token) => token.length >= 4);
}

function getMatches(text: string, keywords: string[]) {
  return keywords.filter((keyword) => text.includes(normalizeValue(keyword)));
}

export function getRevisionSubjectLabel(
  track: RevisionTrack,
  subject?: string,
  optionalSubject?: string,
) {
  if (track === "optional") {
    return getOptionalSubjectLabel(optionalSubject || "");
  }

  return getCanonicalGsSubject(subject || "") || subject?.trim() || "General Studies";
}

export function validateUpscSyllabusText({
  text,
  track,
  subject,
  optionalSubject,
  topic,
}: ValidationInput): ValidationResult {
  const normalizedText = normalizeValue(text);
  const activeSubjectLabel = getRevisionSubjectLabel(track, subject, optionalSubject);

  if (normalizedText.length < 250) {
    return {
      valid: false,
      reason:
        "The uploaded file is too thin to validate against the UPSC syllabus. Upload a fuller chapter, notes PDF, or class material.",
      matchedKeywords: [],
      subjectLabel: activeSubjectLabel,
    };
  }

  const genericMatches = getMatches(normalizedText, genericAcademicKeywords);
  const noiseMatches = getMatches(normalizedText, unrelatedKeywords);
  const topicMatches = getMatches(normalizedText, getTopicTokens(topic || ""));

  if (track === "gs") {
    const canonicalSubject = getCanonicalGsSubject(subject || "") || activeSubjectLabel;
    const syllabusMatches = getMatches(
      normalizedText,
      gsSubjectKeywordMap[normalizeSubjectKey(canonicalSubject)] || [],
    );

    const valid =
      syllabusMatches.length >= 2 ||
      (syllabusMatches.length >= 1 && topicMatches.length >= 1) ||
      (syllabusMatches.length >= 1 && genericMatches.length >= 3);

    if (valid && !(noiseMatches.length >= 4 && syllabusMatches.length === 0)) {
      return {
        valid: true,
        reason: "",
        matchedKeywords: [...new Set([...syllabusMatches, ...topicMatches])].slice(0, 8),
        subjectLabel: canonicalSubject,
      };
    }

    return {
      valid: false,
      reason: `This upload does not look like UPSC ${canonicalSubject} syllabus material. Upload notes or source content tied to the chosen GS area.`,
      matchedKeywords: syllabusMatches,
      subjectLabel: canonicalSubject,
    };
  }

  const activeOptional = getOptionalSubjectLabel(optionalSubject || "");
  const subjectTokens = getTopicTokens(activeOptional);
  const optionalMatches = getMatches(
    normalizedText,
    optionalKeywordMap[normalizeSubjectKey(activeOptional)] || [],
  );
  const optionalSubjectMatches = getMatches(normalizedText, subjectTokens);

  const valid =
    optionalMatches.length >= 2 ||
    (optionalMatches.length >= 1 && topicMatches.length >= 1) ||
    (optionalSubjectMatches.length >= 1 && genericMatches.length >= 3) ||
    (optionalSubjectMatches.length >= 1 && topicMatches.length >= 1);

  if (valid && !(noiseMatches.length >= 4 && optionalMatches.length === 0 && topicMatches.length === 0)) {
    return {
      valid: true,
      reason: "",
      matchedKeywords: [...new Set([...optionalMatches, ...optionalSubjectMatches, ...topicMatches])].slice(0, 8),
      subjectLabel: activeOptional,
    };
  }

  return {
    valid: false,
    reason: `This upload does not appear to fit the chosen UPSC optional subject, ${activeOptional}. Upload optional notes, class material, or a chapter from the selected optional.`,
    matchedKeywords: [...optionalMatches, ...optionalSubjectMatches],
    subjectLabel: activeOptional,
  };
}
