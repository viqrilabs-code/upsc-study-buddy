import { NextResponse } from "next/server";
import {
  activatePlanForUser,
  getBillingRecordByOrderId,
  syncRefundStateForOrder,
  updateBillingRecordByOrderId,
  upsertRefundRecord,
} from "@/lib/app-db";
import { createRequestLogger } from "@/lib/logger";
import { planCatalog, type PlanId } from "@/lib/plans";
import {
  getRazorpayClient,
  isRazorpayConfigured,
  verifyRazorpayWebhookSignature,
} from "@/lib/razorpay";

type RazorpayPayloadEntity = Record<string, unknown> & {
  id?: unknown;
  order_id?: unknown;
  amount?: unknown;
  amount_refunded?: unknown;
  notes?: unknown;
};

type RazorpayRefundEntity = Record<string, unknown> & {
  id?: unknown;
  amount?: unknown;
  currency?: unknown;
  payment_id?: unknown;
  notes?: unknown;
  receipt?: unknown;
  created_at?: unknown;
  status?: unknown;
  speed_requested?: unknown;
  speed_processed?: unknown;
};

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asPlanId(value: unknown) {
  const normalized = asTrimmedString(value) as PlanId;
  return planCatalog[normalized] ? normalized : null;
}

function getNotesObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function notesToStringMap(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).map(([key, noteValue]) => [
      key,
      typeof noteValue === "string" ? noteValue : String(noteValue),
    ]),
  );
}

function asIsoFromUnix(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? new Date(value * 1000).toISOString()
    : undefined;
}

async function loadGatewayOrderNotes(orderId: string, fallback: Record<string, unknown>) {
  if (Object.keys(fallback).length || !orderId || !isRazorpayConfigured()) {
    return fallback;
  }

  try {
    const order = (await getRazorpayClient().orders.fetch(orderId)) as { notes?: unknown };
    return {
      ...getNotesObject(order.notes),
      ...fallback,
    };
  } catch {
    return fallback;
  }
}

async function activateResolvedOrder({
  orderId,
  paymentId,
  amountPaise,
  notes,
}: {
  orderId: string;
  paymentId: string;
  amountPaise: number;
  notes: Record<string, unknown>;
}) {
  const existing = await getBillingRecordByOrderId(orderId);

  if (existing) {
    await activatePlanForUser({
      userId: existing.userId,
      planId: existing.planId,
      orderId,
      paymentId,
      amountPaise: amountPaise || existing.amountPaise,
    });

    return true;
  }

  const userId = asTrimmedString(notes.userId);
  const planId = asPlanId(notes.planId);

  if (!userId || !planId) {
    return false;
  }

  await activatePlanForUser({
    userId,
    planId,
    orderId,
    paymentId,
    amountPaise: amountPaise || planCatalog[planId].amountPaise,
  });

  return true;
}

export async function POST(request: Request) {
  const logger = createRequestLogger("api/billing/webhook", request);
  const signature = request.headers.get("x-razorpay-signature") || "";
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const rawBody = await request.text();

  if (!webhookSecret) {
    logger.error("billing.webhook.misconfigured");
    return NextResponse.json(
      { message: "RAZORPAY_WEBHOOK_SECRET is not configured." },
      { status: 500 },
    );
  }

  if (!signature || !verifyRazorpayWebhookSignature({ payload: rawBody, signature, secret: webhookSecret })) {
    logger.warn("billing.webhook.rejected", {
      reason: "invalid_signature",
      hasSignature: Boolean(signature),
    });
    return NextResponse.json({ message: "Invalid Razorpay webhook signature." }, { status: 400 });
  }

  const payload = JSON.parse(rawBody) as {
    event?: unknown;
    payload?: {
      payment?: { entity?: RazorpayPayloadEntity };
      order?: { entity?: RazorpayPayloadEntity };
      refund?: { entity?: RazorpayRefundEntity };
    };
  };
  const event = asTrimmedString(payload.event);
  const payment = payload.payload?.payment?.entity || {};
  const order = payload.payload?.order?.entity || {};
  const refund = payload.payload?.refund?.entity || {};
  const orderId = asTrimmedString(order.id) || asTrimmedString(payment.order_id);
  const paymentId = asTrimmedString(payment.id);
  const amountPaise = Number(payment.amount || order.amount || 0);
  const rawNotes = {
    ...getNotesObject(order.notes),
    ...getNotesObject(payment.notes),
    ...getNotesObject(refund.notes),
  };
  const notes = await loadGatewayOrderNotes(orderId, rawNotes);

  logger.info("billing.webhook.received", {
    event,
    orderId,
    paymentId,
    amountPaise,
  });

  if ((event === "order.paid" || event === "payment.captured") && orderId && paymentId) {
    const resolved = await activateResolvedOrder({
      orderId,
      paymentId,
      amountPaise,
      notes,
    });

    return NextResponse.json({
      ok: true,
      event,
      resolved,
    });
  }

  if (event === "payment.authorized" && orderId) {
    await updateBillingRecordByOrderId({
      orderId,
      paymentId,
      status: "authorized",
      amountPaise: Number.isFinite(amountPaise) ? amountPaise : undefined,
    });

    return NextResponse.json({
      ok: true,
      event,
      updated: true,
    });
  }

  if (event === "payment.failed" && orderId) {
    await updateBillingRecordByOrderId({
      orderId,
      paymentId,
      status: "failed",
      amountPaise: Number.isFinite(amountPaise) ? amountPaise : undefined,
    });

    return NextResponse.json({
      ok: true,
      event,
      updated: true,
    });
  }

  if (
    (event === "refund.created" ||
      event === "refund.processed" ||
      event === "refund.failed" ||
      event === "refund.speed_changed") &&
    orderId &&
    paymentId
  ) {
    const existing = await getBillingRecordByOrderId(orderId);
    const userId = existing?.userId || asTrimmedString(notes.userId);
    const planId = existing?.planId || asPlanId(notes.planId) || "free";
    const refundId = asTrimmedString(refund.id);

    if (refundId && userId) {
      await upsertRefundRecord({
        refundId,
        userId,
        planId,
        orderId,
        paymentId,
        amountPaise: Number(refund.amount || 0),
        currency: asTrimmedString(refund.currency) || "INR",
        status:
          event === "refund.failed"
            ? "failed"
            : event === "refund.processed"
              ? "processed"
              : "pending",
        speedRequested: asTrimmedString(refund.speed_requested),
        speedProcessed: asTrimmedString(refund.speed_processed),
        receipt: asTrimmedString(refund.receipt),
        reason: asTrimmedString(notes.reason),
        notes: notesToStringMap(notes),
        initiatedByUserId: asTrimmedString(notes.initiatedByUserId),
        initiatedByEmail: asTrimmedString(notes.initiatedByEmail),
        createdAt: asIsoFromUnix(refund.created_at),
      });
    }

    if (userId) {
      const syncResult = await syncRefundStateForOrder({
        orderId,
        userId,
        paymentId,
        amountPaise: Number(payment.amount || existing?.amountPaise || 0),
        refundedAmountPaise: Number(payment.amount_refunded || 0),
        refundRecordedAt: asIsoFromUnix(refund.created_at),
      });

      return NextResponse.json({
        ok: true,
        event,
        refundId,
        synced: true,
        deactivated: syncResult.deactivated,
      });
    }

    return NextResponse.json({
      ok: true,
      event,
      refundId,
      synced: false,
    });
  }

  return NextResponse.json({
    ok: true,
    event,
    ignored: true,
  });
}
