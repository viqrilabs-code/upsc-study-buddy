"use client";

import { LoaderCircle, RotateCcw } from "lucide-react";
import { startTransition, useState } from "react";

type RefundResponse = {
  message?: string;
  resolution?: string;
  refundId?: string;
  orderId?: string;
  paymentId?: string;
  status?: string;
  amountPaise?: number;
  deactivated?: boolean;
};

export function BillingRefundCard() {
  const [orderId, setOrderId] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [amountRupees, setAmountRupees] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RefundResponse | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!orderId.trim() && !paymentId.trim()) {
      setError("Enter an order ID or payment ID.");
      return;
    }

    setPending(true);
    setError("");
    setResult(null);

    startTransition(async () => {
      try {
        const rawAmount = amountRupees.trim();
        const parsedAmountPaise = rawAmount ? Math.round(Number(rawAmount) * 100) : NaN;
        const amountPaise = rawAmount ? parsedAmountPaise : undefined;

        if (rawAmount && (!Number.isFinite(parsedAmountPaise) || parsedAmountPaise <= 0)) {
          throw new Error("Enter a valid refund amount in rupees.");
        }

        const response = await fetch("/api/billing/refund", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            orderId,
            paymentId,
            amountPaise: amountPaise ?? undefined,
            reason,
          }),
        });
        const data = (await response.json()) as RefundResponse;

        if (!response.ok) {
          throw new Error(data.message || "Unable to create the refund right now.");
        }

        setResult(data);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to create the refund right now.",
        );
      } finally {
        setPending(false);
      }
    });
  }

  return (
    <section className="glass-panel rounded-[2rem] p-6">
      <div className="text-lg font-semibold text-ink">Admin refund action</div>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-copy">
        Use this only for support-approved refunds. Leave the amount blank for a full refund, or
        enter a smaller rupee amount for a partial refund.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 grid gap-4 lg:grid-cols-2">
        <input
          value={orderId}
          onChange={(event) => setOrderId(event.target.value)}
          placeholder="Razorpay order ID"
          className="rounded-2xl border border-border-subtle bg-white/88 px-4 py-3 text-sm outline-none transition focus:border-[#f07b17]"
        />
        <input
          value={paymentId}
          onChange={(event) => setPaymentId(event.target.value)}
          placeholder="Razorpay payment ID"
          className="rounded-2xl border border-border-subtle bg-white/88 px-4 py-3 text-sm outline-none transition focus:border-[#f07b17]"
        />
        <input
          value={amountRupees}
          onChange={(event) => setAmountRupees(event.target.value)}
          placeholder="Refund amount in rupees (optional)"
          className="rounded-2xl border border-border-subtle bg-white/88 px-4 py-3 text-sm outline-none transition focus:border-[#f07b17]"
        />
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Reason for refund"
          className="rounded-2xl border border-border-subtle bg-white/88 px-4 py-3 text-sm outline-none transition focus:border-[#f07b17]"
        />
        <div className="lg:col-span-2">
          <button type="submit" className="button-primary" disabled={pending}>
            {pending ? <LoaderCircle className="animate-spin" size={18} /> : <RotateCcw size={18} />}
            Issue refund
          </button>
        </div>
      </form>

      {error ? (
        <div className="mt-4 rounded-[1.4rem] border border-rose/20 bg-rose/8 px-4 py-3 text-sm text-rose">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="mt-4 rounded-[1.4rem] border border-border-subtle bg-white/84 px-5 py-5 text-sm leading-7 text-copy">
          <div className="font-semibold text-ink">{result.resolution || "Refund created."}</div>
          {result.status ? <div className="mt-2">Refund status: {result.status}</div> : null}
          {result.amountPaise ? <div>Refund amount: Rs {(result.amountPaise / 100).toFixed(2)}</div> : null}
          {result.refundId ? <div>Refund ID: {result.refundId}</div> : null}
          {result.orderId ? <div>Order ID: {result.orderId}</div> : null}
          {result.paymentId ? <div>Payment ID: {result.paymentId}</div> : null}
          {result.deactivated ? <div>Paid access was revoked because the refund fully settled.</div> : null}
        </div>
      ) : null}
    </section>
  );
}
