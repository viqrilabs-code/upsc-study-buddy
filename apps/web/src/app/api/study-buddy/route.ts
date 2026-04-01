import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  buildAdminCurrentAffairsContext,
  buildUserNewspaperContext,
  getLatestAdminCurrentAffairsPack,
} from "@/lib/current-affairs-pack";
import {
  buildUploadsContextFromExtracted,
  type ExtractedUpload,
  extractUploadFiles,
} from "@/lib/file-extract";
import { buildIgnouReferenceContext } from "@/lib/ignou-reference";
import { createRequestLogger } from "@/lib/logger";
import {
  getConfiguredModel,
  getOpenAIClient,
  getReasoningConfig,
  getTextVerbosity,
} from "@/lib/openai";
import {
  buildPersonalizationContext,
  consumeTurnIfNeeded,
  getAuthenticatedAppUser,
  getUsageMeta,
} from "@/lib/product-access";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  role?: unknown;
  content?: unknown;
};

type StudyBuddyPayload = {
  subject?: unknown;
  goal?: unknown;
  mode?: unknown;
  messages?: unknown;
};

const comprehensiveRequestPhrases = [
  "full notes",
  "complete notes",
  "detailed notes",
  "comprehensive notes",
  "full lesson",
  "complete lesson",
  "detailed explanation",
  "comprehensive explanation",
  "all about",
  "cover fully",
  "explain in detail",
  "explain everything",
  "complete topic",
  "full topic",
  "entire topic",
  "all articles",
];

const noteMakingPhrases = [
  "make notes",
  "create notes",
  "generate notes",
  "revision notes",
  "1 pager",
  "one pager",
  "mind map",
  "summary notes",
  "crisp notes",
];

const broadCurrentAffairsPhrases = [
  "today's editorial",
  "todays editorial",
  "aaj ka editorial",
  "aaj ki editorial",
  "editorial kya hai",
  "today editorial",
  "what is today's editorial about",
  "what is todays editorial about",
  "aaj ka news analysis",
  "aaj ki news",
  "what is today's news",
];

const practiceQuestionPhrases = [
  "ask a question",
  "give me a question",
  "give a question",
  "ask me a question",
  "test me",
  "quiz me",
  "mcq",
  "practice question",
  "question",
  "sawal",
  "sawaal",
  "prashn",
];

const discussionCompletePhrases = [
  "done",
  "finished",
  "i am done",
  "that's clear",
  "thats clear",
  "understood",
  "samajh aa gaya",
  "samajh aa gaya hai",
  "samajh gaya",
  "samajh gayi",
  "theek hai",
  "thik hai",
  "clear",
  "next",
  "move on",
  "aage badho",
  "aage badhein",
];

const mcqAnswerPattern =
  /^\s*(?:option\s*)?(?:[a-dA-D]|[1-4])(?:[\).\s:-].*)?$/;

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeMessages(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const message = item as ChatMessage;
      const role = message.role === "assistant" ? "assistant" : "user";
      const content = asTrimmedString(message.content);

      return content
        ? {
            role: role as ChatRole,
            content,
          }
        : null;
    })
    .filter((item): item is { role: ChatRole; content: string } => Boolean(item));
}

function getModeInstruction(mode: string) {
  switch (mode) {
    case "mains":
      return "Focus on mains answer writing, structure, keywords, subheadings, and probable UPSC angle.";
    case "prelims":
      return "Focus on concept clarity, elimination logic, traps, and concise MCQ-oriented explanations.";
    case "current-affairs":
      return "Focus on current affairs summaries, GS paper mapping, keywords, background context, and probable prelims or mains angles.";
    case "revision":
      return "Focus on revision sheets, memory cues, high-yield bullets, and what to revise next.";
    default:
      return "Focus on study support, explanation, note-making, and practical UPSC guidance.";
  }
}

function getLastUserMessage(messages: { role: ChatRole; content: string }[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message?.role === "user" && message.content) {
      return message.content;
    }
  }

  return "";
}

function getUserTurnCount(messages: { role: ChatRole; content: string }[]) {
  return messages.filter((message) => message.role === "user").length;
}

function wantsComprehensiveAnswer(message: string) {
  const normalized = message.toLowerCase();

  return comprehensiveRequestPhrases.some((phrase) => normalized.includes(phrase));
}

function wantsNotesInsteadOfStudy(message: string) {
  const normalized = message.toLowerCase();

  return noteMakingPhrases.some((phrase) => normalized.includes(phrase));
}

