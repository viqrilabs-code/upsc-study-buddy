"use client";

import { LoaderCircle, Search } from "lucide-react";
import { startTransition, useState } from "react";

type UserProfileSnapshot = {
  id: string;
  email: string;
  name: string;
  plan: string;
  subscriptionStatus: string;
  subscriptionExpiresAt: string;
  subscriptionOrderId: string;
  subscriptionPaymentId: string;
  freeTurnsUsed: number;
  strengths: string[];
  weaknesses: string[];
  averageRating: number;
  feedbackCount: number;
  createdAt: string;
  updatedAt: string;
};

type PracticeReportSnapshot = {
  id: string;
  mode: string;
  subject: string;
  topic: string;
  chapter: string;
  score: string;
  verdict: string;
  createdAt: string;
};

type BillingRecordSnapshot = {
  id: string;
  planId: string;
  orderId: string;
  paymentId: string;
  status: string;
  amountPaise: number;
  refundedAmountPaise: number;
  refundStatus: string;
  createdAt: string;
  expiresAt: string;
  lastRefundAt: string;
};

type RefundRecordSnapshot = {
  refundId: string;
  orderId: string;
  paymentId: string;
  status: string;
  amountPaise: number;
  reason: string;
  updatedAt: string;
};

type SessionFeedbackSnapshot = {
  id: string;
  sessionType: string;
  subject: string;
  rating: number;
  feedback: string;
  createdAt: string;
};

type LookupResponse = {
  message?: string;
  userFound?: boolean;
  email?: string;
  profile?: UserProfileSnapshot;
  reports?: PracticeReportSnapshot[];
  billing?: BillingRecordSnapshot[];
  refunds?: RefundRecordSnapshot[];
  feedback?: SessionFeedbackSnapshot[];
  issues?: string[];
};

function formatMoney(amountPaise: number) {
  return `Rs ${(amountPaise / 100).toFixed(2)}`;
}

