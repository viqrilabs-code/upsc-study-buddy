import { NextResponse } from "next/server";
import { activatePlanForUser } from "@/lib/app-db";
import { createRequestLogger } from "@/lib/logger";
import { planCatalog, type PlanId } from "@/lib/plans";
import { getAuthenticatedAppUser, getUsageMeta } from "@/lib/product-access";
import { verifyRazorpayPaymentSignature } from "@/lib/razorpay";

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const logger = createRequestLogger("api/billing/verify", request);
  try {
    const authUser = await getAuthenticatedAppUser();

    if (!authUser) {
      logger.warn("billing.verify.rejected", { reason: "unauthenticated" });
      return NextResponse.json({ message: "Sign in to verify payment." }, { status: 401 });
    }

    const payload = (await request.json()) as {
      planId?: unknown;
      razorpay_order_id?: unknown;
      razorpay_payment_id?: unknown;
      razorpay_signature?: unknown;
    };

    const planId = asTrimmedString(payload.planId) as PlanId;
    const orderId = asTrimmedString(payload.razorpay_order_id);
    const paymentId = asTrimmedString(payload.razorpay_payment_id);
    const signature = asTrimmedString(payload.razorpay_signature);
    const plan = planCatalog[planId];

    if (!plan || plan.id === "free") {
      logger.warn("billing.verify.rejected", {
        reason: "invalid_plan",
        userId: authUser.profile.id,
        planId,
      });
      return NextResponse.json({ message: "Invalid plan selection." }, { status: 400 });
    }

    if (!orderId || !paymentId || !signature) {
      logger.warn("billing.verify.rejected", {
        reason: "incomplete_payload",
        userId: authUser.profile.id,
        planId,
        hasOrderId: Boolean(orderId),
        hasPaymentId: Boolean(paymentId),
        hasSignature: Boolean(signature),
      });
      return NextResponse.json({ message: "Payment verification payload is incomplete." }, { status: 400 });
    }

    const verified = verifyRazorpayPaymentSignature({
      orderId,
      paymentId,
      signature,
    });

    if (!verified) {
      logger.warn("billing.verify.rejected", {
        reason: "signature_failed",
        userId: authUser.profile.id,
        planId,
        orderId,
        paymentId,
      });
      return NextResponse.json({ message: "Payment signature verification failed." }, { status: 400 });
    }

    const profile = await activatePlanForUser({
      userId: authUser.profile.id,
      planId: plan.id,
      orderId,
      paymentId,
      amountPaise: plan.amountPaise,
    });

    return NextResponse.json({
      ok: true,
      usage: getUsageMeta(profile),
    });
  } catch (error) {
    logger.error("billing.verify.failed", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to verify the Razorpay payment right now.",
      },
      { status: 500 },
    );
  }
}