function isBroadCurrentAffairsTopicRequest(message: string) {
  const normalized = message.toLowerCase();

  return broadCurrentAffairsPhrases.some((phrase) => normalized.includes(phrase));
}

function asksForPracticeQuestion(message: string) {
  const normalized = message.toLowerCase();

  return practiceQuestionPhrases.some((phrase) => normalized.includes(phrase));
}

function seemsDiscussionComplete(message: string) {
  const normalized = message.toLowerCase();

  return discussionCompletePhrases.some((phrase) => normalized.includes(phrase));
}

function looksLikeMcqAnswer(message: string) {
  const trimmed = message.trim();

  if (!trimmed) {
    return false;
  }

  return mcqAnswerPattern.test(trimmed);
}

function buildCurrentAffairsSourceContext(
  adminPackContext: string,
  userNewspaperContext: string,
) {
  const sections = [adminPackContext, userNewspaperContext].filter(Boolean);

  if (!sections.length) {
    return "";
  }

  return [
    "Current affairs source pack for this session:",
    "Use these curated sources as the primary source of truth for current-affairs answers.",
    "Only use the UPSC-relevant issue sections from the newspapers and discard sports, entertainment, lifestyle, or other non-exam material.",
    "If both the admin daily pack and a user newspaper are present, synthesize both before answering.",
    "",
    ...sections,
  ].join("\n\n");
}

