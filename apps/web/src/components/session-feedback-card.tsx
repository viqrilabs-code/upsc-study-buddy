"use client";

import { LoaderCircle, Star } from "lucide-react";
import { startTransition, useState } from "react";

export function SessionFeedbackCard({
  sessionKey,
  sessionType,
  subject,
  title = "How was this session?",
  compact = false,
}: {
  sessionKey: string;
  sessionType: string;
  subject: string;
  title?: string;
  compact?: boolean;
}) {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function submitFeedback() {
    if (!rating) {
      setError("Choose a rating before submitting.");
      return;
    }

    setPending(true);
    setError("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/feedback", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            sessionKey,
            sessionType,
            subject,
            rating,
            feedback,
          }),
        });
        const data = (await response.json()) as { message?: string };

        if (!response.ok) {
          throw new Error(data.message || "Unable to save feedback right now.");
        }

        setDone(true);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to save feedback right now.",
        );
      } finally {
        setPending(false);
      }
    });
  }

  if (done) {
    return (
      <div className="rounded-[1.5rem] border border-[#f07b17]/16 bg-[#fff4ea] px-4 py-4 text-sm text-ink">
        Thanks. Your feedback is saved and will be attached to your user profile.
      </div>
    );
  }

  return (
    <section className="rounded-[1.7rem] border border-border-subtle bg-white/88 px-5 py-5">
      <div className="text-base font-semibold text-ink">{title}</div>
      <p className="mt-2 text-sm leading-7 text-copy">
        Rate this session once. The score and feedback will be stored with your profile.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition ${
              value <= rating
                ? "border-[#f07b17] bg-[#fff1e3] text-[#f07b17]"
                : "border-border-subtle bg-white text-copy hover:border-[#f07b17]/35 hover:text-[#f07b17]"
            }`}
            aria-label={`Rate ${value}`}
          >
            <Star size={18} fill={value <= rating ? "currentColor" : "none"} />
          </button>
        ))}
      </div>

      <textarea
        value={feedback}
        onChange={(event) => setFeedback(event.target.value)}
        rows={compact ? 3 : 4}
        placeholder="Optional feedback on quality, tone, difficulty, or what should improve next."
        className="mt-4 w-full rounded-[1.35rem] border border-border-subtle bg-white px-4 py-3 text-sm outline-none transition focus:border-[#f07b17]"
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={submitFeedback} className="button-primary" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" size={18} /> : null}
          Submit feedback
        </button>
        {error ? <div className="text-sm text-rose">{error}</div> : null}
      </div>
    </section>
  );
}
