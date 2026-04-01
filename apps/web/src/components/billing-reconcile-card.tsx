"use client";

import { LoaderCircle, SearchCheck } from "lucide-react";
import { startTransition, useState } from "react";

type ReconcileResponse = {
  message?: string;
  resolution?: string;
  orderStatus?: string;
  paymentStatus?: string;
  orderId?: string;
  paymentId?: string;
  possiblePendingOrderId?: string;
  reconciled?: boolean;
};

export function BillingReconcileCard() {
  const [orderId, setOrderId] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ReconcileResponse | null>(null);

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
        const response = await fetch("/api/billing/reconcile", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            orderId,
            paymentId,
          }),
        });
        const data = (await response.json()) as ReconcileResponse;

        if (!response.ok) {
          throw new Error(data.message || "Unable to reconcile payment right now.");
        }

        setResult(data);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to reconcile payment right now.",
        );
      } finally {
        setPending(false);
      }
    });
  }

  return (
    <section className="glass-panel rounded-[2rem] p-6">
      <div className="text-lg font-semibold text-ink">Payment issue resolver</div>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-copy">
        If a user says payment is done but the plan is still inactive, enter the Razorpay order ID
        or payment ID here. TamGam will check Razorpay and explain whether the payment is paid,
        authorized, failed, or orphaned from the order.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
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
        <button type="submit" className="button-primary" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" size={18} /> : <SearchCheck size={18} />}
          Check payment
        </button>
      </form>

      {error ? (
        <div className="mt-4 rounded-[1.4rem] border border-rose/20 bg-rose/8 px-4 py-3 text-sm text-rose">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="mt-4 rounded-[1.4rem] border border-border-subtle bg-white/84 px-5 py-5 text-sm leading-7 text-copy">
          <div className="font-semibold text-ink">{result.resolution || "Payment checked."}</div>
          {result.orderStatus ? <div className="mt-2">Order status: {result.orderStatus}</div> : null}
          {result.paymentStatus ? <div>Payment status: {result.paymentStatus}</div> : null}
          {result.orderId ? <div>Order ID: {result.orderId}</div> : null}
          {result.paymentId ? <div>Payment ID: {result.paymentId}</div> : null}
          {result.possiblePendingOrderId ? (
            <div>Possible pending order in app: {result.possiblePendingOrderId}</div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
