import { NextResponse } from "next/server";
import { PlanId, planCatalog } from "@/lib/plans";
import {
  getBillingRecordByOrderId,
  syncRefundStateForOrder,
  upsertRefundRecord,
} from "@/lib/app-db";
import { isBillingAdminEmail } from "@/lib/billing-admin";
import { getAuthenticatedAppUser } from "@/lib/product-access";
import { getRazorpayClient, isRazorpayConfigured } from "@/lib/razorpay";

type RazorpayOrder = {
  id?: string;
  amount?: number;
  status?: string;
  notes?: Record<string, unknown>;
};

type RazorpayPayment = {
  id?: string;
  amount?: number;
  amount_refunded?: number;
  status?: string;
  email?: string;
  order_id?: string | null;
  created_at?: number;
};

type RazorpayRefund = {
  id?: string;
  amount?: number;
  currency?: string;
  payment_id?: string;
  status?: "pending" | "processed" | "failed";
  speed_requested?: string;
  speed_processed?: string;
  receipt?: string | null;
  notes?: Record<string, unknown>;
  created_at?: number;
};

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : Number(value || 0);
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

function buildRefundReceipt() {
  return `tg_refund_${Date.now().toString(36)}`.slice(0, 40);
}

function noteValueMap(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => [key, typeof entryValue === "string" ? entryValue : String(entryValue)]),
  );
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedAppUser();

    if (!authUser) {
      return NextResponse.json({ message: "Sign in to manage refunds." }, { status: 401 });
    }

    if (!isBillingAdminEmail(authUser.profile.email)) {
      return NextResponse.json(
        { message: "Refund actions are restricted to TamGam billing admins." },
        { status: 403 },
      );
    }

    if (!isRazorpayConfigured()) {
      return NextResponse.json({ message: "Razorpay is not configured." }, { status: 500 });
    }

    const payload = (await request.json()) as {
      orderId?: unknown;
      paymentId?: unknown;
      amountPaise?: unknown;
      speed?: unknown;
      reason?: unknown;
    };

    const suppliedOrderId = asTrimmedString(payload.orderId);
    const suppliedPaymentId = asTrimmedString(payload.paymentId);
    const requestedAmountPaise = asNumber(payload.amountPaise);
    const speed = asTrimmedString(payload.speed) === "optimum" ? "optimum" : "normal";
    const reason = asTrimmedString(payload.reason);

    if (!suppliedOrderId && !suppliedPaymentId) {
      return NextResponse.json(
        { message: "Enter an order ID or payment ID to start a refund." },
        { status: 400 },
      );
    }

    const razorpay = getRazorpayClient();
    let orderId = suppliedOrderId;
    let payment: RazorpayPayment | null = null;

    if (suppliedPaymentId) {
      payment = (await razorpay.payments.fetch(suppliedPaymentId)) as RazorpayPayment;
      orderId = orderId || asTrimmedString(payment.order_id);
    }

    if (!payment && orderId) {
      const paymentList = await razorpay.orders.fetchPayments(orderId);
      const capturedPayments = paymentList.items
        .filter((item) => item.status === "captured")
        .sort((left, right) => (right.created_at || 0) - (left.created_at || 0));

      if (!capturedPayments.length) {
        return NextResponse.json(
          { message: "No captured payment was found for this order yet." },
          { status: 409 },
        );
      }

      payment = capturedPayments[0] as RazorpayPayment;
    }

    if (!payment?.id) {
      return NextResponse.json({ message: "Unable to resolve the Razorpay payment." }, { status: 404 });
    }

    if (!orderId) {
      return NextResponse.json(
        { message: "This payment is not linked to a Razorpay order, so TamGam cannot refund it safely." },
        { status: 409 },
      );
    }

    const order = (await razorpay.orders.fetch(orderId)) as RazorpayOrder;
    const billing = await getBillingRecordByOrderId(orderId);
    const orderNotes = getNotesObject(order.notes);
    const resolvedUserId = billing?.userId || asTrimmedString(orderNotes.userId);
    const resolvedPlanId = billing?.planId || asPlanId(orderNotes.planId) || "free";

    if (!resolvedUserId) {
      return NextResponse.json(
        { message: "The order is missing TamGam user metadata, so refund audit cannot proceed." },
        { status: 409 },
      );
    }

    if (payment.status !== "captured") {
      return NextResponse.json(
        { message: `Only captured payments can be refunded. Current payment state: ${payment.status || "unknown"}.` },
        { status: 409 },
      );
    }

    const paymentAmount = asNumber(payment.amount);
    const refundedAlready = asNumber(payment.amount_refunded);
    const refundableBalance = Math.max(0, paymentAmount - refundedAlready);
    const refundAmountPaise = requestedAmountPaise > 0 ? requestedAmountPaise : refundableBalance;

    if (!refundAmountPaise) {
      return NextResponse.json(
        { message: "This payment is already fully refunded or has no refundable balance left." },
        { status: 409 },
      );
    }

    if (refundAmountPaise > refundableBalance) {
      return NextResponse.json(
        { message: `Requested refund exceeds the refundable balance of Rs ${(
          refundableBalance / 100
        ).toFixed(2)}.` },
        { status: 400 },
      );
    }

    const receipt = buildRefundReceipt();
    const refundNotes = noteValueMap({
      orderId,
      userId: resolvedUserId,
      planId: resolvedPlanId,
      initiatedByEmail: authUser.profile.email,
      initiatedByUserId: authUser.profile.id,
      reason,
    });

    const refund = (await razorpay.payments.refund(payment.id, {
      amount: refundAmountPaise,
      speed,
      receipt,
      notes: refundNotes,
    })) as RazorpayRefund;

    if (!refund.id || !refund.payment_id) {
      return NextResponse.json(
        { message: "Razorpay did not return a valid refund response." },
        { status: 502 },
      );
    }

    await upsertRefundRecord({
      refundId: refund.id,
      userId: resolvedUserId,
      planId: resolvedPlanId,
      orderId,
      paymentId: refund.payment_id,
      amountPaise: asNumber(refund.amount),
      currency: asTrimmedString(refund.currency) || "INR",
      status: refund.status || "pending",
      speedRequested: asTrimmedString(refund.speed_requested) || speed,
      speedProcessed: asTrimmedString(refund.speed_processed),
      receipt: asTrimmedString(refund.receipt),
      reason,
      notes: refundNotes,
      initiatedByUserId: authUser.profile.id,
      initiatedByEmail: authUser.profile.email,
      createdAt:
        typeof refund.created_at === "number"
          ? new Date(refund.created_at * 1000).toISOString()
          : undefined,
    });

    let deactivated = false;

    if (refund.status === "processed") {
      const syncResult = await syncRefundStateForOrder({
        orderId,
        userId: resolvedUserId,
        paymentId: refund.payment_id,
        amountPaise: paymentAmount,
        refundedAmountPaise: Math.min(paymentAmount, refundedAlready + asNumber(refund.amount)),
        refundRecordedAt:
          typeof refund.created_at === "number"
            ? new Date(refund.created_at * 1000).toISOString()
            : undefined,
      });
      deactivated = syncResult.deactivated;
    }

    return NextResponse.json({
      ok: true,
      refundId: refund.id,
      orderId,
      paymentId: refund.payment_id,
      status: refund.status || "pending",
      amountPaise: asNumber(refund.amount),
      resolution:
        refund.status === "processed"
          ? "Refund processed and TamGam state updated."
          : "Refund created. TamGam will finalize state when Razorpay confirms it.",
      deactivated,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to create the refund right now.",
      },
      { status: 500 },
    );
  }
}

