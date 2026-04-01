export type PrelimsQuestionDraft = {
  id: string;
  stem: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctOption: "A" | "B" | "C" | "D";
  explanation: string;
  trap: string;
  patternSignal: string;
};

export type PrelimsQuizDraft = {
  title: string;
  framingNote: string;
  patternNotes: string[];
  questions: PrelimsQuestionDraft[];
};

export type PrelimsReviewDraft = {
  score: string;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  verdict: string;
  strengths: string[];
  gaps: string[];
  nextSteps: string[];
};

export type PrelimsQuestionReview = {
  id: string;
  stem: string;
  selectedOption: string;
  correctOption: "A" | "B" | "C" | "D";
  isCorrect: boolean;
  attempted: boolean;
  explanation: string;
  trap: string;
  patternSignal: string;
  focus: string;
};

export type PrelimsReviewSummary = {
  review: PrelimsQuestionReview[];
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  score: string;
};

type RawQuizDraft = {
  title?: unknown;
  framingNote?: unknown;
  patternNotes?: unknown;
  questions?: unknown;
};

type RawQuestionDraft = {
  id?: unknown;
  stem?: unknown;
  options?: unknown;
  correctOption?: unknown;
  explanation?: unknown;
  trap?: unknown;
  patternSignal?: unknown;
};

const validOptions = new Set(["A", "B", "C", "D"]);

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => asTrimmedString(item))
    .filter(Boolean);
}

function extractJsonObject(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace < 0 || lastBrace < 0 || lastBrace <= firstBrace) {
    throw new Error("The prelims response was not valid JSON.");
  }

  return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as RawQuizDraft;
}

function parseQuestion(question: RawQuestionDraft, index: number): PrelimsQuestionDraft {
  const stem = asTrimmedString(question.stem);
  const explanation = asTrimmedString(question.explanation);
  const trap = asTrimmedString(question.trap);
  const patternSignal = asTrimmedString(question.patternSignal);
  const correctOption = asTrimmedString(question.correctOption).toUpperCase();
  const optionsSource = question.options as Record<string, unknown> | undefined;
  const optionA = asTrimmedString(optionsSource?.A);
  const optionB = asTrimmedString(optionsSource?.B);
  const optionC = asTrimmedString(optionsSource?.C);
  const optionD = asTrimmedString(optionsSource?.D);

  if (
    !stem ||
    !explanation ||
    !trap ||
    !patternSignal ||
    !validOptions.has(correctOption) ||
    !optionA ||
    !optionB ||
    !optionC ||
    !optionD
  ) {
    throw new Error(`MCQ ${index + 1} was incomplete. Please generate the test again.`);
  }

  return {
    id: asTrimmedString(question.id) || `Q${index + 1}`,
    stem,
    options: {
      A: optionA,
      B: optionB,
      C: optionC,
      D: optionD,
    },
    correctOption: correctOption as "A" | "B" | "C" | "D",
    explanation,
    trap,
    patternSignal,
  };
}

export function parsePrelimsQuizDraft(raw: string): PrelimsQuizDraft {
  const parsed = extractJsonObject(raw);
  const questionsSource = Array.isArray(parsed.questions) ? parsed.questions : [];
  const questions = questionsSource.map((item, index) => parseQuestion(item as RawQuestionDraft, index));

  if (questions.length !== 10) {
    throw new Error("The prelims test must contain exactly 10 questions.");
  }

  return {
    title: asTrimmedString(parsed.title) || "UPSC Prelims Practice Set",
    framingNote:
      asTrimmedString(parsed.framingNote) ||
      "Generated in a UPSC-style prelims pattern with statement-based reasoning and elimination traps.",
    patternNotes: toStringList(parsed.patternNotes).slice(0, 6),
    questions,
  };
}

export function buildPrelimsPatternGuide(subject: string, topic: string) {
  return [
    `Subject anchor: ${subject}.`,
    `Topic anchor: ${topic || "Use the chosen subject focus."}.`,
    "Pattern anchor: stay close to recent official UPSC Civil Services (Preliminary) Examination GS-style patterns visible in the 2023 and 2025 question paper framing, including statement-based questions, concept-application blends, careful elimination, and non-trivial distractors.",
    "Trend anchor: prefer mixed static-plus-current relevance, avoid coaching-institute gimmicks, and maintain UPSC-like ambiguity without becoming unfair or obscure.",
  ].join(" ");
}

export function buildPrelimsReviewSummary(
  quiz: PrelimsQuizDraft,
  answers: Record<string, string>,
): PrelimsReviewSummary {
  const review = quiz.questions.map((question) => {
    const selected = asTrimmedString(answers[question.id] || "").toUpperCase();
    const normalizedSelected = validOptions.has(selected) ? selected : "";
    const isCorrect = normalizedSelected === question.correctOption;
    const attempted = Boolean(normalizedSelected);

    return {
      id: question.id,
      stem: question.stem,
      selectedOption: normalizedSelected,
      correctOption: question.correctOption,
      isCorrect,
      attempted,
      explanation: question.explanation,
      trap: question.trap,
      patternSignal: question.patternSignal,
      focus: `${quiz.title} | ${question.id}`,
    };
  });

  const correctCount = review.filter((item) => item.isCorrect).length;
  const attemptedCount = review.filter((item) => item.attempted).length;
  const unansweredCount = review.length - attemptedCount;
  const incorrectCount = attemptedCount - correctCount;

  return {
    review,
    correctCount,
    incorrectCount,
    unansweredCount,
    score: `${correctCount}/10`,
  };
}