function getBuddyInstruction(
  mode: string,
  detailedMode: boolean,
  hasCurrentAffairsSourcePack: boolean,
  isOpeningTurn: boolean,
  isBroadCurrentAffairsRequest: boolean,
  wantsPracticeQuestionNow: boolean,
  seemsDiscussionCompleteNow: boolean,
  isLikelyMcqAnswer: boolean,
) {
  const sharedInteractiveInstruction = [
    "Act like a seasoned UPSC subject teacher who is also a patient study buddy.",
    "Default to dialogue, not monologue.",
    "Do not dump an entire chapter in one reply unless the user explicitly asks for full notes, a complete lesson, or a comprehensive explanation.",
    "Keep replies short, warm, and conversational.",
    "Sound calm, confident, natural, and exam-savvy.",
    "Avoid robotic templates, repetitive labels, and monotonous phrasing.",
    "Prefer clean plain text and short labels over markdown symbols like ###, **, or ---.",
    "Always reply in the same language as the user's latest message unless the user asks you to switch.",
    "Use natural teacher-like transitions such as 'Good start', 'Let's sharpen that', 'Notice the nuance here', or 'Now take it one level deeper' when appropriate.",
    "Prefer flowing prose with short bullets only when they truly improve clarity.",
    "Use simple checkpoints, memory hooks, and mini-recall prompts so the user studies with you step by step.",
  ];

  if (detailedMode) {
    sharedInteractiveInstruction.push(
      "The user explicitly asked for detail, so you may give a longer structured answer, but still keep it readable and exam-focused.",
    );
  }

  switch (mode) {
    case "mains":
      return [
        ...sharedInteractiveInstruction,
        "In mains mode, give a short answer framework, 2-3 high-value points, and then ask the user to attempt or choose the next angle.",
      ].join(" ");
    case "prelims":
      return [
        ...sharedInteractiveInstruction,
        "In prelims mode, explain only one concept chunk, add one elimination tip or common trap, and end with one mini-check question.",
      ].join(" ");
    case "current-affairs":
      return [
        ...sharedInteractiveInstruction,
        "In current-affairs mode, speak like a friendly teacher guiding one student.",
        "Never mention internal source packs, uploads, admin files, or document mechanics unless the user explicitly asks where the answer came from.",
        "Do not say things like 'you uploaded', 'the admin pack says', or 'I checked the newspaper pack'. Just teach naturally.",
        "Current-affairs teaching must happen in stages, not in one wrapped answer.",
        "If the user begins with a broad editorial or current-affairs request, first greet briefly and then offer 3 or 4 UPSC-relevant topic angles from that editorial as a shortlist.",
        "For that shortlist turn, give only topic names with one short clue each and ask the user which one to take first. Do not explain the topic yet. Do not ask a practice question yet.",
        "Once the user selects a topic, then begin with a clean plain-text structure using the labels Heading, Subheading, Crux, and Discussion.",
        "Under Crux, give a very short exam-focused setup in 2 to 4 sentences only.",
        "Under Discussion, respond to the selected angle and then ask one thoughtful follow-up question in teacher-student style.",
        "Do not give an MCQ or practice question immediately after the topic-selection turn.",
        "Go progressively deeper only after the user continues the discussion.",
        "When the discussion appears complete, first ask the user if they would like to attempt one question on the topic.",
        "Only if the user clearly says yes or explicitly asks for a question should you give the question in the next turn.",
        "The question can be an MCQ or a short mains-style question depending on the topic and what the user seems to need.",
        "Avoid long bullets, long list dumps, or complete editorial summaries in one go.",
        isBroadCurrentAffairsRequest
          ? "The latest user message is a broad editorial/current-affairs opener, so only do greeting + shortlist + confirmation question."
          : "",
        wantsPracticeQuestionNow
          ? "The latest user message asks for a practice question, so give exactly one UPSC-style MCQ now on the current discussed topic. Use the label MCQ check and include four options A to D. End by asking the user to answer with the option letter."
          : "",
        seemsDiscussionCompleteNow && !wantsPracticeQuestionNow
          ? "The latest user message suggests the discussion may be complete, so ask whether the user wants one question on this topic next."
          : "",
        isLikelyMcqAnswer
          ? "The latest user message looks like an answer to a previously asked MCQ. Do not ask the user to choose a topic again. Evaluate the answer and respond using the labels Feedback, Correct answer, Why this is correct, Trap to avoid, and Next step. Keep each section short. In Next step ask whether the user wants another MCQ or wants to return to the discussion."
          : "",
        isOpeningTurn && !isBroadCurrentAffairsRequest
          ? "This is an opening turn on a chosen topic, so begin with Heading, Subheading, Crux, and a gentle discussion prompt."
          : "This is a follow-up turn, so build on the last discussion step and move one layer deeper without wrapping up the whole topic.",
        hasCurrentAffairsSourcePack
          ? "Use the available current-affairs source material to extract only UPSC-relevant issues and discard sports, lifestyle, entertainment, market gossip, and other non-exam sections."
          : "Even without explicit source material, keep the flow article-wise and exam-oriented.",
        "If the user explicitly asks for a full daily class, you may cover up to three high-value articles, but still present them as selectable topic angles first.",
      ].filter(Boolean).join(" ");
    case "revision":
      return [
        ...sharedInteractiveInstruction,
        "In revision mode, return a very tight recap with keywords and finish with one recall question.",
      ].join(" ");
    default:
      return [
        ...sharedInteractiveInstruction,
        "In study mode, run the lesson in guided Q&A format with a friendly tone.",
        "Ask only one question at a time and start from the basics before moving to deeper or trickier ideas.",
        "When the user starts a topic, do not explain the whole lesson. Briefly set the topic and ask Question 1 only.",
        "After the user answers, evaluate it gently: say whether it is correct, partly correct, or needs correction; then give the correct answer in 2-4 short bullets; then ask the next question at a slightly higher level.",
        "If the user says 'I don't know' or gives a weak answer, teach briefly and then ask an easier or same-level follow-up question.",
        "Do not give article-by-article dumps or long notes in study mode unless the user explicitly asks for full notes.",
        "Every study-mode reply should end with the next question.",
        "Avoid mechanical tags like 'Question 1 (Basics)' unless the user specifically wants a quiz style. Ask the next question in a natural classroom tone.",
        "For UI rendering, every study-mode reply must use exactly these two sections in this order: <lesson_feedback>...</lesson_feedback> followed by <next_question>...</next_question>.",
        "Put the explanation, correction, or short setup in <lesson_feedback>.",
        "Put only the next question, and at most one brief hint line, inside <next_question>.",
        "Do not add any extra text before, between, or after these two sections.",
        "Do not mention the XML-style tags in normal prose outside those sections.",
      ].join(" ");
  }
}

function getVerbosity(mode: string, detailedMode: boolean) {
  if (detailedMode && (mode === "mains" || mode === "revision")) {
    return "medium" as const;
  }

  return "low" as const;
}

function getMaxOutputTokens(mode: string, detailedMode: boolean) {
  if (detailedMode) {
    switch (mode) {
      case "mains":
        return 1200;
      case "revision":
        return 900;
      default:
        return 700;
    }
  }

  switch (mode) {
    case "mains":
      return 520;
    case "prelims":
      return 420;
    case "current-affairs":
      return 520;
    case "revision":
      return 360;
    default:
      return 360;
  }
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

      if (entry.type === "refusal" && "refusal" in entry) {
        const value = asTrimmedString(entry.refusal);

        if (value) {
          parts.push(value);
        }
      }
    }
  }

  return parts.join("\n\n").trim();
}

