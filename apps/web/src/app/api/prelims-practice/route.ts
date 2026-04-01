import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  buildPrelimsPatternGuide,
  buildPrelimsReviewSummary,
  parsePrelimsQuizDraft,
  type PrelimsQuizDraft,
  type PrelimsReviewDraft,
} from "@/lib/prelims-practice";
import {
  getConfiguredModel,
  getOpenAIClient,
  getReasoningConfig,
  getTextVerbosity,
} from "@/lib/openai";
import { createRequestLogger } from "@/lib/logger";
import {
  buildUploadsContextFromExtracted,
  extractUploadFiles,
} from "@/lib/file-extract";
import { savePracticeReport } from "@/lib/app-db";
import {
  buildPersonalizationContext,
  getAuthenticatedAppUser,
  getUsageMeta,
} from "@/lib/product-access";

type PrelimsAction = "generate" | "evaluate";

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function extractResponseText(response: { output_text?: unknown; output?: unknown }) {
  const directText = asTrimmedString(response.output_text);

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

      if (entry.type === "output_text" && "text" in entry) {
        const value = asTrimmedString(entry.text);

        if (value) {
          parts.push(value);
        }
      }
    }
  }

  return parts.join("\n\n").trim();
}

function parseJsonRecord(raw: string) {
  const parsed = JSON.parse(raw) as Record<string, unknown>;

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("The prelims payload was invalid.");
  }

  return parsed;
}

function parseListBlock(raw: string) {
  return raw
    .split("\n")
    .map((line) => line.replace(/^\s*[-*]\s*/, "").trim())
    .filter(Boolean);
}

function extractTagBlock(source: string, tag: string) {
  const match = source.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1]?.trim() || "";
}

function buildFallbackFeedback(
  summary: ReturnType<typeof buildPrelimsReviewSummary>,
): PrelimsReviewDraft {
  const accuracy = Math.round((summary.correctCount / 10) * 100);
  const verdict =
    accuracy >= 70
      ? "Solid prelims attempt. Your elimination is broadly working, but keep tightening precision so easy marks do not slip."
      : accuracy >= 40
        ? "This is a workable base, but the score shows that concept clarity and elimination discipline still need work."
        : "The score is currently below a safe prelims zone. Focus on concept correction first, then return to timed practice.";

  const strengths =
    summary.correctCount > 0
      ? [
          "You converted some questions correctly, which shows the basics are partially in place.",
          "The attempt gives enough signal to identify where your elimination and concept recall are working.",
        ]
      : [
          "You completed the test and created a useful diagnostic for the next round.",
          "This attempt clearly shows which areas need concept rebuilding before more mock practice.",
        ];

  const gaps = [
    summary.incorrectCount
      ? "Incorrect choices suggest that statements and qualifiers are not being screened carefully enough."
      : "You avoided reckless errors, but you still need stronger concept anchoring.",
    summary.unansweredCount
      ? "Some questions were left unanswered, which indicates hesitation under uncertainty."
      : "Attempt selection is active, but accuracy within attempted questions still needs tightening.",
  ];

  const nextSteps = [
    "Rework the wrong questions and write one-line reasons for why each correct option is right.",
    "Revise the topic again with special focus on qualifiers, pairings, and statement-based traps.",
    "Take another 10-question set on the same subject after revision and compare the accuracy jump.",
  ];

  return {
    score: summary.score,
    correctCount: summary.correctCount,
    incorrectCount: summary.incorrectCount,
    unansweredCount: summary.unansweredCount,
    verdict,
    strengths,
    gaps,
    nextSteps,
  };
}

function parseFeedbackDraft(
  raw: string,
  summary: ReturnType<typeof buildPrelimsReviewSummary>,
): PrelimsReviewDraft {
  const verdict = extractTagBlock(raw, "verdict");
  const strengths = parseListBlock(extractTagBlock(raw, "strengths"));
  const gaps = parseListBlock(extractTagBlock(raw, "gaps"));
  const nextSteps = parseListBlock(extractTagBlock(raw, "next_steps"));

  if (!verdict || !strengths.length || !gaps.length || !nextSteps.length) {
    return buildFallbackFeedback(summary);
  }

  return {
    score: summary.score,
    correctCount: summary.correctCount,
    incorrectCount: summary.incorrectCount,
    unansweredCount: summary.unansweredCount,
    verdict,
    strengths,
    gaps,
    nextSteps,
  };
}

