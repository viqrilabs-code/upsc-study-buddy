export type MainsQuestionDraft = {
  question: string;
  source: "generated" | "custom";
  totalMarks: string;
  wordLimit: string;
  rationale: string;
  pyqSignals: string[];
  answerApproach: string[];
  keywords: string[];
};

export type MainsEvaluationDraft = {
  transcription: string;
  verdict: string;
  score: string;
  totalMarks: string;
  wordLimit: string;
  strengths: string[];
  gaps: string[];
  upgrades: string[];
  improvedDirection: string;
  nextStep: string;
};

const mainsSubjectSignals: Record<string, string> = {
  polity:
    "Favor analytical questions around constitutional values, institutional performance, federalism, rights, accountability, local governance, and judiciary-executive-legislature tensions.",
  history:
    "Favor cause-effect, continuity-change, significance, and critical appraisal questions around modern India, national movement, post-independence themes, and world-history linkages.",
  geography:
    "Favor concept-to-application questions around physical processes, monsoon, resources, disaster geography, regional disparities, and human geography with Indian examples.",
  economy:
    "Favor policy-economy linkage questions around growth, inflation, employment, fiscal strategy, agriculture, infrastructure, inclusion, and external-sector consequences.",
  environment:
    "Favor questions around conservation-governance, climate policy, biodiversity, sustainability, pollution, disaster resilience, and international-environment commitments.",
  "science and tech":
    "Favor issue-based questions around technology governance, innovation, strategic sectors, AI, biotech, space, cybersecurity, and societal implications.",
  ethics:
    "Favor value-conflict, applied ethics, public-service conduct, accountability, empathy, probity, and governance case-linked questions.",
  essay:
    "Favor broad civilizational, governance, democracy, development, ethics, and society themes with scope for multi-dimensional argument.",
};

function escapeSubjectKey(subject: string) {
  return subject
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTagContent(text: string, tag: string) {
  const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`<${escapedTag}>([\\s\\S]*?)<\\/${escapedTag}>`, "i"));

  return match?.[1]?.trim() || "";
}

function toLineList(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
    .filter(Boolean);
}

export function getMainsPyqPatternGuide(subject: string, topic: string, chapter: string) {
  const normalizedSubject = escapeSubjectKey(subject);
  const subjectSignal =
    mainsSubjectSignals[normalizedSubject] ||
    "Favor analytical UPSC GS-style questions with clear directive words, layered arguments, and a contemporary governance or societal angle where relevant.";

  return [
    `Subject signal: ${subjectSignal}`,
    `Topic signal: Keep the question tightly anchored to "${topic || "the chosen topic"}".`,
    chapter ? `Chapter signal: Use "${chapter}" as the core chapter boundary for framing the question.` : "",
    "UPSC last-10-year pattern signal: prefer directive words like discuss, examine, analyze, critically analyze, evaluate, or comment; avoid generic school-style factual prompts; make the demand analytical and answerable in roughly 150-250 words.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function parseMainsQuestionDraft(raw: string): MainsQuestionDraft {
  const question = getTagContent(raw, "question");
  const source = getTagContent(raw, "source").toLowerCase() === "custom" ? "custom" : "generated";
  const totalMarks = getTagContent(raw, "total_marks") || "10";
  const wordLimit = getTagContent(raw, "word_limit") || "150";
  const rationale = getTagContent(raw, "rationale");
  const pyqSignals = toLineList(getTagContent(raw, "pyq_signals")).slice(0, 6);
  const answerApproach = toLineList(getTagContent(raw, "answer_approach")).slice(0, 7);
  const keywords = toLineList(getTagContent(raw, "keywords")).slice(0, 10);

  if (!question || !rationale || !pyqSignals.length || !answerApproach.length) {
    throw new Error("The generated mains question was incomplete. Please try again.");
  }

  return {
    question,
    source,
    totalMarks,
    wordLimit,
    rationale,
    pyqSignals,
    answerApproach,
    keywords,
  };
}

export function parseMainsEvaluationDraft(raw: string): MainsEvaluationDraft {
  const transcription = getTagContent(raw, "transcription");
  const verdict = getTagContent(raw, "verdict");
  const score = getTagContent(raw, "score");
  const totalMarks = getTagContent(raw, "total_marks") || "";
  const wordLimit = getTagContent(raw, "word_limit") || "";
  const strengths = toLineList(getTagContent(raw, "strengths")).slice(0, 8);
  const gaps = toLineList(getTagContent(raw, "gaps")).slice(0, 8);
  const upgrades = toLineList(getTagContent(raw, "upgrades")).slice(0, 8);
  const improvedDirection = getTagContent(raw, "improved_direction");
  const nextStep = getTagContent(raw, "next_step");

  if (!transcription || !verdict || !score || !strengths.length || !gaps.length) {
    throw new Error("The handwritten evaluation response was incomplete. Please try again.");
  }

  return {
    transcription,
    verdict,
    score,
    totalMarks,
    wordLimit,
    strengths,
    gaps,
    upgrades,
    improvedDirection,
    nextStep,
  };
}

export async function toMainsAnswerInputParts(files: File[]) {
  const parts: Array<
    | {
        type: "input_image";
        image_url: string;
        detail: "high";
      }
    | {
        type: "input_file";
        filename: string;
        file_data: string;
      }
  > = [];

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    if (file.type.startsWith("image/")) {
      parts.push({
        type: "input_image",
        image_url: `data:${file.type};base64,${base64}`,
        detail: "high",
      });
      continue;
    }

    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      parts.push({
        type: "input_file",
        filename: file.name,
        file_data: `data:application/pdf;base64,${base64}`,
      });
      continue;
    }

    throw new Error(
      `${file.name} is not supported for mains evaluation. Upload JPG, PNG, WEBP, or PDF handwritten answers.`,
    );
  }

  return parts;
}
