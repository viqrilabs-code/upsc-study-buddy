"use client";

import Link from "next/link";
import { startTransition, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  BrainCircuit,
  ClipboardCheck,
  Crown,
  FileUp,
  LoaderCircle,
  MessageCircleMore,
  Newspaper,
  SendHorizontal,
} from "lucide-react";
import { CurrentAffairsStudio } from "@/components/current-affairs-studio";
import { GlobalStudyMaterialPanel } from "@/components/global-study-material-panel";
import { useGlobalStudyMaterial } from "@/components/global-study-material-provider";
import type { UserProfile } from "@/lib/app-db";
import { FREE_TURN_LIMIT } from "@/lib/plans";
import { subjectOptions } from "@/lib/site";
import { MainsPracticeStudio } from "@/components/mains-practice-studio";
import { PlanCheckoutButton } from "@/components/plan-checkout-button";
import { PrelimsPracticeStudio } from "@/components/prelims-practice-studio";
import { SessionFeedbackCard } from "@/components/session-feedback-card";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type ChatMode = "study" | "mains" | "prelims" | "current-affairs";

type LessonCardContent = {
  feedback: string;
  nextQuestion: string;
};

type UsageMeta = {
  plan: string;
  hasActivePlan: boolean;
  freeTurnsUsed: number;
  remainingFreeTurns: number;
};

const starterPrompts = [
  "Teach Fundamental Rights in guided Q&A mode.",
  "Start a gradual discussion on Panchayati Raj.",
  "Explain monsoon mechanism with one checkpoint at a time.",
  "Teach land reforms like a UPSC classroom discussion.",
];

const modeOptions: { value: ChatMode; label: string; icon: typeof BookOpen }[] = [
  { value: "study", label: "Study", icon: BookOpen },
  { value: "mains", label: "Mains", icon: ClipboardCheck },
  { value: "prelims", label: "Prelims", icon: BrainCircuit },
  { value: "current-affairs", label: "Current Affairs", icon: Newspaper },
];

const initialMessages: ChatMessage[] = [
  {
    role: "assistant",
    content:
      "I am Diya. Pick a topic and I will teach it like a seasoned UPSC teacher: one question at a time, with correction, progression, and short recall checks.",
  },
];

function toInitialUsage(profile: UserProfile): UsageMeta {
  const remaining = Math.max(0, FREE_TURN_LIMIT - profile.freeTurnsUsed);

  return {
    plan: profile.plan,
    hasActivePlan:
      profile.subscriptionStatus === "active" &&
      Boolean(profile.subscriptionExpiresAt) &&
      new Date(profile.subscriptionExpiresAt).getTime() > Date.now(),
    freeTurnsUsed: profile.freeTurnsUsed,
    remainingFreeTurns: remaining,
  };
}

function normalizeLessonTagText(content: string) {
  return content
    .replace(/[‹＜]/g, "<")
    .replace(/[›＞]/g, ">")
    .replace(/\r\n/g, "\n");
}

function extractLessonSection(content: string, tag: string) {
  const pattern = new RegExp(
    `<\\s*${tag}\\s*>([\\s\\S]*?)<\\s*\\/\\s*${tag}\\s*>`,
    "i",
  );

  return content.match(pattern)?.[1]?.trim() || "";
}

function parseLessonCards(content: string): LessonCardContent | null {
  const normalized = normalizeLessonTagText(content);
  const feedback = extractLessonSection(normalized, "lesson_feedback");
  const nextQuestion = extractLessonSection(normalized, "next_question");

  if (!feedback && !nextQuestion) {
    return null;
  }

  return {
    feedback,
    nextQuestion,
  };
}