async function buildTeacherFeedback({
  client,
  model,
  reasoning,
  textVerbosity,
  quiz,
  subject,
  topic,
  chapter,
  summary,
  uploadsContext,
}: {
  client: ReturnType<typeof getOpenAIClient>;
  model: string;
  reasoning: ReturnType<typeof getReasoningConfig>;
  textVerbosity: ReturnType<typeof getTextVerbosity>;
  quiz: PrelimsQuizDraft;
  subject: string;
  topic: string;
  chapter: string;
  summary: ReturnType<typeof buildPrelimsReviewSummary>;
  uploadsContext: string;
}) {
  const reviewLines = summary.review
    .map((item) => {
      const selected = item.selectedOption || "Unanswered";
      return `${item.id}: selected ${selected}, correct ${item.correctOption}, result ${
        item.isCorrect ? "Correct" : item.attempted ? "Incorrect" : "Unanswered"
      }. Stem: ${item.stem}. Explanation: ${item.explanation}. Trap: ${item.trap}. Pattern: ${item.patternSignal}`;
    })
    .join("\n");

  const response = await client.responses.create({
    model,
    ...(reasoning ? { reasoning } : {}),
    text: {
      verbosity: textVerbosity,
    },
    instructions: `You are a seasoned UPSC prelims teacher reviewing a short 10-question practice set. Give concise but serious feedback in plain text.

Return exactly these tags and nothing else:
<verdict>...</verdict>
<strengths>
- ...
</strengths>
<gaps>
- ...
</gaps>
<next_steps>
- ...
</next_steps>

Rules:
- Verdict must be 2 to 4 sentences.
- Strengths: 2 to 4 bullets.
- Gaps: 2 to 4 bullets.
- Next steps: 2 to 4 actionable bullets.
- Base feedback on the result summary and question review provided, not on generic coaching language.`,
    input: [
      ...(uploadsContext
        ? [
            {
              role: "user" as const,
              content: `${uploadsContext}\n\nUse this uploaded study material as supporting context for the review if it helps explain the user's gaps.`,
            },
          ]
        : []),
      {
        role: "user",
        content: `Subject: ${subject}
Topic: ${topic}
Chapter boundary: ${chapter || "Not specified"}
Quiz title: ${quiz.title}
Score: ${summary.score}
Correct: ${summary.correctCount}
Incorrect: ${summary.incorrectCount}
Unanswered: ${summary.unansweredCount}

Per-question review:
${reviewLines}`,
      },
    ],
    max_output_tokens: 900,
  });

  return parseFeedbackDraft(extractResponseText(response), summary);
}