function parseMessages(rawMessages: unknown) {
  if (typeof rawMessages === "string") {
    try {
      return normalizeMessages(JSON.parse(rawMessages));
    } catch {
      return [];
    }
  }

  return normalizeMessages(rawMessages);
}

function toFiles(items: FormDataEntryValue[]) {
  return items.filter((item): item is File => item instanceof File && item.size > 0);
}

async function parseRequest(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();

    return {
      subject: asTrimmedString(formData.get("subject")),
      goal: asTrimmedString(formData.get("goal")),
      mode: asTrimmedString(formData.get("mode")) || "study",
      messages: parseMessages(formData.get("messages")),
      studyMaterialFiles: toFiles(formData.getAll("studyMaterial")),
      newspaperFiles: toFiles(formData.getAll("newspaper")),
    };
  }

  const payload = (await request.json()) as StudyBuddyPayload;

  return {
    subject: asTrimmedString(payload.subject),
    goal: asTrimmedString(payload.goal),
    mode: asTrimmedString(payload.mode) || "study",
    messages: parseMessages(payload.messages),
    studyMaterialFiles: [] as File[],
    newspaperFiles: [] as File[],
  };
}

export async function POST(request: Request) {
  const logger = createRequestLogger("api/study-buddy", request);
  if (!process.env.OPENAI_API_KEY) {
    logger.error("study_buddy.misconfigured", undefined, { reason: "missing_openai_key" });
    return NextResponse.json(
      {
        message:
          "OPENAI_API_KEY is not configured. Add it to apps/web/.env.local and restart the dev server.",
      },
      { status: 500 },
    );
  }

  const { subject, goal, mode, messages, studyMaterialFiles, newspaperFiles } =
    await parseRequest(request);

  const authUser = await getAuthenticatedAppUser();

  if (!authUser) {
    logger.warn("study_buddy.rejected", { reason: "unauthenticated", mode, subject });
    return NextResponse.json({ message: "Sign in with Google to use TamGam." }, { status: 401 });
  }

  if (!subject) {
    logger.warn("study_buddy.rejected", {
      reason: "missing_subject",
      userId: authUser.profile.id,
      mode,
    });
    return NextResponse.json({ message: "Subject is required." }, { status: 400 });
  }

  if (!messages.length) {
    logger.warn("study_buddy.rejected", {
      reason: "missing_messages",
      userId: authUser.profile.id,
      mode,
      subject,
    });
    return NextResponse.json({ message: "Please enter a message." }, { status: 400 });
  }

  const lastUserMessage = getLastUserMessage(messages);
  let uploadsContext = "";
  let currentAffairsSourceContext = "";
  let ignouReferenceContext = "";
  let extractedStudyMaterials: ExtractedUpload[] = [];
  let extractedNewspapers: ExtractedUpload[] = [];
  let adminCurrentAffairsPackContext = "";
  let usageProfile = authUser.profile;

  if (mode === "study" && wantsNotesInsteadOfStudy(lastUserMessage)) {
    logger.info("study_buddy.notes_redirected", {
      userId: authUser.profile.id,
      subject,
    });
    return NextResponse.json({
      answer:
        "Use the 1-pager revision notes section for note-making. Choose GS or Optional there, upload the source content, and I will turn it into keywords, a mind map, a crisp one-page revision sheet, and one mains question with answer.",
      model: "notes-guard",
      usage: getUsageMeta(usageProfile),
    });
  }

  if (mode !== "current-affairs") {
    const access = await consumeTurnIfNeeded(authUser.profile);

    if (access.blocked) {
      logger.warn("study_buddy.rejected", {
        reason: "free_turns_exhausted",
        userId: authUser.profile.id,
        mode,
        subject,
      });
      return NextResponse.json(
        {
          message:
            "Your 3 free turns are over. Choose a TamGam plan to continue with guided study, Mains, Prelims, and notes.",
          usage: getUsageMeta(access.profile),
        },
        { status: 402 },
      );
    }

    usageProfile = access.profile;
  }

  try {
    extractedStudyMaterials = await extractUploadFiles(studyMaterialFiles);
    extractedNewspapers = await extractUploadFiles(newspaperFiles);
    logger.info("study_buddy.request", {
      userId: authUser.profile.id,
      mode,
      subject,
      messagesCount: messages.length,
      studyMaterialCount: extractedStudyMaterials.length,
      newspaperCount: extractedNewspapers.length,
    });
  } catch (error) {
    logger.warn(
      "study_buddy.upload_processing_failed",
      {
        userId: authUser.profile.id,
        mode,
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

  if (mode === "current-affairs") {
    const adminPack = await getLatestAdminCurrentAffairsPack();
    adminCurrentAffairsPackContext = buildAdminCurrentAffairsContext(adminPack);
  }

  currentAffairsSourceContext = buildCurrentAffairsSourceContext(
    adminCurrentAffairsPackContext,
    buildUserNewspaperContext(extractedNewspapers),
  );
  const studyMaterialContext = buildUploadsContextFromExtracted(extractedStudyMaterials, []);
  uploadsContext =
    mode === "current-affairs"
      ? [studyMaterialContext, currentAffairsSourceContext].filter(Boolean).join("\n\n")
      : buildUploadsContextFromExtracted(extractedStudyMaterials, extractedNewspapers);

  try {
    ignouReferenceContext = await buildIgnouReferenceContext(subject, lastUserMessage);
  } catch {
    ignouReferenceContext = "";
  }

  const client = getOpenAIClient();
  const model = getConfiguredModel();
  const reasoning = getReasoningConfig(model);
  const detailedMode = wantsComprehensiveAnswer(lastUserMessage);
  const isBroadCurrentAffairsRequest =
    mode === "current-affairs" && isBroadCurrentAffairsTopicRequest(lastUserMessage);
  const wantsPracticeQuestionNow =
    mode === "current-affairs" && asksForPracticeQuestion(lastUserMessage);
  const seemsDiscussionCompleteNow =
    mode === "current-affairs" && seemsDiscussionComplete(lastUserMessage);
  const isLikelyMcqAnswer = mode === "current-affairs" && looksLikeMcqAnswer(lastUserMessage);
  const answerVerbosity = getTextVerbosity(model, getVerbosity(mode, detailedMode));
  const maxOutputTokens = getMaxOutputTokens(mode, detailedMode);
  const userTurnCount = getUserTurnCount(messages);
  const buddyInstruction = getBuddyInstruction(
    mode,
    detailedMode,
    Boolean(currentAffairsSourceContext),
    userTurnCount <= 1,
    isBroadCurrentAffairsRequest,
    wantsPracticeQuestionNow,
    seemsDiscussionCompleteNow,
    isLikelyMcqAnswer,
  );
  const personalizationContext = await buildPersonalizationContext(authUser.profile.id, subject);

  const inputMessages = [
    ...(personalizationContext
      ? [
          {
            role: "user" as const,
            content: personalizationContext,
          },
        ]
      : []),
    ...([ignouReferenceContext, uploadsContext]
      .filter(Boolean)
      .map((content) => ({
        role: "user" as const,
        content,
      }))),
    ...messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];

  try {
    const response = await client.responses.create({
      model,
      ...(reasoning ? { reasoning } : {}),
      text: {
        verbosity: answerVerbosity,
      },
      instructions:
        `You are TamGam, a concise and serious UPSC study companion. Subject: ${subject}. Goal: ${
          goal || "General UPSC study support"
        }. ${getModeInstruction(mode)} ${buddyInstruction} Keep answers practical and exam-oriented. Prefer short sections. Unless the user explicitly asks for depth, stay concise and avoid over-explaining. Include keywords, likely PYQ links, and next revision steps when helpful.`,
      input: inputMessages,
      max_output_tokens: maxOutputTokens,
    });

    const answer = extractAnswerText(response);

    if (!answer) {
      return NextResponse.json(
        {
          message:
            "The model did not return visible text for this turn. Please try again with a shorter prompt.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      answer,
      model,
      usage: getUsageMeta(usageProfile),
    });
  } catch (error) {
    logger.error("study_buddy.openai_failed", error, {
      userId: authUser.profile.id,
      mode,
      subject,
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
          message: error.message || "OpenAI request failed.",
        },
        { status: error.status || 500 },
      );
    }

    return NextResponse.json(
      {
        message: "Unexpected server error while contacting OpenAI.",
      },
      { status: 500 },
    );
  }
}
