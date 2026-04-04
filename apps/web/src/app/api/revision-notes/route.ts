import { NextResponse } from "next/server";
import OpenAI from "openai";
import { extractUploadFiles, getUploadFileSignature } from "@/lib/file-extract";
import { buildIgnouReferenceContext } from "@/lib/ignou-reference";
import { createRequestLogger } from "@/lib/logger";
import {
  getConfiguredModel,
  getOpenAIClient,
  getReasoningConfig,
  getTextVerbosity,
} from "@/lib/openai";
import { renderRevisionNoteHtml } from "@/lib/revision-note-template";
import {
  consumeFeatureTrial,
  consumeDayPassFeature,
  reserveDayPassStudyDocument,
} from "@/lib/app-db";
import {
  buildPersonalizationContext,
  getAuthenticatedAppUser,
  getUsageMeta,
} from "@/lib/product-access";
import {
  getRevisionSubjectLabel,
  type RevisionTrack,
} from "@/lib/upsc-syllabus";

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTrack(value: string): RevisionTrack {
  return value === "optional" ? "optional" : "gs";
}

function toFiles(items: FormDataEntryValue[]) {
  return items.filter((item): item is File => item instanceof File && item.size > 0);
}

function extractAnswerText(response: { output_text?: unknown; output?: unknown }) {
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

function getTagContent(text: string, tag: string) {
  const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`<${escapedTag}>([\\s\\S]*?)<\\/${escapedTag}>`, "i"));

  return match?.[1]?.trim() || "";
}

function toLineList(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
    .filter(Boolean);
}

