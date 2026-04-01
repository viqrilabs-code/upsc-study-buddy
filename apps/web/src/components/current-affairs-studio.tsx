"use client";

import { startTransition, useMemo, useRef, useState } from "react";
import {
  FileText,
  LoaderCircle,
  MessageCircleMore,
  Newspaper,
  SendHorizontal,
} from "lucide-react";
import { useGlobalStudyMaterial } from "@/components/global-study-material-provider";
import { SessionFeedbackCard } from "@/components/session-feedback-card";
import { subjectOptions } from "@/lib/site";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type StructuredSection = {
  label: string;
  value: string;
};

type UsageMeta = {
  plan: string;
  hasActivePlan: boolean;
  freeTurnsUsed: number;
  remainingFreeTurns: number;
};

const currentAffairsPrompts = [
  "Start today's current affairs class from today's editorial and the key national issues.",
  "Teach me the 3 most UPSC-relevant articles from today's sources and ask one MCQ after each.",
  "Use the uploaded sources and begin with the best GS2 or GS3 issue first.",
  "Take one article at a time, explain it like a teacher, and test me with MCQs.",
];

const initialMessages: ChatMessage[] = [
  {
    role: "assistant",
    content:
      "I am Diya. Ask me about today's editorial or any major issue, and I will teach it step by step in a friendly classroom style with one MCQ after each discussion.",
  },
];

const focusOptions = ["General Studies", ...subjectOptions];

const sectionStyles: Record<string, string> = {
  heading:
    "border-[#151311]/12 bg-[linear-gradient(180deg,rgba(244,240,234,0.98),rgba(255,250,245,0.95))] text-[#1f1b18]",
  subheading:
    "border-[#f07b17]/18 bg-[linear-gradient(180deg,rgba(255,243,228,0.98),rgba(255,250,242,0.94))] text-[#5a3714]",
  crux:
    "border-[#1f5c49]/16 bg-[linear-gradient(180deg,rgba(235,247,242,0.98),rgba(245,252,248,0.94))] text-[#20483d]",
  context:
    "border-[#1f5c49]/16 bg-[linear-gradient(180deg,rgba(235,247,242,0.98),rgba(245,252,248,0.94))] text-[#20483d]",
  discussion:
    "border-[#223a66]/14 bg-[linear-gradient(180deg,rgba(235,241,252,0.98),rgba(244,247,255,0.94))] text-[#243657]",
  question:
    "border-[#223a66]/14 bg-[linear-gradient(180deg,rgba(235,241,252,0.98),rgba(244,247,255,0.94))] text-[#243657]",
  "mcq check":
    "border-[#c97b17]/18 bg-[linear-gradient(180deg,rgba(255,246,225,0.98),rgba(255,251,241,0.94))] text-[#6a4513]",
  mcq:
    "border-[#c97b17]/18 bg-[linear-gradient(180deg,rgba(255,246,225,0.98),rgba(255,251,241,0.94))] text-[#6a4513]",
  shortlist:
    "border-[#7e5f19]/16 bg-[linear-gradient(180deg,rgba(247,241,222,0.98),rgba(252,249,239,0.94))] text-[#5e4b18]",
  "next step":
    "border-[#6f4d15]/16 bg-[linear-gradient(180deg,rgba(250,239,220,0.98),rgba(255,249,240,0.94))] text-[#5e4215]",
  feedback:
    "border-[#1d5c3a]/16 bg-[linear-gradient(180deg,rgba(232,247,237,0.98),rgba(242,252,246,0.94))] text-[#1f4d35]",
  "correct answer":
    "border-[#1a5c49]/16 bg-[linear-gradient(180deg,rgba(234,248,242,0.98),rgba(244,252,248,0.94))] text-[#1f4d42]",
  "why this is correct":
    "border-[#23456c]/14 bg-[linear-gradient(180deg,rgba(236,242,252,0.98),rgba(246,248,255,0.94))] text-[#27405f]",
  "trap to avoid":
    "border-[#a65822]/16 bg-[linear-gradient(180deg,rgba(255,239,230,0.98),rgba(255,248,243,0.94))] text-[#6d3b1e]",
};