export async function POST(request: Request) {
  const logger = createRequestLogger("api/prelims-practice", request);
  if (!process.env.OPENAI_API_KEY) {
    logger.error("prelims.misconfigured", undefined, { reason: "missing_openai_key" });
    return NextResponse.json(
      {
        message:
          "OPENAI_API_KEY is not configured. Add it to apps/web/.env.local and restart the dev server.",
      },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const action = (asTrimmedString(formData.get("action")) || "generate") as PrelimsAction;
  const subject = asTrimmedString(formData.get("subject"));
  const topic = asTrimmedString(formData.get("topic"));
  const chapter = asTrimmedString(formData.get("chapter"));
  const studyMaterialFiles = Array.from(formData.getAll("studyMaterial")).filter(
    (item): item is File => item instanceof File && item.size > 0,
  );
  const authUser = await getAuthenticatedAppUser();

  if (!authUser) {
    logger.warn("prelims.rejected", { reason: "unauthenticated" });
    return NextResponse.json({ message: "Sign in with Google to use Prelims practice." }, { status: 401 });
  }

  if (!getUsageMeta(authUser.profile).hasActivePlan) {
    logger.warn("prelims.rejected", {
      reason: "plan_required",
      userId: authUser.profile.id,
      action,
      subject,
    });
    return NextResponse.json(
      {
        message: "Prelims practice unlocks after payment. Choose a TamGam plan to continue.",
        usage: getUsageMeta(authUser.profile),
      },
      { status: 402 },
    );
  }

  if (!subject) {
    logger.warn("prelims.rejected", {
      reason: "missing_subject",
      userId: authUser.profile.id,
      action,
    });
    return NextResponse.json({ message: "Subject is required for prelims practice." }, { status: 400 });
  }

  if (!topic) {
    logger.warn("prelims.rejected", {
      reason: "missing_topic",
      userId: authUser.profile.id,
      action,
      subject,
    });
    return NextResponse.json(
      { message: "Enter a topic before generating a prelims test." },
      { status: 400 },
    );
  }

  const client = getOpenAIClient();
  const model = getConfiguredModel();
  const reasoning = getReasoningConfig(model);
  const textVerbosity = getTextVerbosity(model, "medium");
  const personalizationContext = await buildPersonalizationContext(authUser.profile.id, subject);
  let uploadsContext = "";

  try {
    const extractedStudyMaterials = await extractUploadFiles(studyMaterialFiles);
    uploadsContext = buildUploadsContextFromExtracted(extractedStudyMaterials, []);
    logger.info("prelims.request", {
      userId: authUser.profile.id,
      action,
      subject,
      topic,
      chapter,
      studyMaterialCount: extractedStudyMaterials.length,
    });
  } catch (error) {
    logger.warn(
      "prelims.upload_processing_failed",
      {
        userId: authUser.profile.id,
        action,
        subject,
      },
      error,
    );
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to process one of the uploaded files.",
      },
      { status: 400 },
    );
  }

  try {
    if (action === "generate") {
      const topicAnchor = chapter ? `${topic} | ${chapter}` : topic;
      const patternGuide = buildPrelimsPatternGuide(subject, topicAnchor);
      const response = await client.responses.create({
        model,
        ...(reasoning ? { reasoning } : {}),
        text: {
          verbosity: textVerbosity,
          format: {
            type: "json_object",
          },
        },
        instructions: `You are TamGam's dedicated prelims question setter.

Generate exactly 10 GS-style UPSC prelims MCQs for the chosen subject and topic. The set should feel close to recent UPSC prelims style: statement-based framing, conceptual precision, close distractors, and careful elimination.

Return exactly one valid json object and nothing else in this shape:
{
  "title": "string",
  "framingNote": "string",
  "patternNotes": ["string", "string"],
  "questions": [
    {
      "id": "Q1",
      "stem": "string",
      "options": {
        "A": "string",
        "B": "string",
        "C": "string",
        "D": "string"
      },
      "correctOption": "A",
      "explanation": "string",
      "trap": "string",
      "patternSignal": "string"
    }
  ]
}

Rules:
- Return exactly 10 questions.
- Only one option can be correct.
- Keep the stem exam-realistic, not coaching-handout style.
- Include explanations that help learning after the test.
- patternNotes should be short observations about the set's UPSC-style framing.`,
        input: [
          ...(personalizationContext
            ? [
                {
                  role: "user" as const,
                  content: personalizationContext,
                },
              ]
            : []),
          ...(uploadsContext
            ? [
                {
                  role: "user" as const,
                  content: `${uploadsContext}\n\nUse this uploaded study material as supporting context for framing the prelims set.`,
                },
              ]
            : []),
          {
            role: "user",
            content: `Return valid json only.
Subject: ${subject}
Topic: ${topic}
Chapter boundary: ${chapter || "Use the topic focus."}
${patternGuide}`,
          },
        ],
        max_output_tokens: 3200,
      });

      const answer = extractResponseText(response);

      if (!answer) {
        return NextResponse.json(
          { message: "The model did not return a prelims question set. Please try again." },
          { status: 502 },
        );
      }

      return NextResponse.json({
        quiz: parsePrelimsQuizDraft(answer),
        usage: getUsageMeta(authUser.profile),
      });
    }

    const quizRaw = asTrimmedString(formData.get("quiz"));
    const answersRaw = asTrimmedString(formData.get("answers"));

    if (!quizRaw) {
      return NextResponse.json({ message: "The prelims quiz payload is missing." }, { status: 400 });
    }

    if (!answersRaw) {
      return NextResponse.json({ message: "The prelims answers payload is missing." }, { status: 400 });
    }

    const quiz = parsePrelimsQuizDraft(JSON.stringify(parseJsonRecord(quizRaw)));
    const answersObject = parseJsonRecord(answersRaw);
    const answers = Object.fromEntries(
      Object.entries(answersObject).map(([key, value]) => [key, asTrimmedString(value)]),
    );
    const summary = buildPrelimsReviewSummary(quiz, answers);

    let feedback: PrelimsReviewDraft;

    try {
        feedback = await buildTeacherFeedback({
          client,
          model,
          reasoning,
          textVerbosity,
        quiz,
        subject,
          topic,
          chapter,
          summary,
          uploadsContext,
        });
    } catch {
      feedback = buildFallbackFeedback(summary);
    }

    await savePracticeReport({
      userId: authUser.profile.id,
      mode: "prelims",
      subject,
      topic,
      chapter,
      score: feedback.score,
      verdict: feedback.verdict,
      strengths: feedback.strengths,
      weaknesses: feedback.gaps,
    });

    return NextResponse.json({
      summary,
      feedback,
      usage: getUsageMeta(authUser.profile),
    });
  } catch (error) {
    logger.error("prelims.failed", error, {
      userId: authUser.profile.id,
      action,
      subject,
      topic,
    });
    if (error instanceof OpenAI.APIError) {
      if (error.code === "invalid_api_key" || error.status === 401) {
        return NextResponse.json(
          {
            message:
              "Your OpenAI API key is invalid. Put a valid key in apps/web/.env.local as OPENAI_API_KEY and restart the server.",
          },
          { status: 401 },
        );
      }

      return NextResponse.json(
        {
          message: error.message || "OpenAI request failed during prelims practice.",
        },
        { status: error.status || 500 },
      );
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unexpected server error while handling prelims practice.",
      },
      { status: 500 },
    );
  }
}