function toAnswerLines(value: string) {
  const lines = toLineList(value);

  if (lines.length) {
    return lines;
  }

  return value
    .split(/(?<=[.?!])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildRevisionPayload(
  raw: string,
  trackLabel: string,
  subjectLabel: string,
  sourceNames: string[],
  topicHint: string,
) {
  const title = getTagContent(raw, "title") || "UPSC revision note";
  const strapline =
    getTagContent(raw, "strapline") || "Compressed from uploaded material into a quick-recall note.";
  const keywords = toLineList(getTagContent(raw, "keywords")).slice(0, 18);
  const mindMapNodes = toLineList(getTagContent(raw, "mind_map")).slice(0, 7);
  const onePageRevision = getTagContent(raw, "one_page_revision");
  const mainsQuestion = getTagContent(raw, "mains_question");
  const mainsAnswerLines = toAnswerLines(getTagContent(raw, "mains_answer")).slice(0, 8);

  if (!keywords.length || !mindMapNodes.length || !onePageRevision || !mainsQuestion || !mainsAnswerLines.length) {
    throw new Error("The notes response was incomplete. Please try again.");
  }

  return {
    title,
    strapline,
    trackLabel,
    subjectLabel,
    topicLabel: topicHint || title,
    sourceNames,
    keywords,
    mindMapNodes,
    onePageRevision,
    mainsQuestion,
    mainsAnswerLines,
  };
}

async function requestRevisionDraft(input: {
  client: OpenAI;
  model: string;
  reasoning: ReturnType<typeof getReasoningConfig>;
  textVerbosity: "low" | "medium" | "high";
  trackLabel: string;
  subjectLabel: string;
  topic: string;
  customization: string;
  personalizationContext: string;
  ignouReferenceContext: string;
  uploadedText: string;
}) {
  const {
    client,
    model,
    reasoning,
    textVerbosity,
    trackLabel,
    subjectLabel,
    topic,
    customization,
    personalizationContext,
    ignouReferenceContext,
    uploadedText,
  } = input;

  return client.responses.create({
    model,
    ...(reasoning ? { reasoning } : {}),
    text: {
      verbosity: textVerbosity,
    },
    instructions: `You are TamGam's dedicated 1-pager revision notes generator. Build concise, exam-ready revision sheets from the uploaded source only. The output will be rendered into a fixed HTML template, so your job is to provide strong content, not layout instructions.

Return exactly these tags and nothing else:
<title>...</title>
<strapline>...</strapline>
<keywords>
- ...
</keywords>
<mind_map>
- ...
</mind_map>
<one_page_revision>...</one_page_revision>
<mains_question>...</mains_question>
<mains_answer>
- ...
</mains_answer>

Rules:
- Ask yourself whether the content is for ${trackLabel} and stay aligned to ${subjectLabel}.
- Keep the title specific to the chapter or topic.
- Keywords: 10 to 18 short, high-value terms.
- Mind map: 5 to 7 short nodes in a logical flow.
- One-page revision: 3 tight paragraphs, crisp and revision-ready.
- One mains question: UPSC-style.
- Mains answer: 6 to 8 short bullet lines, ending with a punchy conclusion line.
- Keep the tone like a seasoned UPSC subject teacher.
- Do not mention missing information, template instructions, or XML tags outside the exact response format.`,
    input: [
      {
        role: "user" as const,
        content: `Track: ${trackLabel}\nSubject: ${subjectLabel}\nTopic hint: ${topic || "Infer from uploaded content"}\nCustomization: ${customization || "Keep it balanced and exam-oriented."}`,
      },
      ...(personalizationContext
        ? [
            {
              role: "user" as const,
              content: personalizationContext,
            },
          ]
        : []),
      ...(ignouReferenceContext
        ? [
            {
              role: "user" as const,
              content: ignouReferenceContext,
            },
          ]
        : []),
      {
        role: "user" as const,
        content: `Uploaded source material:\n\n${uploadedText}`,
      },
    ],
    max_output_tokens: 1400,
  });
}

async function repairRevisionDraft(input: {
  client: OpenAI;
  model: string;
  reasoning: ReturnType<typeof getReasoningConfig>;
  textVerbosity: "low" | "medium" | "high";
  rawDraft: string;
  subjectLabel: string;
  trackLabel: string;
}) {
  const { client, model, reasoning, textVerbosity, rawDraft, subjectLabel, trackLabel } = input;

  const response = await client.responses.create({
    model,
    ...(reasoning ? { reasoning } : {}),
    text: {
      verbosity: textVerbosity,
    },
    instructions: `Repair the draft below into TamGam's exact revision-note tag format. Return exactly these tags and nothing else:
<title>...</title>
<strapline>...</strapline>
<keywords>
- ...
</keywords>
<mind_map>
- ...
</mind_map>
<one_page_revision>...</one_page_revision>
<mains_question>...</mains_question>
<mains_answer>
- ...
</mains_answer>

Keep it aligned to ${trackLabel} and ${subjectLabel}.`,
    input: [
      {
        role: "user" as const,
        content: `Repair this draft into the exact required tags:\n\n${rawDraft}`,
      },
    ],
    max_output_tokens: 1400,
  });

  return extractAnswerText(response);
}

export async function POST(request: Request) {
  const logger = createRequestLogger("api/revision-notes", request);
  if (!process.env.OPENAI_API_KEY) {
    logger.error("revision-notes.rejected", undefined, { reason: "missing_openai_key" });
    return NextResponse.json(
      {
        message:
          "OPENAI_API_KEY is not configured. Add it to apps/web/.env.local and restart the dev server.",
      },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const track = normalizeTrack(asTrimmedString(formData.get("track")));
  const subject = asTrimmedString(formData.get("subject"));
  const optionalSubject = asTrimmedString(formData.get("optionalSubject"));
  const topic = asTrimmedString(formData.get("topic"));
  const customization = asTrimmedString(formData.get("customization"));
  const uploads = toFiles(formData.getAll("studyMaterial"));
  const authUser = await getAuthenticatedAppUser();

  if (!authUser) {
    logger.warn("revision-notes.rejected", { reason: "unauthenticated" });
    return NextResponse.json(
      { message: "Sign in with Google to generate revision notes." },
      { status: 401 },
    );
  }

  let usageProfile = authUser.profile;

  if (usageProfile.plan === "day" && uploads.length > 1) {
    logger.warn("revision-notes.rejected", {
      reason: "day_pass_multiple_uploads",
      userId: usageProfile.id,
      uploadCount: uploads.length,
    });
    return NextResponse.json(
      {
        message:
          "Daily Pass allows only 1 uploaded study document across the workspace. Remove extra files or upgrade for multiple uploads.",
        usage: getUsageMeta(usageProfile),
      },
      { status: 403 },
    );
  }

  if (usageProfile.plan === "day" && uploads.length === 1) {
    const uploadAccess = await reserveDayPassStudyDocument(
      usageProfile.id,
      getUploadFileSignature(uploads[0]),
    );

    usageProfile = uploadAccess.profile;

    if (!uploadAccess.ok) {
      logger.warn("revision-notes.rejected", {
        reason: "day_pass_study_document_limit",
        userId: usageProfile.id,
      });
      return NextResponse.json(
        {
          message: uploadAccess.message,
          usage: getUsageMeta(usageProfile),
        },
        { status: 403 },
      );
    }
  }

  if (usageProfile.plan === "day" && usageProfile.dayPassUsage.revisionNotesUsed >= 1) {
    logger.warn("revision-notes.rejected", {
      reason: "day_pass_limit_reached",
      userId: usageProfile.id,
    });
    return NextResponse.json(
      {
        message:
          "Daily Pass includes only 1 1-pager revision note. Upgrade for more note generations.",
        usage: getUsageMeta(usageProfile),
      },
      { status: 403 },
    );
  }

  if (!getUsageMeta(usageProfile).hasActivePlan && usageProfile.featureTrialUsage.revisionNotesUsed >= 1) {
    logger.warn("revision-notes.rejected", {
      reason: "free_note_trial_used",
      userId: usageProfile.id,
      email: usageProfile.email,
    });
    return NextResponse.json(
      {
        message: "You have already used the free 1-pager note. Choose a TamGam plan to continue.",
        usage: getUsageMeta(usageProfile),
      },
      { status: 402 },
    );
  }

  if (!uploads.length) {
    logger.warn("revision-notes.rejected", {
      reason: "missing_uploads",
      userId: authUser.profile.id,
    });
    return NextResponse.json(
      {
        message: "Upload a source document before generating 1-pager revision notes.",
      },
      { status: 400 },
    );
  }

  if (track === "gs" && !subject) {
    logger.warn("revision-notes.rejected", {
      reason: "missing_gs_subject",
      userId: authUser.profile.id,
    });
    return NextResponse.json({ message: "Choose a GS subject before generating notes." }, { status: 400 });
  }

  if (track === "optional" && !optionalSubject) {
    logger.warn("revision-notes.rejected", {
      reason: "missing_optional_subject",
      userId: authUser.profile.id,
    });
    return NextResponse.json(
      { message: "Choose or enter the optional subject before generating notes." },
      { status: 400 },
    );
  }

  const subjectLabel = getRevisionSubjectLabel(track, subject, optionalSubject);
  const trackLabel = track === "optional" ? "Optional" : "General Studies";

  let extractedUploads;

  try {
    extractedUploads = await extractUploadFiles(uploads);
  } catch (error) {
    logger.warn(
      "revision-notes.upload-extract-failed",
      {
        userId: authUser.profile.id,
        fileCount: uploads.length,
      },
      error,
    );
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to process the uploaded document.",
      },
      { status: 400 },
    );
  }

  let ignouReferenceContext = "";

  try {
    ignouReferenceContext = await buildIgnouReferenceContext(subjectLabel, topic || subjectLabel);
  } catch {
    ignouReferenceContext = "";
  }

  const sourceNames = extractedUploads.map((file) => file.name);
  const uploadedText = extractedUploads
    .map((file) => `Source file: ${file.name}\n${file.text}`)
    .join("\n\n");
  const client = getOpenAIClient();
  const model = getConfiguredModel();
  const reasoning = getReasoningConfig(model);
  const textVerbosity = getTextVerbosity(model, "medium");
  const personalizationContext = await buildPersonalizationContext(authUser.profile.id, subjectLabel);

  try {
    logger.info("revision-notes.started", {
      userId: usageProfile.id,
      email: usageProfile.email,
      track,
      subjectLabel,
      topic,
      fileCount: uploads.length,
      model,
    });

    const response = await requestRevisionDraft({
      client,
      model,
      reasoning,
      textVerbosity,
      trackLabel,
      subjectLabel,
      topic,
      customization,
      personalizationContext,
      ignouReferenceContext,
      uploadedText,
    });

    let answer = extractAnswerText(response);

    if (!answer) {
      logger.warn("revision-notes.empty-draft", {
        userId: usageProfile.id,
        subjectLabel,
        model,
      });
      return NextResponse.json(
        {
          message: "The model did not return a usable notes draft. Please try once more.",
        },
        { status: 502 },
      );
    }

    let document;

    try {
      document = buildRevisionPayload(answer, trackLabel, subjectLabel, sourceNames, topic);
    } catch (payloadError) {
      logger.warn(
        "revision-notes.repair-attempt",
        {
            userId: usageProfile.id,
            subjectLabel,
            model,
          },
        payloadError,
      );

      const repairedAnswer = await repairRevisionDraft({
        client,
        model,
        reasoning,
        textVerbosity,
        rawDraft: answer,
        subjectLabel,
        trackLabel,
      });

      if (!repairedAnswer) {
        throw payloadError;
      }

      answer = repairedAnswer;
      document = buildRevisionPayload(answer, trackLabel, subjectLabel, sourceNames, topic);
    }

    if (usageProfile.plan === "day") {
      const quota = await consumeDayPassFeature(usageProfile.id, "revision-notes");
      usageProfile = quota.profile;

      if (!quota.ok) {
        logger.warn("revision-notes.rejected", {
          reason: "day_pass_limit_reached",
          userId: usageProfile.id,
        });
        return NextResponse.json(
          {
            message: quota.message,
            usage: getUsageMeta(usageProfile),
          },
          { status: 403 },
        );
      }
    }

    if (!getUsageMeta(usageProfile).hasActivePlan) {
      const trial = await consumeFeatureTrial(usageProfile.id, "revision-notes");
      usageProfile = trial.profile;
    }

    const html = renderRevisionNoteHtml(document);

    logger.info("revision-notes.succeeded", {
      userId: usageProfile.id,
      subjectLabel,
      model,
      title: document.title,
    });

    return NextResponse.json({
      html,
      title: document.title,
      model,
      subjectLabel,
      trackLabel,
      usage: getUsageMeta(usageProfile),
    });
  } catch (error) {
    logger.error("revision-notes.failed", error, {
      userId: usageProfile.id,
      email: usageProfile.email,
      subjectLabel,
      track,
      model,
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
          message: error.message || "OpenAI request failed while building revision notes.",
        },
        { status: error.status || 502 },
      );
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unexpected server error while generating revision notes.",
      },
      { status: 502 },
    );
  }
}