function normalizeSectionKey(label: string) {
  return label.trim().toLowerCase();
}

function parseStructuredSections(content: string) {
  const pattern =
    /(Heading|Subheading|Crux|Context|Discussion|Question|MCQ check|MCQ|Shortlist|Next step|Feedback|Correct answer|Why this is correct|Trap to avoid)\s*:\s*/gi;
  const matches = [...content.matchAll(pattern)];

  if (!matches.length) {
    return null;
  }

  const sections: StructuredSection[] = [];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const label = match[1]?.trim() || "";
    const start = (match.index || 0) + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index || content.length : content.length;
    const value = content.slice(start, end).trim();

    if (label && value) {
      sections.push({ label, value });
    }
  }

  return sections.length ? sections : null;
}

function DiyaReplyBody({ content }: { content: string }) {
  const sections = parseStructuredSections(content);

  if (!sections) {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  return (
    <div className="grid gap-3">
      {sections.map((section) => {
        const key = normalizeSectionKey(section.label);
        const style = sectionStyles[key] || "border-border-subtle bg-white/90 text-copy";

        return (
          <section
            key={`${section.label}-${section.value.slice(0, 24)}`}
            className={`rounded-[1.35rem] border px-4 py-4 ${style}`}
          >
            <div className="mb-2 font-mono text-[0.68rem] uppercase tracking-[0.22em] opacity-75">
              {section.label}
            </div>
            <div className="whitespace-pre-wrap leading-7">{section.value}</div>
          </section>
        );
      })}
    </div>
  );
}

export function CurrentAffairsStudio({
  subject: controlledSubject,
  onSubjectChange,
  embedded = false,
}: {
  subject?: string;
  onSubjectChange?: (value: string) => void;
  embedded?: boolean;
}) {
  const [internalSubject, setInternalSubject] = useState(controlledSubject || "General Studies");
  const subject = controlledSubject ?? internalSubject;
  const setSubject = onSubjectChange ?? setInternalSubject;
  const [goal, setGoal] = useState("Teacher-student current affairs class with article-wise MCQs");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [model, setModel] = useState("");
  const [usage, setUsage] = useState<UsageMeta | null>(null);
  const [newspaperFiles, setNewspaperFiles] = useState<File[]>([]);
  const [sessionKey, setSessionKey] = useState(() => `current-affairs-${crypto.randomUUID()}`);
  const [showFeedbackPrompt, setShowFeedbackPrompt] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const { files: globalStudyMaterialFiles } = useGlobalStudyMaterial();
  const uploadSummary = useMemo(() => {
    return newspaperFiles.map((file) => `Your newspaper: ${file.name}`);
  }, [newspaperFiles]);
  const globalMaterialSummary = useMemo(() => {
    return globalStudyMaterialFiles.map((file) => file.name);
  }, [globalStudyMaterialFiles]);

  function setNewspaperList(fileList: FileList | null) {
    setNewspaperFiles(fileList ? Array.from(fileList).slice(0, 2) : []);
  }
  function resetSession() {
    setMessages(initialMessages);
    setInput("");
    setError("");
    setModel("");
    setShowFeedbackPrompt(false);
    setNewspaperFiles([]);
    setSessionKey(`current-affairs-${crypto.randomUUID()}`);
  }

  function focusComposer() {
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function sendMessage(prompt: string) {
    const trimmed = prompt.trim();

    if (!trimmed || pending) {
      return;
    }

    const nextMessages: ChatMessage[] = [
      ...messages,
      {
        role: "user",
        content: trimmed,
      },
    ];
    const apiMessages = nextMessages.filter(
      (message, index) =>
        !(index === 0 && message.role === "assistant" && message.content === initialMessages[0].content),
    );

    setInput("");
    setPending(true);
    setError("");
    setMessages(nextMessages);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("subject", subject);
        formData.set("goal", goal);
        formData.set("mode", "current-affairs");
        formData.set("messages", JSON.stringify(apiMessages));

        newspaperFiles.forEach((file) => {
          formData.append("newspaper", file);
        });
        globalStudyMaterialFiles.forEach((file) => {
          formData.append("studyMaterial", file);
        });

        const response = await fetch("/api/study-buddy", {
          method: "POST",
          body: formData,
        });

        const data = (await response.json()) as {
          answer?: string;
          message?: string;
          model?: string;
          usage?: UsageMeta;
        };

        if (!response.ok) {
          if (data.usage) {
            setUsage(data.usage);
          }

          throw new Error(data.message || "Unable to get a current affairs response right now.");
        }

        setUsage(data.usage || null);
        setModel(data.model || "");
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content: data.answer || "No response received.",
          },
        ]);
        setShowFeedbackPrompt(true);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Something went wrong while calling the backend.",
        );
      } finally {
        setPending(false);
      }
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(input);
  }

  function triggerTopicMcq() {
    sendMessage(
      "Give me one UPSC-style MCQ on the current discussed topic right now. Skip the remaining discussion for now.",
    );
  }

  return (
    <div id="diya-current-affairs" className="glass-panel flex min-h-[72vh] flex-col rounded-[2.2rem]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-5 py-4 md:px-6">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold text-ink">
            <MessageCircleMore size={20} />
            Diya current affairs class
          </div>
          <div className="text-sm text-copy">
            Ask Diya about today&apos;s editorial, a specific issue, or upload your own newspaper for
            extra context. She will teach article by article with MCQ checks.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-[#fff4ea] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#d96200]">
            Free access
          </span>
          {usage ? (
            <span className="rounded-full bg-white/88 px-3 py-1 text-xs font-semibold text-ink">
              {usage.hasActivePlan ? `${usage.plan.toUpperCase()} plan` : `${usage.remainingFreeTurns} free turns left`}
            </span>
          ) : null}
          {model ? (
            <span className="rounded-full bg-white/88 px-3 py-1 text-xs font-semibold text-ink">
              {model}
            </span>
          ) : null}
          <button
            type="button"
            onClick={focusComposer}
            className="button-secondary"
          >
            Launch Diya
          </button>
          <button
            type="button"
            onClick={resetSession}
            className="rounded-full border border-border-subtle bg-white/88 px-4 py-2 text-sm font-semibold text-ink"
          >
            Clear session
          </button>
        </div>
      </div>

      <div className="grid gap-4 border-b border-border-subtle px-5 py-5 md:px-6 xl:grid-cols-[15rem_1fr]">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-ink">Focus area</span>
          <select
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="rounded-2xl border border-border-subtle bg-white/86 px-4 py-3 text-sm outline-none transition focus:border-[#f07b17]"
          >
            {focusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-ink">Class goal</span>
          <input
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            className="rounded-2xl border border-border-subtle bg-white/86 px-4 py-3 text-sm outline-none transition focus:border-[#f07b17]"
          />
        </label>
      </div>

      <div className="grid gap-3 px-5 pt-5 md:px-6">
        <label className="grid gap-2 rounded-[1.35rem] border border-border-subtle bg-white/80 p-4">
          <span className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Newspaper size={16} />
            Add your own newspaper
          </span>
          <input
            type="file"
            multiple
            accept=".pdf,.txt,.md,.markdown,.html,.xml"
            onChange={(event) => setNewspaperList(event.target.files)}
            className="text-sm text-copy file:mr-3 file:rounded-full file:border-0 file:bg-[#f07b17] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#fff7ef]"
          />
        </label>
      </div>

      <div className="px-5 pt-4 md:px-6">
        <div className="grid gap-3">
          <div className="rounded-[1.35rem] border border-[#f07b17]/18 bg-[#fff4ea] px-4 py-3 text-sm text-copy">
            <div className="font-semibold text-ink">Global study material is attached here too.</div>
            <div className="mt-1 text-xs leading-6">
              TamGam uses the same session-only study material across Study, Mains, Prelims, and
              Current Affairs. It is not saved in the database or kept as a permanent file.
            </div>
            {globalMaterialSummary.length ? (
              <div className="mt-2 text-xs">
                {globalMaterialSummary.map((name) => (
                  <div key={name}>{name}</div>
                ))}
              </div>
            ) : (
              <div className="mt-2 text-xs">
                No global study material attached yet. Upload it once from the workspace.
              </div>
            )}
          </div>

          {uploadSummary.length ? (
            <div className="rounded-[1.35rem] bg-[#fff4ea] px-4 py-3 text-xs text-copy">
              {uploadSummary.map((name) => (
                <div key={name}>{name}</div>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.35rem] border border-dashed border-border-subtle bg-white/72 px-4 py-3 text-sm text-copy">
              You can start directly, or upload your own newspaper if you want Diya to use that
              alongside today&apos;s class context.
            </div>
          )}
        </div>
      </div>

      <div className="px-5 pt-4 md:px-6">
        <div className="flex flex-wrap gap-2">
          {currentAffairsPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => sendMessage(prompt)}
              className="rounded-full border border-border-subtle bg-white/82 px-4 py-2 text-sm text-copy transition hover:bg-white hover:text-ink"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 md:px-6">
        {messages.map((message, index) => {
          const assistant = message.role === "assistant";

          return (
            <div
              key={`${message.role}-${index}`}
              className={`flex ${assistant ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-4xl rounded-[1.75rem] px-4 py-3 text-sm leading-7 md:px-5 ${
                  assistant ? "bg-white/88 text-copy" : "bg-[#18130f] text-[#fff7ef]"
                }`}
              >
                <div className="mb-2 font-mono text-[0.7rem] uppercase tracking-[0.22em] opacity-70">
                  {assistant ? "Diya" : "You"}
                </div>
                {assistant ? (
                  <div className="grid gap-3">
                    <DiyaReplyBody content={message.content} />
                    <div>
                      <button
                        type="button"
                        onClick={triggerTopicMcq}
                        disabled={pending}
                        className="rounded-full border border-[#f07b17]/20 bg-[#fff4ea] px-4 py-2 text-sm font-semibold text-[#d96200] transition hover:bg-[#ffe9d2] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Practice MCQ on this topic
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                )}
              </div>
            </div>
          );
        })}

        {pending ? (
          <div className="flex justify-start">
            <div className="rounded-[1.75rem] bg-white/88 px-4 py-3 text-sm text-copy md:px-5">
              <div className="flex items-center gap-2">
                <LoaderCircle className="animate-spin" size={16} />
                Diya is reading the uploads and shaping the next article.
              </div>
            </div>
          </div>
        ) : null}
        {error ? (
          <div className="rounded-[1.5rem] border border-rose/25 bg-rose/8 px-4 py-3 text-sm text-rose">
            {error}
          </div>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-border-subtle px-5 py-4 md:px-6">
        <div className="grid gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={embedded ? 4 : 5}
            placeholder="Ask Diya to start today's class, explain a specific article, or answer the MCQ."
            className="rounded-[1.5rem] border border-border-subtle bg-white/90 px-4 py-3 text-sm outline-none transition focus:border-[#f07b17]"
          />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-copy">
              <FileText size={14} />
              Diya focuses only on UPSC-relevant sections and ignores non-exam material.
            </div>
            <button type="submit" className="button-primary" disabled={pending}>
              {pending ? <LoaderCircle className="animate-spin" size={18} /> : <SendHorizontal size={18} />}
              Send to Diya
            </button>
          </div>
        </div>
      </form>

      {showFeedbackPrompt && messages.length > 2 ? (
        <div className="border-t border-border-subtle px-5 py-4 md:px-6">
          <SessionFeedbackCard
            sessionKey={sessionKey}
            sessionType="current-affairs"
            subject={subject}
            title="Rate this current affairs class"
            compact
          />
        </div>
      ) : null}
    </div>
  );
}
