"use client";

import { startTransition, useState, type FormEvent } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";

type ApiState = {
  answer: string;
  error: string;
  model: string;
};

const initialState: ApiState = {
  answer: "",
  error: "",
  model: "",
};

export function StudyBuddyPanel() {
  const [subject, setSubject] = useState("Polity");
  const [goal, setGoal] = useState("Mains answer writing");
  const [prompt, setPrompt] = useState(
    "Teach me parliamentary committees step by step and ask the first question.",
  );
  const [state, setState] = useState<ApiState>(initialState);
  const [pending, setPending] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPending(true);
    setState(initialState);

    startTransition(async () => {
      try {
        const response = await fetch("/api/study-buddy", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subject,
            goal,
            mode: "study",
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
          }),
        });

        const data = (await response.json()) as {
          answer?: string;
          message?: string;
          model?: string;
        };

        if (!response.ok) {
          throw new Error(data.message || "Unable to get a response right now.");
        }

        setState({
          answer: data.answer || "",
          error: "",
          model: data.model || "",
        });
      } catch (error) {
        setState({
          answer: "",
          error:
            error instanceof Error ? error.message : "Something went wrong while calling the backend.",
          model: "",
        });
      } finally {
        setPending(false);
      }
    });
  }

  return (
    <div className="glass-panel rounded-[2rem] p-6 md:p-8">
      <div className="flex items-center gap-3 text-navy">
        <Sparkles size={22} />
        <div>
          <h2 className="text-2xl font-semibold">Live study buddy backend</h2>
          <p className="mt-1 text-sm text-copy">
            This panel calls the server route, which reads your OpenAI API key from env.
          </p>
        </div>
      </div>

      <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-navy">Subject</span>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="rounded-2xl border border-border-subtle bg-white/90 px-4 py-3 text-sm outline-none transition focus:border-gold-strong"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-navy">Goal</span>
            <input
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              className="rounded-2xl border border-border-subtle bg-white/90 px-4 py-3 text-sm outline-none transition focus:border-gold-strong"
            />
          </label>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-navy">Ask the backend</span>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={5}
            className="rounded-2xl border border-border-subtle bg-white/90 px-4 py-3 text-sm outline-none transition focus:border-gold-strong"
          />
        </label>

        <div className="flex flex-col items-start gap-3">
          <button type="submit" className="button-primary" disabled={pending}>
            {pending ? <LoaderCircle className="animate-spin" size={18} /> : <Sparkles size={18} />}
            Generate answer
          </button>
          <p className="text-xs text-copy">
            Add `OPENAI_API_KEY` in `apps/web/.env.local` and restart `npm run dev`.
          </p>
        </div>
      </form>

      {state.error ? (
        <div className="mt-6 rounded-[1.5rem] border border-rose/20 bg-rose/8 p-4 text-sm text-rose">
          {state.error}
        </div>
      ) : null}

      {state.answer ? (
        <div className="mt-6 rounded-[1.5rem] bg-white/88 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-xs uppercase tracking-[0.22em] text-copy">
              Backend response
            </span>
            {state.model ? (
              <span className="rounded-full bg-sand px-3 py-1 text-xs font-semibold text-navy">
                {state.model}
              </span>
            ) : null}
          </div>
          <div className="prose-rich mt-4 whitespace-pre-wrap text-sm leading-7 text-copy">
            {state.answer}
          </div>
        </div>
      ) : null}
    </div>
  );
}
