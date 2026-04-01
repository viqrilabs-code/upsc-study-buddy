"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import {
  ClipboardCheck,
  FileUp,
  LoaderCircle,
  PenTool,
  ScanText,
  Sparkles,
  Target,
} from "lucide-react";
import { useGlobalStudyMaterial } from "@/components/global-study-material-provider";
import { SessionFeedbackCard } from "@/components/session-feedback-card";
import type {
  MainsEvaluationDraft,
  MainsQuestionDraft,
} from "@/lib/mains-practice";
import { subjectOptions } from "@/lib/site";

type MainsPracticeResponse = {
  draft?: MainsQuestionDraft | MainsEvaluationDraft;
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

export function MainsPracticeStudio({
  subject,
  onSubjectChange,
}: {
  subject: string;
  onSubjectChange: (value: string) => void;
}) {
  const [topicFocus, setTopicFocus] = useState("");
  const [chapter, setChapter] = useState("");
  const [questionDraft, setQuestionDraft] = useState<MainsQuestionDraft | null>(null);
  const [answerFiles, setAnswerFiles] = useState<File[]>([]);
  const [evaluationDraft, setEvaluationDraft] = useState<MainsEvaluationDraft | null>(null);
  const [questionPending, setQuestionPending] = useState(false);
  const [evaluationPending, setEvaluationPending] = useState(false);
  const [error, setError] = useState("");
  const [feedbackSessionKey, setFeedbackSessionKey] = useState(() => `mains-${crypto.randomUUID()}`);
  const { files: globalStudyMaterialFiles } = useGlobalStudyMaterial();

  const answerSummary = useMemo(() => answerFiles.map((file) => file.name), [answerFiles]);
  const globalMaterialSummary = useMemo(
    () => globalStudyMaterialFiles.map((file) => file.name),
    [globalStudyMaterialFiles],
  );

  useEffect(() => {
    setQuestionDraft(null);
    setEvaluationDraft(null);
    setAnswerFiles([]);
    setError("");
  }, [subject]);

  function setUploadedAnswerFiles(fileList: FileList | null) {
    setAnswerFiles(fileList ? Array.from(fileList) : []);
  }

  function appendGlobalStudyMaterial(formData: FormData) {
    globalStudyMaterialFiles.forEach((file) => {
      formData.append("studyMaterial", file);
    });
  }

  function generateQuestion() {
    if (!topicFocus.trim()) {
      setError("Enter the topic or chapter you want to practice before generating a mains question.");
      return;
    }

    setError("");
    setQuestionPending(true);
    setEvaluationDraft(null);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("action", "generate");
        formData.set("subject", subject);
        formData.set("topic", topicFocus);
        formData.set("chapter", chapter);
        appendGlobalStudyMaterial(formData);

        const response = await fetch("/api/mains-practice", {
          method: "POST",
          body: formData,
        });

        const data = (await response.json()) as MainsPracticeResponse;

        if (!response.ok || !data.draft) {
          throw new Error(data.message || "Unable to generate a mains question right now.");
        }

        setQuestionDraft(data.draft as MainsQuestionDraft);
        setAnswerFiles([]);
        setFeedbackSessionKey(`mains-${crypto.randomUUID()}`);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Something went wrong while generating the mains question.",
        );
      } finally {
        setQuestionPending(false);
      }
    });
  }

  function evaluateAnswer() {
    if (!questionDraft?.question) {
      setError("Generate a mains question first, then upload the handwritten answer.");
      return;
    }

    if (!answerFiles.length) {
      setError("Upload the handwritten answer pages before evaluation.");
      return;
    }

    setError("");
    setEvaluationPending(true);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("action", "evaluate");
        formData.set("subject", subject);
        formData.set("topic", topicFocus);
        formData.set("chapter", chapter);
        formData.set("question", questionDraft.question);
        appendGlobalStudyMaterial(formData);

        answerFiles.forEach((file) => {
          formData.append("answerUpload", file);
        });

        const response = await fetch("/api/mains-practice", {
          method: "POST",
          body: formData,
        });

        const data = (await response.json()) as MainsPracticeResponse;

        if (!response.ok || !data.draft) {
          throw new Error(data.message || "Unable to evaluate the handwritten answer right now.");
        }

        setEvaluationDraft(data.draft as MainsEvaluationDraft);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Something went wrong while evaluating the handwritten answer.",
        );
      } finally {
        setEvaluationPending(false);
      }
    });
  }

  return (
    <div className="glass-panel flex min-h-[70vh] flex-col rounded-[2rem]">
      <div className="flex items-center justify-between gap-4 border-b border-border-subtle px-5 py-4 md:px-6">
        <div>
          <div className="text-lg font-semibold text-navy">Mains practice studio</div>
          <div className="text-sm text-copy">
            {subject} | PYQ-style question framing + handwritten answer evaluation
          </div>
        </div>
        <div className="rounded-full bg-white/88 px-3 py-1 text-xs font-semibold text-navy">
          Original uploads are processed temporarily
        </div>
      </div>

      <div className="grid flex-1 gap-5 p-5 md:grid-cols-[21rem_1fr] md:p-6">
        <aside className="surface-panel rounded-[1.9rem] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-navy text-[#fff9ef]">
              <ClipboardCheck size={20} />
            </div>
            <div>
              <div className="text-base font-semibold text-navy">Practice setup</div>
              <div className="text-sm text-copy">Generate one realistic mains question at a time.</div>
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
              <span className="text-sm font-semibold text-navy">Topic / chapter focus</span>
              <input
                value={topicFocus}
                onChange={(event) => setTopicFocus(event.target.value)}
                className="rounded-2xl border border-border-subtle bg-white/88 px-4 py-3 text-sm outline-none transition focus:border-gold-strong"
                placeholder="Example: Fundamental Rights, Panchayati Raj, or Local Government"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-navy">Sub-topic / chapter boundary</span>
              <input
                value={chapter}
                onChange={(event) => setChapter(event.target.value)}
                className="rounded-2xl border border-border-subtle bg-white/88 px-4 py-3 text-sm outline-none transition focus:border-gold-strong"
                placeholder="Example: Articles 12 to 35 or Right to Equality"
              />
            </label>

            <button
              type="button"
              onClick={generateQuestion}
              className="button-primary w-full"
              disabled={questionPending}
            >
              {questionPending ? <LoaderCircle className="animate-spin" size={18} /> : <Sparkles size={18} />}
              Generate PYQ-style mains question
            </button>

            <div className="rounded-[1.5rem] border border-border-subtle bg-white/78 p-4 text-sm leading-7 text-copy">
              The question is framed around the selected subject, topic focus, and chapter boundary,
              while staying close to UPSC mains patterns from the last decade.
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

            <label className="grid gap-2 rounded-[1.5rem] border border-border-subtle bg-white/78 p-4">
              <span className="flex items-center gap-2 text-sm font-semibold text-navy">
                <FileUp size={16} />
                Upload handwritten answer
              </span>
              <input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={(event) => setUploadedAnswerFiles(event.target.files)}
                className="text-sm text-copy file:mr-3 file:rounded-full file:border-0 file:bg-navy file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#fff9ef]"
              />
              <span className="text-xs text-copy">
                Upload answer pages as photos, scans, or a PDF. The agent will transcribe and
                evaluate them.
              </span>
            </label>

            {answerSummary.length ? (
              <div className="rounded-[1.5rem] bg-sand/90 px-4 py-3 text-xs text-copy">
                {answerSummary.map((name) => (
                  <div key={name}>{name}</div>
                ))}
              </div>
            ) : null}

            <button
              type="button"
              onClick={evaluateAnswer}
              className="button-secondary w-full"
              disabled={evaluationPending || !questionDraft}
            >
              {evaluationPending ? <LoaderCircle className="animate-spin" size={18} /> : <PenTool size={18} />}
              Evaluate handwritten answer
            </button>
          </div>
        </aside>

        <div className="grid gap-5">
          {error ? (
            <div className="rounded-[1.5rem] border border-rose/25 bg-rose/8 px-4 py-3 text-sm text-rose">
              {error}
            </div>
          ) : null}

          {questionDraft ? (
            <section className="surface-panel rounded-[1.9rem] p-5">
              <div className="flex items-center gap-3">
                <Target className="text-navy" size={20} />
                <div>
                  <div className="text-base font-semibold text-navy">Generated mains question</div>
                  <div className="text-sm text-copy">
                    Built for {subject} using the topic focus and chapter boundary you selected.
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-[#163f64]/16 bg-[linear-gradient(180deg,rgba(232,241,251,0.98),rgba(217,232,247,0.94))] px-5 py-5 text-[#16314f] shadow-[0_12px_30px_rgba(18,34,61,0.08)]">
                <div className="mb-2 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[#1a4d75]">
                  Question
                </div>
                <div className="text-lg font-semibold leading-8">{questionDraft.question}</div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.5rem] border border-border-subtle bg-white/88 px-4 py-4">
                  <div className="mb-2 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-gold-strong">
                    Why this matches PYQ patterns
                  </div>
                  <p className="text-sm leading-7 text-copy">{questionDraft.rationale}</p>
                  <div className="mt-4">
                    <BulletList items={questionDraft.pyqSignals} tone="warm" />
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-border-subtle bg-white/88 px-4 py-4">
                  <div className="mb-2 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[#1a4d75]">
                    Ideal answer approach
                  </div>
                  <BulletList items={questionDraft.answerApproach} tone="cool" />
                  {questionDraft.keywords.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {questionDraft.keywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="rounded-full border border-border-subtle bg-sand/90 px-3 py-1 text-xs font-semibold text-navy"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          ) : (
            <section className="surface-panel flex min-h-[18rem] items-center justify-center rounded-[1.9rem] p-6 text-center">
              <div className="max-w-xl">
                <ClipboardCheck className="mx-auto text-navy" size={24} />
                <div className="mt-4 text-xl font-semibold text-navy">
                  Generate a chapter-wise mains question first
                </div>
                <p className="mt-3 text-sm leading-7 text-copy">
                  Once the question is generated, upload the handwritten answer pages. The agent
                  will transcribe the answer and evaluate it with detailed, UPSC-style feedback.
                </p>
              </div>
            </section>
          )}

          {evaluationDraft ? (
            <section className="grid gap-4">
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[1.7rem] border border-gold/25 bg-[linear-gradient(180deg,rgba(250,245,233,0.98),rgba(242,232,207,0.92))] px-5 py-5 text-[#3f4654] shadow-[0_12px_30px_rgba(200,156,77,0.12)]">
                  <div className="mb-2 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-gold-strong">
                    Verdict
                  </div>
                  <div className="text-2xl font-semibold text-navy">{evaluationDraft.score}</div>
                  <p className="mt-3 text-sm leading-7">{evaluationDraft.verdict}</p>
                </div>

                <div className="rounded-[1.7rem] border border-[#163f64]/16 bg-[linear-gradient(180deg,rgba(232,241,251,0.98),rgba(217,232,247,0.94))] px-5 py-5 text-[#16314f] shadow-[0_12px_30px_rgba(18,34,61,0.08)]">
                  <div className="mb-2 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[#1a4d75]">
                    Next attempt
                  </div>
                  <p className="text-sm leading-7">{evaluationDraft.nextStep}</p>
                  {evaluationDraft.improvedDirection ? (
                    <p className="mt-4 text-sm leading-7 text-copy">
                      {evaluationDraft.improvedDirection}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[1.7rem] border border-border-subtle bg-white/88 px-5 py-5">
                <div className="mb-2 flex items-center gap-2 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-navy/70">
                  <ScanText size={14} />
                  Extracted handwritten answer
                </div>
                <div className="whitespace-pre-wrap text-sm leading-7 text-copy">
                  {evaluationDraft.transcription}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[1.7rem] border border-border-subtle bg-white/88 px-5 py-5">
                  <div className="mb-3 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-gold-strong">
                    Strengths
                  </div>
                  <BulletList items={evaluationDraft.strengths} tone="warm" />
                </div>

                <div className="rounded-[1.7rem] border border-border-subtle bg-white/88 px-5 py-5">
                  <div className="mb-3 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[#8b1a1a]">
                    Gaps that cost marks
                  </div>
                  <BulletList items={evaluationDraft.gaps} />
                </div>
              </div>

              {evaluationDraft.upgrades.length ? (
                <div className="rounded-[1.7rem] border border-border-subtle bg-white/88 px-5 py-5">
                  <div className="mb-3 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[#1a4d75]">
                    Detailed upgrades
                  </div>
                  <BulletList items={evaluationDraft.upgrades} tone="cool" />
                </div>
              ) : null}

              <SessionFeedbackCard
                sessionKey={feedbackSessionKey}
                sessionType="mains"
                subject={subject}
                title="Rate this mains review"
              />
            </section>
          ) : questionDraft ? (
            <section className="surface-panel rounded-[1.9rem] p-6">
              <div className="text-base font-semibold text-navy">
                Handwritten evaluation will appear here
              </div>
              <p className="mt-3 text-sm leading-7 text-copy">
                Upload the handwritten answer and click evaluate. The agent will extract the answer,
                score it, and explain exactly what improved or weakened the copy.
              </p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
