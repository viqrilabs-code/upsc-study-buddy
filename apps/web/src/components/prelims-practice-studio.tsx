"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import {
  BrainCircuit,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  LoaderCircle,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";
import { useGlobalStudyMaterial } from "@/components/global-study-material-provider";
import { SessionFeedbackCard } from "@/components/session-feedback-card";
import type {
  PrelimsQuestionReview,
  PrelimsQuizDraft,
  PrelimsReviewDraft,
  PrelimsReviewSummary,
} from "@/lib/prelims-practice";
import { subjectOptions } from "@/lib/site";

type PrelimsPracticeResponse = {
  quiz?: PrelimsQuizDraft;
  summary?: PrelimsReviewSummary;
  feedback?: PrelimsReviewDraft;
  message?: string;
};

function BulletList({
  items,
  tone = "default",
}: {
  items: string[];
  tone?: "default" | "warm" | "cool";
}) {
  const bulletTone =
    tone === "warm" ? "text-gold-strong" : tone === "cool" ? "text-[#1a4d75]" : "text-navy";

  return (
    <ul className="grid gap-2 text-sm leading-7 text-copy">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span className={`mt-[0.35rem] text-xs ${bulletTone}`}>*</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ReviewCard({ review }: { review: PrelimsQuestionReview }) {
  const statusTone = review.isCorrect
    ? "border-emerald-200 bg-emerald-50/80 text-emerald-800"
    : review.attempted
      ? "border-rose/20 bg-rose/8 text-rose"
      : "border-border-subtle bg-sand/70 text-copy";

  return (
    <section className="rounded-[1.5rem] border border-border-subtle bg-white/88 px-5 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-navy/70">
          {review.id}
        </div>
        <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone}`}>
          {review.isCorrect ? "Correct" : review.attempted ? "Incorrect" : "Unanswered"}
        </div>
      </div>

      <div className="mt-3 text-base font-semibold leading-7 text-navy">{review.stem}</div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-[1.2rem] border border-border-subtle bg-sand/70 px-4 py-3 text-sm text-copy">
          <div className="font-semibold text-navy">Your answer</div>
          <div className="mt-1">{review.selectedOption || "Not attempted"}</div>
        </div>
        <div className="rounded-[1.2rem] border border-border-subtle bg-[linear-gradient(180deg,rgba(232,241,251,0.98),rgba(217,232,247,0.94))] px-4 py-3 text-sm text-[#16314f]">
          <div className="font-semibold text-[#1a4d75]">Correct answer</div>
          <div className="mt-1">{review.correctOption}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-[1.2rem] border border-border-subtle bg-white px-4 py-4">
          <div className="mb-2 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-gold-strong">
            Explanation
          </div>
          <p className="text-sm leading-7 text-copy">{review.explanation}</p>
        </div>
        <div className="rounded-[1.2rem] border border-border-subtle bg-white px-4 py-4">
          <div className="mb-2 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[#1a4d75]">
            Trap and pattern cue
          </div>
          <p className="text-sm leading-7 text-copy">{review.trap}</p>
          <p className="mt-3 text-sm leading-7 text-copy">{review.patternSignal}</p>
        </div>
      </div>
    </section>
  );
}

export function PrelimsPracticeStudio({
  subject,
  onSubjectChange,
}: {
  subject: string;
  onSubjectChange: (value: string) => void;
}) {
  const [topic, setTopic] = useState("");
  const [chapter, setChapter] = useState("");
  const [quiz, setQuiz] = useState<PrelimsQuizDraft | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [summary, setSummary] = useState<PrelimsReviewSummary | null>(null);
  const [feedback, setFeedback] = useState<PrelimsReviewDraft | null>(null);
  const [generatePending, setGeneratePending] = useState(false);
  const [submitPending, setSubmitPending] = useState(false);
  const [error, setError] = useState("");
  const [feedbackSessionKey, setFeedbackSessionKey] = useState(() => `prelims-${crypto.randomUUID()}`);
  const { files: globalStudyMaterialFiles } = useGlobalStudyMaterial();

  const currentQuestion = quiz?.questions[currentIndex] ?? null;
  const answeredCount = useMemo(
    () => Object.values(answers).filter((value) => value.trim()).length,
    [answers],
  );
  const globalMaterialSummary = useMemo(
    () => globalStudyMaterialFiles.map((file) => file.name),
    [globalStudyMaterialFiles],
  );

  useEffect(() => {
    setTopic("");
    setChapter("");
    setQuiz(null);
    setAnswers({});
    setCurrentIndex(0);
    setSummary(null);
    setFeedback(null);
    setError("");
  }, [subject]);

  function generateQuiz() {
    if (!topic.trim()) {
      setError("Enter the topic you want to practice before generating the prelims set.");
      return;
    }

    setError("");
    setGeneratePending(true);
    setQuiz(null);
    setAnswers({});
    setCurrentIndex(0);
    setSummary(null);
    setFeedback(null);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("action", "generate");
        formData.set("subject", subject);
        formData.set("topic", topic);
        formData.set("chapter", chapter);
        globalStudyMaterialFiles.forEach((file) => {
          formData.append("studyMaterial", file);
        });

        const response = await fetch("/api/prelims-practice", {
          method: "POST",
          body: formData,
        });

        const data = (await response.json()) as PrelimsPracticeResponse;

        if (!response.ok || !data.quiz) {
          throw new Error(data.message || "Unable to generate the prelims test right now.");
        }

        setQuiz(data.quiz);
        setFeedbackSessionKey(`prelims-${crypto.randomUUID()}`);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Something went wrong while generating the prelims test.",
        );
      } finally {
        setGeneratePending(false);
      }
    });
  }

  function updateAnswer(questionId: string, option: string) {
    setAnswers((current) => ({
      ...current,
      [questionId]: option,
    }));
  }

  function submitTest() {
    if (!quiz) {
      setError("Generate the prelims set first.");
      return;
    }

    setError("");
    setSubmitPending(true);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("action", "evaluate");
        formData.set("subject", subject);
        formData.set("topic", topic);
        formData.set("chapter", chapter);
        formData.set("quiz", JSON.stringify(quiz));
        formData.set("answers", JSON.stringify(answers));
        globalStudyMaterialFiles.forEach((file) => {
          formData.append("studyMaterial", file);
        });

        const response = await fetch("/api/prelims-practice", {
          method: "POST",
          body: formData,
        });

        const data = (await response.json()) as PrelimsPracticeResponse;

        if (!response.ok || !data.summary || !data.feedback) {
          throw new Error(data.message || "Unable to evaluate the prelims test right now.");
        }

        setSummary(data.summary);
        setFeedback(data.feedback);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Something went wrong while evaluating the prelims test.",
        );
      } finally {
        setSubmitPending(false);
      }
    });
  }

  function resetForNewAttempt() {
    setQuiz(null);
    setAnswers({});
    setCurrentIndex(0);
    setSummary(null);
    setFeedback(null);
    setError("");
  }

  return (
    <div className="glass-panel flex min-h-[70vh] flex-col rounded-[2rem]">
      <div className="flex items-center justify-between gap-4 border-b border-border-subtle px-5 py-4 md:px-6">
        <div>
          <div className="text-lg font-semibold text-navy">Prelims practice studio</div>
          <div className="text-sm text-copy">
            {subject} | 10-question UPSC-style MCQ test with end-of-test feedback
          </div>
        </div>
        <div className="rounded-full bg-white/88 px-3 py-1 text-xs font-semibold text-navy">
          One question at a time
        </div>
      </div>

      <div className="grid flex-1 gap-5 p-5 md:grid-cols-[21rem_1fr] md:p-6">
        <aside className="surface-panel rounded-[1.9rem] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-navy text-[#fff9ef]">
              <BrainCircuit size={20} />
            </div>
            <div>
              <div className="text-base font-semibold text-navy">Practice setup</div>
              <div className="text-sm text-copy">Generate a focused 10-MCQ prelims set.</div>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-navy">Subject</span>
              <select
                value={subject}
                onChange={(event) => onSubjectChange(event.target.value)}
                className="rounded-2xl border border-border-subtle bg-white/88 px-4 py-3 text-sm font-semibold text-navy outline-none transition focus:border-gold-strong"
              >
                {subjectOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-navy">Topic focus</span>
              <input
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                className="rounded-2xl border border-border-subtle bg-white/88 px-4 py-3 text-sm outline-none transition focus:border-gold-strong"
                placeholder="Example: Fundamental Rights, Agriculture, or Monsoon mechanism"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-navy">Sub-topic / chapter boundary</span>
              <input
                value={chapter}
                onChange={(event) => setChapter(event.target.value)}
                className="rounded-2xl border border-border-subtle bg-white/88 px-4 py-3 text-sm outline-none transition focus:border-gold-strong"
                placeholder="Example: Right to Equality or Pressure belts and wind system"
              />
            </label>

            <button
              type="button"
              onClick={generateQuiz}
              className="button-primary w-full"
              disabled={generatePending}
            >
              {generatePending ? <LoaderCircle className="animate-spin" size={18} /> : <Sparkles size={18} />}
              Generate 10-question prelims set
            </button>

            <div className="rounded-[1.5rem] border border-border-subtle bg-white/78 p-4 text-sm leading-7 text-copy">
              The set is generated around the chosen subject and topic, while staying close to recent UPSC prelims framing with statement-based logic, close distractors, and elimination traps.
            </div>

            <div className="rounded-[1.5rem] border border-[#f07b17]/18 bg-[#fff4ea] p-4 text-sm leading-7 text-copy">
              <div className="font-semibold text-navy">Global study material is active here.</div>
              <div className="mt-1 text-xs leading-6">
                These files are used across Study, Mains, Prelims, and Current Affairs only for
                this live session. TamGam does not save them in the database or keep them as
                permanent files.
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

            {quiz ? (
              <div className="rounded-[1.5rem] bg-sand/90 px-4 py-4 text-sm text-copy">
                <div className="font-semibold text-navy">{quiz.title}</div>
                <div className="mt-2">Answered: {answeredCount}/10</div>
                <div>Current: Question {currentIndex + 1}/10</div>
              </div>
            ) : null}

            {summary ? (
              <button type="button" onClick={resetForNewAttempt} className="button-secondary w-full">
                <ClipboardCheck size={18} />
                Start another prelims set
              </button>
            ) : null}
          </div>
        </aside>

        <div className="grid gap-5">
          {error ? (
            <div className="rounded-[1.5rem] border border-rose/25 bg-rose/8 px-4 py-3 text-sm text-rose">
              {error}
            </div>
          ) : null}

          {!quiz ? (
            <section className="surface-panel flex min-h-[18rem] items-center justify-center rounded-[1.9rem] p-6 text-center">
              <div className="max-w-xl">
                <BrainCircuit className="mx-auto text-navy" size={24} />
                <div className="mt-4 text-xl font-semibold text-navy">
                  Generate a subject- and topic-based prelims set first
                </div>
                <p className="mt-3 text-sm leading-7 text-copy">
                  The agent will build 10 UPSC-style MCQs, show them one by one, and then give you a result screen with explanations and improvement feedback.
                </p>
              </div>
            </section>
          ) : summary && feedback ? (
            <>
              <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-[1.7rem] border border-[#163f64]/16 bg-[linear-gradient(180deg,rgba(232,241,251,0.98),rgba(217,232,247,0.94))] px-5 py-5 text-[#16314f] shadow-[0_12px_30px_rgba(18,34,61,0.08)]">
                  <div className="mb-2 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[#1a4d75]">
                    Final score
                  </div>
                  <div className="text-3xl font-semibold text-navy">{feedback.score}</div>
                  <p className="mt-3 text-sm leading-7">{feedback.verdict}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                  <div className="rounded-[1.7rem] border border-border-subtle bg-white/88 px-5 py-5 text-center">
                    <div className="text-3xl font-semibold text-navy">{feedback.correctCount}</div>
                    <div className="mt-2 text-sm text-copy">Correct</div>
                  </div>

                  <div className="rounded-[1.7rem] border border-border-subtle bg-white/88 px-5 py-5 text-center">
                    <div className="text-3xl font-semibold text-navy">{feedback.incorrectCount}</div>
                    <div className="mt-2 text-sm text-copy">Incorrect</div>
                  </div>

                  <div className="rounded-[1.7rem] border border-border-subtle bg-white/88 px-5 py-5 text-center">
                    <div className="text-3xl font-semibold text-navy">{feedback.unansweredCount}</div>
                    <div className="mt-2 text-sm text-copy">Unanswered</div>
                  </div>
                </div>
              </section>

              <section className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-[1.7rem] border border-border-subtle bg-white/88 px-5 py-5">
                  <div className="mb-3 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-gold-strong">
                    Strengths
                  </div>
                  <BulletList items={feedback.strengths} tone="warm" />
                </div>

                <div className="rounded-[1.7rem] border border-border-subtle bg-white/88 px-5 py-5">
                  <div className="mb-3 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[#8b1a1a]">
                    Gaps
                  </div>
                  <BulletList items={feedback.gaps} />
                </div>

                <div className="rounded-[1.7rem] border border-border-subtle bg-white/88 px-5 py-5">
                  <div className="mb-3 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[#1a4d75]">
                    Next steps
                  </div>
                  <BulletList items={feedback.nextSteps} tone="cool" />
                </div>
              </section>

              <SessionFeedbackCard
                sessionKey={feedbackSessionKey}
                sessionType="prelims"
                subject={subject}
                title="Rate this prelims session"
              />

              <section className="grid gap-4">
                {summary.review.map((item) => (
                  <ReviewCard key={item.id} review={item} />
                ))}
              </section>
            </>
          ) : currentQuestion ? (
            <>
              <section className="surface-panel rounded-[1.9rem] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-navy">{quiz.title}</div>
                    <div className="mt-1 text-sm text-copy">{quiz.framingNote}</div>
                  </div>
                  <div className="rounded-full bg-sand/90 px-4 py-2 text-sm font-semibold text-navy">
                    Question {currentIndex + 1} of 10
                  </div>
                </div>

                {quiz.patternNotes.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {quiz.patternNotes.map((note) => (
                      <span
                        key={note}
                        className="rounded-full border border-border-subtle bg-white/88 px-3 py-1 text-xs font-semibold text-navy"
                      >
                        {note}
                      </span>
                    ))}
                  </div>
                ) : null}
              </section>

              <section className="surface-panel rounded-[1.9rem] p-5">
                <div className="flex items-start gap-3">
                  <Target className="mt-1 text-navy" size={20} />
                  <div className="flex-1">
                    <div className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[#1a4d75]">
                      {currentQuestion.id}
                    </div>
                    <div className="mt-3 text-xl font-semibold leading-8 text-navy">
                      {currentQuestion.stem}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-3">
                  {(["A", "B", "C", "D"] as const).map((option) => {
                    const selected = answers[currentQuestion.id] === option;

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => updateAnswer(currentQuestion.id, option)}
                        className={`rounded-[1.35rem] border px-4 py-4 text-left transition ${
                          selected
                            ? "border-navy bg-navy text-[#fff9ef]"
                            : "border-border-subtle bg-white/88 text-copy hover:bg-white hover:text-navy"
                        }`}
                      >
                        <div className="text-sm font-semibold">{option}. {currentQuestion.options[option]}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-copy">
                    Attempted so far: {answeredCount}/10
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentIndex((index) => Math.max(index - 1, 0))}
                      className="button-secondary"
                      disabled={currentIndex === 0}
                    >
                      <ChevronLeft size={18} />
                      Previous
                    </button>

                    {currentIndex < 9 ? (
                      <button
                        type="button"
                        onClick={() => setCurrentIndex((index) => Math.min(index + 1, 9))}
                        className="button-primary"
                      >
                        Next question
                        <ChevronRight size={18} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={submitTest}
                        className="button-primary"
                        disabled={submitPending}
                      >
                        {submitPending ? <LoaderCircle className="animate-spin" size={18} /> : <ClipboardCheck size={18} />}
                        Submit test
                      </button>
                    )}
                  </div>
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[1.7rem] border border-border-subtle bg-white/88 px-5 py-5">
                  <div className="mb-3 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[#1a4d75]">
                    Attempt status
                  </div>
                  <div className="text-3xl font-semibold text-navy">{answeredCount}/10</div>
                  <p className="mt-3 text-sm leading-7 text-copy">
                    You can move question by question and submit at the end. Unanswered questions will be marked separately in the result.
                  </p>
                </div>

                <div className="rounded-[1.7rem] border border-border-subtle bg-white/88 px-5 py-5">
                  <div className="mb-3 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-gold-strong">
                    Correct answers later
                  </div>
                  <div className="flex items-center gap-3 text-sm text-copy">
                    <CheckCircle2 className="text-emerald-700" size={18} />
                    Explanations unlock after submission
                  </div>
                </div>

                <div className="rounded-[1.7rem] border border-border-subtle bg-white/88 px-5 py-5">
                  <div className="mb-3 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[#8b1a1a]">
                    UPSC-style traps
                  </div>
                  <div className="flex items-center gap-3 text-sm text-copy">
                    <XCircle className="text-rose" size={18} />
                    Expect close distractors and statement-based elimination
                  </div>
                </div>
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
