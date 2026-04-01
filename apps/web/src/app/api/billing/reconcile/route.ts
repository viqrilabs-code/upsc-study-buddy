import { NextResponse } from "next/server";
import {
  activatePlanForUser,
  findRecentPendingBillingForUserByAmount,
  getBillingRecordByOrderId,
  updateBillingRecordByOrderId,
} from "@/lib/app-db";
import { planCatalog, type PlanId } from "@/lib/plans";
import { getAuthenticatedAppUser, getUsageMeta } from "@/lib/product-access";
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
  refund_status?: string;
  email?: string;
  contact?: string;
  order_id?: string | null;
  created_at?: number;
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

export async function POST(request: Request) {
  const authUser = await getAuthenticatedAppUser();

  if (!authUser) {
    return NextResponse.json({ message: "Sign in to reconcile payment." }, { status: 401 });
  }

  if (!isRazorpayConfigured()) {
    return NextResponse.json({ message: "Razorpay is not configured." }, { status: 500 });
  }

  const payload = (await request.json()) as {
    orderId?: unknown;
    paymentId?: unknown;
  };
  const suppliedOrderId = asTrimmedString(payload.orderId);
  const suppliedPaymentId = asTrimmedString(payload.paymentId);

  if (!suppliedOrderId && !suppliedPaymentId) {
    return NextResponse.json(
      { message: "Provide an order ID or payment ID for reconciliation." },
      { status: 400 },
    );
  }

  const razorpay = getRazorpayClient();
  let payment: RazorpayPayment | null = null;
  let order: RazorpayOrder | null = null;

  if (suppliedPaymentId) {
    payment = (await razorpay.payments.fetch(suppliedPaymentId)) as RazorpayPayment;
  }

  const orderId = suppliedOrderId || asTrimmedString(payment?.order_id);

  if (orderId) {
    order = (await razorpay.orders.fetch(orderId)) as RazorpayOrder;
  }

  const billing = orderId ? await getBillingRecordByOrderId(orderId) : null;

  if (billing && billing.userId !== authUser.profile.id) {
    return NextResponse.json(
      { message: "This billing record belongs to a different user." },
      { status: 403 },
    );
  }

  const orderNotes = getNotesObject(order?.notes);
  const notesUserId = asTrimmedString(orderNotes.userId);
  const notesPlanId = asPlanId(orderNotes.planId);
  const orderBelongsToUser =
    (billing && billing.userId === authUser.profile.id) ||
    (notesUserId && notesUserId === authUser.profile.id);
  const refundedAmountPaise = Number(payment?.amount_refunded || 0);
  const paymentAmountPaise = Number(payment?.amount || order?.amount || billing?.amountPaise || 0);

  if (orderId && orderBelongsToUser && refundedAmountPaise >= paymentAmountPaise && paymentAmountPaise > 0) {
    return NextResponse.json({
      reconciled: false,
      resolution: "This order was fully refunded, so the plan will not be activated.",
      orderStatus: order?.status || "",
      paymentStatus: payment?.status || "",
      orderId,
      paymentId: asTrimmedString(payment?.id) || suppliedPaymentId,
      usage: getUsageMeta(authUser.profile),
    });
  }

  if (orderId && orderBelongsToUser && refundedAmountPaise > 0) {
    return NextResponse.json({
      reconciled: false,
      resolution: "This payment has refund activity. Use the TamGam billing support flow before reactivating it.",
      orderStatus: order?.status || "",
      paymentStatus: payment?.status || "",
      orderId,
      paymentId: asTrimmedString(payment?.id) || suppliedPaymentId,
      usage: getUsageMeta(authUser.profile),
    });
  }

  if (orderId && orderBelongsToUser && (order?.status === "paid" || payment?.status === "captured")) {
    const resolvedPlanId = billing?.planId || notesPlanId;

    if (!resolvedPlanId) {
      return NextResponse.json(
        { message: "The order is paid, but the plan metadata is missing." },
        { status: 409 },
      );
    }

    const updatedProfile = await activatePlanForUser({
      userId: authUser.profile.id,
      planId: resolvedPlanId,
      orderId,
      paymentId: asTrimmedString(payment?.id) || suppliedPaymentId,
      amountPaise: Number(payment?.amount || order?.amount || billing?.amountPaise || 0),
    });

    return NextResponse.json({
      reconciled: true,
      resolution: "Plan activated from verified paid order.",
      usage: getUsageMeta(updatedProfile),
      orderStatus: order?.status || "",
      paymentStatus: payment?.status || "",
      orderId,
      paymentId: asTrimmedString(payment?.id) || suppliedPaymentId,
    });
  }

  if (orderId && orderBelongsToUser && payment?.status === "authorized") {
    await updateBillingRecordByOrderId({
      orderId,
      paymentId: asTrimmedString(payment.id),
      status: "authorized",
      amountPaise: Number(payment.amount || billing?.amountPaise || 0),
    });

    return NextResponse.json({
      reconciled: false,
      resolution: "Payment is authorized but not captured yet, so the plan is not activated.",
      orderStatus: order?.status || "",
      paymentStatus: payment?.status || "",
      orderId,
      paymentId: asTrimmedString(payment.id),
      usage: getUsageMeta(authUser.profile),
    });
  }

  if (!orderId && payment?.id) {
    const candidate = await findRecentPendingBillingForUserByAmount({
      userId: authUser.profile.id,
      amountPaise: Number(payment.amount || 0),
      withinMinutes: 180,
    });

    return NextResponse.json({
      reconciled: false,
      resolution:
        "Payment exists on Razorpay but is not linked to an order, so TamGam cannot auto-activate it safely.",
      paymentStatus: payment.status || "",
      paymentId: payment.id,
      orderId: "",
      possiblePendingOrderId: candidate?.orderId || "",
      usage: getUsageMeta(authUser.profile),
    });
  }

  return NextResponse.json({
    reconciled: false,
    resolution: "No paid order linked to this user was found yet.",
    orderStatus: order?.status || "",
    paymentStatus: payment?.status || "",
    orderId,
    paymentId: asTrimmedString(payment?.id) || suppliedPaymentId,
    usage: getUsageMeta(authUser.profile),
  });
}
