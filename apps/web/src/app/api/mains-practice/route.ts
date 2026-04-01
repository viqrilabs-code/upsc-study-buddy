import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  getMainsPyqPatternGuide,
  parseMainsEvaluationDraft,
  parseMainsQuestionDraft,
  toMainsAnswerInputParts,
} from "@/lib/mains-practice";
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

const MAX_ANSWER_FILES = 6;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

type MainsAction = "generate" | "evaluate";

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toFiles(items: FormDataEntryValue[]) {
  return items.filter((item): item is File => item instanceof File && item.size > 0);
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

function validateAnswerFiles(files: File[]) {
  if (!files.length) {
    throw new Error("Upload at least one handwritten answer page before evaluation.");
  }

  if (files.length > MAX_ANSWER_FILES) {
    throw new Error(`Upload up to ${MAX_ANSWER_FILES} files per answer attempt.`);
  }

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`${file.name} is too large. Keep answer uploads under 10 MB each.`);
    }
  }
}

export async function POST(request: Request) {
  const logger = createRequestLogger("api/mains-practice", request);
  if (!process.env.OPENAI_API_KEY) {
    logger.error("mains.misconfigured", undefined, { reason: "missing_openai_key" });
    return NextResponse.json(
      {
        message:
          "OPENAI_API_KEY is not configured. Add it to apps/web/.env.local and restart the dev server.",
      },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const action = (asTrimmedString(formData.get("action")) || "generate") as MainsAction;
  const subject = asTrimmedString(formData.get("subject"));
  const topic = asTrimmedString(formData.get("topic"));
  const chapter = asTrimmedString(formData.get("chapter"));
  const question = asTrimmedString(formData.get("question"));
  const studyMaterialFiles = toFiles(formData.getAll("studyMaterial"));
  const answerFiles = toFiles(formData.getAll("answerUpload"));
  const authUser = await getAuthenticatedAppUser();

  if (!authUser) {
    logger.warn("mains.rejected", { reason: "unauthenticated" });
    return NextResponse.json({ message: "Sign in with Google to use Mains practice." }, { status: 401 });
  }

  if (!getUsageMeta(authUser.profile).hasActivePlan) {
    logger.warn("mains.rejected", {
      reason: "plan_required",
      userId: authUser.profile.id,
      action,
      subject,
    });
    return NextResponse.json(
      {
        message: "Mains practice unlocks after payment. Choose a TamGam plan to continue.",
        usage: getUsageMeta(authUser.profile),
      },
      { status: 402 },
    );
  }

  if (!subject) {
    logger.warn("mains.rejected", {
      reason: "missing_subject",
      userId: authUser.profile.id,
      action,
    });
    return NextResponse.json({ message: "Subject is required for mains practice." }, { status: 400 });
  }

  if (!topic && action === "generate") {
    logger.warn("mains.rejected", {
      reason: "missing_topic",
      userId: authUser.profile.id,
      subject,
    });
    return NextResponse.json(
      { message: "Enter a topic or chapter before generating a mains question." },
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
    logger.info("mains.request", {
      userId: authUser.profile.id,
      action,
      subject,
      topic,
      chapter,
      studyMaterialCount: extractedStudyMaterials.length,
      answerUploadCount: answerFiles.length,
    });
  } catch (error) {
    logger.warn(
      "mains.upload_processing_failed",
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
      const patternGuide = getMainsPyqPatternGuide(subject, topic, chapter);
      const response = await client.responses.create({
        model,
        ...(reasoning ? { reasoning } : {}),
        text: {
          verbosity: textVerbosity,
        },
        instructions: `You are TamGam's dedicated mains question setter. Generate exactly one UPSC mains practice question anchored to the selected subject, topic, and chapter. Frame the question in the spirit of the last 10 years of UPSC mains PYQs for that area: analytical, directive-driven, and exam-realistic.

Return exactly these tags and nothing else:
<question>...</question>
<rationale>...</rationale>
<pyq_signals>
- ...
</pyq_signals>
<answer_approach>
- ...
</answer_approach>
<keywords>
- ...
</keywords>

Rules:
- Make the question answerable in roughly 150 to 250 words.
- Do not claim that you are quoting an exact PYQ unless it is clearly warranted.
- Keep the rationale short and exam-focused.
- Pyq signals should explain why this question matches recent UPSC framing.
- Answer approach should give a tight answer skeleton, not a full answer.
- Keywords should be short, high-yield terms the student should use.`,
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
                  content: `${uploadsContext}\n\nUse this uploaded study material as supporting context for framing the mains question.`,
                },
              ]
            : []),
          {
            role: "user",
            content: `Subject: ${subject}\nTopic: ${topic}\nChapter: ${chapter || "Use the topic as the chapter anchor."}\n${patternGuide}`,
          },
        ],
        max_output_tokens: 900,
      });

      const answer = extractResponseText(response);

      if (!answer) {
        return NextResponse.json(
          {
            message: "The model did not return a mains question draft. Please try again.",
          },
          { status: 502 },
        );
      }

      return NextResponse.json({
        draft: parseMainsQuestionDraft(answer),
        usage: getUsageMeta(authUser.profile),
      });
    }

    if (!question) {
      return NextResponse.json(
        { message: "Generate or provide a mains question before evaluating the answer." },
        { status: 400 },
      );
    }

    validateAnswerFiles(answerFiles);

    const answerInputParts = await toMainsAnswerInputParts(answerFiles);
    const response = await client.responses.create({
      model,
      ...(reasoning ? { reasoning } : {}),
      text: {
        verbosity: textVerbosity,
      },
      instructions: `You are TamGam's dedicated mains evaluator. Read the uploaded handwritten answer carefully, transcribe it faithfully, and then evaluate it strictly using UPSC mains standards from the last 10 years.

Return exactly these tags and nothing else:
<transcription>...</transcription>
<verdict>...</verdict>
<score>...</score>
<strengths>
- ...
</strengths>
<gaps>
- ...
</gaps>
<upgrades>
- ...
</upgrades>
<improved_direction>...</improved_direction>
<next_step>...</next_step>

Rules:
- Be strict, specific, and constructive.
- Score format must be like: 5.5/10 or 9/15.
- In the transcription, reconstruct the answer cleanly. If a word is unclear, infer conservatively.
- Strengths: what the student did well.
- Gaps: what cost marks.
- Upgrades: concrete changes for the next attempt.
- Improved direction: 1 short paragraph describing how the answer should have been structured.
- Next step: one clear practice task for the student.`,
      input: [
        ...(uploadsContext
          ? [
              {
                role: "user" as const,
                content: `${uploadsContext}\n\nUse this uploaded study material as supporting context while evaluating the answer, but do not assume the student had to reproduce every uploaded line.`,
              },
            ]
          : []),
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Subject: ${subject}\nTopic: ${topic || "Derived from the question"}\nChapter: ${chapter || "Derived from the question"}\nQuestion: ${question}\nTask: Transcribe the handwritten answer and evaluate it in detail.`,
            },
            ...answerInputParts,
          ],
        },
      ],
      max_output_tokens: 1800,
    });

    const answer = extractResponseText(response);

    if (!answer) {
      return NextResponse.json(
        {
          message: "The model did not return a usable handwritten evaluation. Please try again.",
        },
        { status: 502 },
      );
    }

    const draft = parseMainsEvaluationDraft(answer);

    await savePracticeReport({
      userId: authUser.profile.id,
      mode: "mains",
      subject,
      topic,
      chapter,
      score: draft.score,
      verdict: draft.verdict,
      strengths: draft.strengths,
      weaknesses: draft.gaps,
    });

    return NextResponse.json({
      draft,
      usage: getUsageMeta(authUser.profile),
    });
  } catch (error) {
    logger.error("mains.failed", error, {
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
          message: error.message || "OpenAI request failed during mains practice.",
        },
        { status: error.status || 500 },
      );
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unexpected server error while handling mains practice.",
      },
      { status: 500 },
    );
  }
}