function formatDate(value: string) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function AdminUserLookupCard() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<LookupResponse | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim()) {
      setError("Enter a user email.");
      return;
    }

    setPending(true);
    setError("");
    setResult(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/support/user-lookup", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            email,
          }),
        });
        const data = (await response.json()) as LookupResponse;

        if (!response.ok) {
          throw new Error(data.message || "Unable to inspect this user right now.");
        }

        setResult(data);
      } catch (requestError) {
        setError(
          requestError instanceof Error ? requestError.message : "Unable to inspect this user right now.",
        );
      } finally {
        setPending(false);
      }
    });
  }

  return (
    <section className="glass-panel rounded-[2rem] p-6">
      <div className="text-lg font-semibold text-ink">User lookup</div>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-copy">
        Inspect one user account to diagnose signup, login, billing, refund, and saved-report state.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3 md:flex-row">
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="User email"
          className="min-w-0 flex-1 rounded-2xl border border-border-subtle bg-white/88 px-4 py-3 text-sm outline-none transition focus:border-[#f07b17]"
        />
        <button type="submit" className="button-primary" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" size={18} /> : <Search size={18} />}
          Inspect user
        </button>
      </form>

      {error ? (
        <div className="mt-4 rounded-[1.4rem] border border-rose/20 bg-rose/8 px-4 py-3 text-sm text-rose">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="mt-5 grid gap-5">
          <div className="rounded-[1.5rem] border border-border-subtle bg-white/84 p-5">
            <div className="text-sm font-semibold text-ink">
              {result.userFound ? "Account snapshot loaded." : "No workspace profile found."}
            </div>
            {result.issues?.length ? (
              <div className="mt-3 grid gap-2">
                {result.issues.map((issue) => (
                  <div
                    key={issue}
                    className="rounded-[1rem] border border-[#f07b17]/16 bg-[#fff4ea] px-3 py-2 text-sm text-ink"
                  >
                    {issue}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 text-sm text-copy">
                No obvious support issue was detected from the saved data.
              </div>
            )}
          </div>

          {result.profile ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: "Plan",
                    value: result.profile.plan.toUpperCase(),
                    detail: result.profile.subscriptionStatus,
                  },
                  {
                    label: "Profile ID",
                    value: result.profile.id,
                    detail: "Primary TamGam user id",
                  },
                  {
                    label: "Free turns used",
                    value: String(result.profile.freeTurnsUsed),
                    detail: "Tracked on the user profile",
                  },
                  {
                    label: "Feedback avg",
                    value: result.profile.feedbackCount
                      ? String(result.profile.averageRating)
                      : "N/A",
                    detail: `${result.profile.feedbackCount} feedback entries`,
                  },
                ].map((item) => (
                  <article key={item.label} className="rounded-[1.5rem] border border-border-subtle bg-white/84 p-5">
                    <div className="font-mono text-xs uppercase tracking-[0.22em] text-copy">{item.label}</div>
                    <div className="mt-3 break-words text-xl font-semibold text-ink">{item.value}</div>
                    <div className="mt-2 text-sm text-copy">{item.detail}</div>
                  </article>
                ))}
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <section className="rounded-[1.5rem] border border-border-subtle bg-white/84 p-5">
                  <div className="text-lg font-semibold text-ink">Account details</div>
                  <div className="mt-4 grid gap-2 text-sm leading-7 text-copy">
                    <div>Name: {result.profile.name}</div>
                    <div>Email: {result.profile.email}</div>
                    <div>Subscription expires: {formatDate(result.profile.subscriptionExpiresAt)}</div>
                    <div>Subscription order ID: {result.profile.subscriptionOrderId || "N/A"}</div>
                    <div>Subscription payment ID: {result.profile.subscriptionPaymentId || "N/A"}</div>
                    <div>Created: {formatDate(result.profile.createdAt)}</div>
                    <div>Updated: {formatDate(result.profile.updatedAt)}</div>
                  </div>
                </section>

                <section className="rounded-[1.5rem] border border-border-subtle bg-white/84 p-5">
                  <div className="text-lg font-semibold text-ink">Signals</div>
                  <div className="mt-4 grid gap-4">
                    <div>
                      <div className="text-sm font-semibold text-ink">Strengths</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {result.profile.strengths.length ? (
                          result.profile.strengths.map((item) => (
                            <span
                              key={item}
                              className="rounded-full border border-[#f07b17]/18 bg-[#fff4ea] px-3 py-1 text-sm font-semibold text-[#d96200]"
                            >
                              {item}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-copy">No strengths saved yet.</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-ink">Weaknesses</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {result.profile.weaknesses.length ? (
                          result.profile.weaknesses.map((item) => (
                            <span
                              key={item}
                              className="rounded-full border border-[#151311]/10 bg-white px-3 py-1 text-sm font-semibold text-ink"
                            >
                              {item}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-copy">No weaknesses saved yet.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <section className="rounded-[1.5rem] border border-border-subtle bg-white/84 p-5">
                  <div className="text-lg font-semibold text-ink">Billing records</div>
                  <div className="mt-4 grid gap-3">
                    {result.billing?.length ? (
                      result.billing.map((entry) => (
                        <div key={entry.id} className="rounded-[1rem] border border-border-subtle bg-sand/55 p-4 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-ink">{entry.planId.toUpperCase()}</span>
                            <span className="rounded-full bg-[#18130f] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#fff7ef]">
                              {entry.status}
                            </span>
                          </div>
                          <div className="mt-2 break-words text-copy">Order: {entry.orderId}</div>
                          <div className="break-words text-copy">Payment: {entry.paymentId || "N/A"}</div>
                          <div className="text-copy">Amount: {formatMoney(entry.amountPaise)}</div>
                          <div className="text-copy">
                            Refunded: {formatMoney(entry.refundedAmountPaise)} ({entry.refundStatus})
                          </div>
                          <div className="text-copy">Created: {formatDate(entry.createdAt)}</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-copy">No billing history saved for this user.</div>
                    )}
                  </div>
                </section>

                <section className="rounded-[1.5rem] border border-border-subtle bg-white/84 p-5">
                  <div className="text-lg font-semibold text-ink">Refund records</div>
                  <div className="mt-4 grid gap-3">
                    {result.refunds?.length ? (
                      result.refunds.map((entry) => (
                        <div key={entry.refundId} className="rounded-[1rem] border border-border-subtle bg-sand/55 p-4 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-ink">{formatMoney(entry.amountPaise)}</span>
                            <span className="rounded-full bg-[#fff4ea] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#d96200]">
                              {entry.status}
                            </span>
                          </div>
                          <div className="mt-2 break-words text-copy">Refund: {entry.refundId}</div>
                          <div className="break-words text-copy">Order: {entry.orderId}</div>
                          <div className="break-words text-copy">Payment: {entry.paymentId}</div>
                          <div className="text-copy">Reason: {entry.reason || "N/A"}</div>
                          <div className="text-copy">Updated: {formatDate(entry.updatedAt)}</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-copy">No refund history saved for this user.</div>
                    )}
                  </div>
                </section>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <section className="rounded-[1.5rem] border border-border-subtle bg-white/84 p-5">
                  <div className="text-lg font-semibold text-ink">Recent reports</div>
                  <div className="mt-4 grid gap-3">
                    {result.reports?.length ? (
                      result.reports.map((entry) => (
                        <div key={entry.id} className="rounded-[1rem] border border-border-subtle bg-sand/55 p-4 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-ink">
                              {entry.mode.toUpperCase()} | {entry.subject}
                            </span>
                            <span className="text-copy">{entry.score}</span>
                          </div>
                          <div className="mt-2 text-copy">{entry.topic || "General focus"}</div>
                          <div className="text-copy">{entry.verdict}</div>
                          <div className="mt-2 text-copy">Saved: {formatDate(entry.createdAt)}</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-copy">No saved reports yet.</div>
                    )}
                  </div>
                </section>

                <section className="rounded-[1.5rem] border border-border-subtle bg-white/84 p-5">
                  <div className="text-lg font-semibold text-ink">Recent feedback</div>
                  <div className="mt-4 grid gap-3">
                    {result.feedback?.length ? (
                      result.feedback.map((entry) => (
                        <div key={entry.id} className="rounded-[1rem] border border-border-subtle bg-sand/55 p-4 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-ink">
                              {entry.sessionType} | {entry.subject}
                            </span>
                            <span className="text-copy">{entry.rating}/5</span>
                          </div>
                          <div className="mt-2 text-copy">{entry.feedback || "No written feedback."}</div>
                          <div className="mt-2 text-copy">Saved: {formatDate(entry.createdAt)}</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-copy">No feedback saved yet.</div>
                    )}
                  </div>
                </section>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

