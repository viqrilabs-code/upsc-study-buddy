import { NextResponse } from "next/server";
import { createPendingBillingRecord } from "@/lib/app-db";
import { createRequestLogger } from "@/lib/logger";
import { planCatalog, type PlanId, addDays } from "@/lib/plans";
import { getAuthenticatedAppUser } from "@/lib/product-access";
import { getRazorpayClient, getRazorpayPublicKey, isRazorpayConfigured } from "@/lib/razorpay";

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function buildReceipt(planId: PlanId) {
  return `tg_${planId}_${Date.now().toString(36)}`.slice(0, 40);
}

export async function POST(request: Request) {
  const logger = createRequestLogger("api/billing/checkout", request);
  try {
    const authUser = await getAuthenticatedAppUser();

    if (!authUser) {
      logger.warn("billing.checkout.rejected", { reason: "unauthenticated" });
      return NextResponse.json({ message: "Sign in to continue with payment." }, { status: 401 });
    }

    if (!isRazorpayConfigured()) {
      logger.error("billing.checkout.misconfigured", undefined, {
        userId: authUser.profile.id,
      });
      return NextResponse.json(
        { message: "Razorpay is not configured yet. Add the Razorpay env vars first." },
        { status: 500 },
      );
    }

    const payload = (await request.json()) as {
      planId?: unknown;
    };
    const planId = asTrimmedString(payload.planId) as PlanId;
    const plan = planCatalog[planId];

    if (!plan || plan.id === "free") {
      logger.warn("billing.checkout.rejected", {
        reason: "invalid_plan",
        userId: authUser.profile.id,
        planId,
      });
      return NextResponse.json({ message: "Choose a paid plan to continue." }, { status: 400 });
    }

    const razorpay = getRazorpayClient();
    const order = await razorpay.orders.create({
      amount: plan.amountPaise,
      currency: "INR",
      receipt: buildReceipt(plan.id),
      notes: {
        userId: authUser.profile.id,
        planId: plan.id,
        email: authUser.profile.email,
      },
    });

    await createPendingBillingRecord({
      userId: authUser.profile.id,
      planId: plan.id,
      orderId: order.id,
      amountPaise: plan.amountPaise,
      currency: "INR",
      expiresAt: addDays(new Date(), plan.durationDays).toISOString(),
    });

    logger.info("billing.checkout.order_created", {
      userId: authUser.profile.id,
      planId: plan.id,
      orderId: order.id,
      amountPaise: plan.amountPaise,
    });

    return NextResponse.json({
      key: getRazorpayPublicKey(),
      order_id: order.id,
      amount: plan.amountPaise,
      currency: "INR",
      planId: plan.id,
      name: "TamGam",
      description: plan.shortLabel,
      prefill: {
        name: authUser.profile.name,
        email: authUser.profile.email,
      },
      theme: {
        color: "#f07b17",
      },
    });
  } catch (error) {
    logger.error("billing.checkout.failed", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to create a Razorpay order right now.",
      },
      { status: 500 },
    );
  }
}