function AssistantLessonCards({ content }: { content: string }) {
  const cards = parseLessonCards(content);

  if (!cards) {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  return (
    <div className="grid gap-3">
      {cards.feedback ? (
        <section className="rounded-[1.35rem] border border-[#f07b17]/22 bg-[linear-gradient(180deg,rgba(255,247,236,0.98),rgba(255,239,223,0.9))] px-4 py-4 text-[#433528]">
          <div className="mb-2 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-gold-strong">
            Explanation
          </div>
          <div className="whitespace-pre-wrap leading-7">{cards.feedback}</div>
        </section>
      ) : null}

      {cards.nextQuestion ? (
        <section className="rounded-[1.35rem] border border-[#1a1d33]/12 bg-[linear-gradient(180deg,rgba(236,239,250,0.98),rgba(225,231,247,0.94))] px-4 py-4 text-[#20284d]">
          <div className="mb-2 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[#303b6e]">
            Next Question
          </div>
          <div className="whitespace-pre-wrap font-medium leading-7">{cards.nextQuestion}</div>
        </section>
      ) : null}
    </div>
  );
}

export function ChatShell({ initialProfile }: { initialProfile: UserProfile }) {
  const [subject, setSubject] = useState("Polity");
  const [mode, setMode] = useState<ChatMode>("study");
  const [goal, setGoal] = useState("Repair weak areas through guided Q&A");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [model, setModel] = useState("");
  const [usage, setUsage] = useState<UsageMeta>(toInitialUsage(initialProfile));
  const [chatSessionKey, setChatSessionKey] = useState(() => `study-${crypto.randomUUID()}`);
  const [showFeedbackPrompt, setShowFeedbackPrompt] = useState(false);
  const chatComposerRef = useRef<HTMLTextAreaElement | null>(null);
  const chatPanelRef = useRef<HTMLDivElement | null>(null);
  const { files: studyMaterialFiles } = useGlobalStudyMaterial();

  const uploadSummary = useMemo(() => {
    return studyMaterialFiles.map((file) => file.name);
  }, [studyMaterialFiles]);

  function resetChatSession(nextMode = mode) {
    setMessages(initialMessages);
    setError("");
    setInput("");
    setShowFeedbackPrompt(false);
    setChatSessionKey(`${nextMode}-${crypto.randomUUID()}`);
  }

  function changeMode(nextMode: ChatMode) {
    setMode(nextMode);
    resetChatSession(nextMode);
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
        !(
          index === 0 &&
          message.role === "assistant" &&
          message.content === initialMessages[0].content
        ),
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
        formData.set("mode", mode);
        formData.set("messages", JSON.stringify(apiMessages));

        studyMaterialFiles.forEach((file) => {
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
          throw new Error(data.message || "Unable to get a response right now.");
        }

        if (data.usage) {
          setUsage(data.usage);
        }

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

  function launchDiya(nextMode: ChatMode = "study") {
    if (mode !== nextMode) {
      changeMode(nextMode);
    }

    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        chatPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        chatComposerRef.current?.focus();
      }, 60);
    });
  }

  return (
    <section className="container-shell py-6 md:py-8">
      <div className="grid gap-5">
        <section className="glass-panel rounded-[2.2rem] px-5 py-5 md:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="text-2xl font-semibold text-ink md:text-3xl">TamGam workspace</div>
              <p className="mt-2 text-sm leading-7 text-copy md:text-base">
                Study, practice, saved reports, weakness repair, and daily current affairs in one
                cleaner workspace.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-[#f07b17]/16 bg-[#fff4ea] px-4 py-2 text-sm font-semibold text-[#d96200]">
                {usage.hasActivePlan
                  ? `${usage.plan.toUpperCase()} plan active`
                  : `${usage.remainingFreeTurns} free turns left`}
              </div>
              <button
                type="button"
                onClick={() => launchDiya("study")}
                className="button-primary"
              >
                <MessageCircleMore size={18} />
                Launch Diya
              </button>
              <button
                type="button"
                onClick={() => window.requestAnimationFrame(() => {
                  document.getElementById("global-study-material")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                })}
                className="button-secondary"
              >
                <FileUp size={18} />
                Global material
              </button>
              <Link href="/pricing" className="button-secondary">
                Upgrade
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[15rem_1fr_auto]">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink">Subject</span>
              <select
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="rounded-2xl border border-border-subtle bg-white/86 px-4 py-3 text-sm outline-none transition focus:border-[#f07b17]"
              >
                {subjectOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink">Goal</span>
              <input
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                className="rounded-2xl border border-border-subtle bg-white/86 px-4 py-3 text-sm outline-none transition focus:border-[#f07b17]"
              />
            </label>

            <div className="grid gap-2">
              <span className="text-sm font-semibold text-ink">Quick access</span>
              <Link href="/notes" className="button-secondary">
                1-pager notes
              </Link>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {modeOptions.map((option) => {
              const Icon = option.icon;
              const active = mode === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => changeMode(option.value)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "bg-[#18130f] text-[#fff7ef]"
                      : "border border-border-subtle bg-white/78 text-ink hover:bg-white"
                  }`}
                >
                  <Icon size={18} />
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>

        <div id="global-study-material">
          <GlobalStudyMaterialPanel compact />
        </div>

        {!usage.hasActivePlan && usage.remainingFreeTurns <= 0 && mode !== "current-affairs" ? (
          <section className="glass-panel rounded-[2.2rem] p-6 md:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="font-mono text-xs uppercase tracking-[0.24em] text-gold-strong">
                  Free turns exhausted
                </div>
                <h2 className="mt-3 editorial-title text-4xl leading-tight text-ink md:text-5xl">
                  Keep studying with TamGam after the free trial ends.
                </h2>
                <p className="mt-3 text-sm leading-7 text-copy md:text-base">
                  Current affairs remains free. For guided study, practice modules, notes, and
                  report memory, choose a plan below.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <div className="rounded-[1.8rem] border border-border-subtle bg-white/84 p-5">
                <div className="text-lg font-semibold text-ink">Daily Pass</div>
                <div className="mt-2 editorial-title text-4xl text-ink">Rs 11</div>
                <div className="text-sm text-copy">One focused day of access</div>
                <div className="mt-5">
                  <PlanCheckoutButton planId="day" label="Buy daily pass" />
                </div>
              </div>
              <div className="rounded-[1.8rem] border border-[#f07b17]/25 bg-[linear-gradient(180deg,rgba(255,245,234,0.96),rgba(255,255,255,0.92))] p-5">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#18130f] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#fff7ef]">
                  <Crown size={14} />
                  Recommended
                </div>
                <div className="mt-3 text-lg font-semibold text-ink">Monthly</div>
                <div className="mt-2 editorial-title text-4xl text-ink">Rs 299</div>
                <div className="text-sm text-copy">The core plan for serious daily use</div>
                <div className="mt-5">
                  <PlanCheckoutButton planId="month" label="Buy monthly plan" />
                </div>
              </div>
              <div className="rounded-[1.8rem] border border-border-subtle bg-white/84 p-5">
                <div className="text-lg font-semibold text-ink">Yearly</div>
                <div className="mt-2 editorial-title text-4xl text-ink">Rs 1999</div>
                <div className="text-sm text-copy">Best value for a full UPSC cycle</div>
                <div className="mt-5">
                  <PlanCheckoutButton planId="year" label="Buy yearly plan" />
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {mode === "mains" ? (
          <MainsPracticeStudio subject={subject} onSubjectChange={setSubject} />
        ) : mode === "prelims" ? (
          <PrelimsPracticeStudio subject={subject} onSubjectChange={setSubject} />
        ) : mode === "current-affairs" ? (
          <CurrentAffairsStudio subject={subject} onSubjectChange={setSubject} embedded />
        ) : (
          <div ref={chatPanelRef} className="glass-panel flex min-h-[70vh] flex-col rounded-[2.2rem]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-5 py-4 md:px-6">
              <div>
                <div className="flex items-center gap-2 text-lg font-semibold text-ink">
                  <MessageCircleMore size={20} />
                  Diya study chat
                </div>
                <div className="text-sm text-copy">
                  {subject} | {mode.replace("-", " ")}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {model ? (
                  <span className="rounded-full bg-white/88 px-3 py-1 text-xs font-semibold text-ink">
                    {model}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => resetChatSession(mode)}
                  className="rounded-full border border-border-subtle bg-white/88 px-4 py-2 text-sm font-semibold text-ink"
                >
                  Clear session
                </button>
              </div>
            </div>

            <div className="px-5 pt-4 md:px-6">
              <div className="flex flex-wrap gap-2">
                {starterPrompts.map((prompt) => (
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
                      className={`max-w-3xl rounded-[1.75rem] px-4 py-3 text-sm leading-7 md:px-5 ${
                        assistant ? "bg-white/88 text-copy" : "bg-[#18130f] text-[#fff7ef]"
                      }`}
                    >
                      <div className="mb-2 font-mono text-[0.7rem] uppercase tracking-[0.22em] opacity-70">
                        {assistant ? "Diya" : "You"}
                      </div>
                      {assistant ? (
                        <AssistantLessonCards content={message.content} />
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
                      Thinking...
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
                {uploadSummary.length ? (
                  <div className="rounded-[1.35rem] bg-[#fff4ea] px-4 py-3 text-xs text-copy">
                    {uploadSummary.map((name) => (
                      <div key={name}>{name}</div>
                    ))}
                  </div>
                ) : null}

                <textarea
                  ref={chatComposerRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  rows={4}
                  placeholder="Ask Diya to begin a topic, answer the teacher's question, or upload notes for context."
                  className="rounded-[1.5rem] border border-border-subtle bg-white/90 px-4 py-3 text-sm outline-none transition focus:border-[#f07b17]"
                />

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="text-xs text-copy">
                    Global study material is attached across Study, Mains, Prelims, and Current
                    Affairs for this live session only. It is not saved.
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
                  sessionKey={chatSessionKey}
                  sessionType={mode}
                  subject={subject}
                  title="Rate this chat session"
                  compact
                />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
