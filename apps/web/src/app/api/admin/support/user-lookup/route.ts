import { NextResponse } from "next/server";
import {
  findUserProfileByEmail,
  listBillingRecordsForUser,
  listRecentFeedbackForUser,
  listRecentReports,
  listRefundRecordsForUser,
} from "@/lib/app-db";
import { isBillingAdminEmail } from "@/lib/billing-admin";
import { getAuthenticatedAppUser } from "@/lib/product-access";

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function buildIssueSignals(input: {
  profileFound: boolean;
  subscriptionStatus?: string;
  billingStatuses: string[];
  refundStatuses: string[];
}) {
  const issues: string[] = [];

  if (!input.profileFound) {
    issues.push("No TamGam workspace profile found. The user may not have completed Google sign-in yet.");
  }

  if (input.billingStatuses.includes("pending")) {
    issues.push("There is at least one pending billing record that may need reconciliation.");
  }

  if (input.billingStatuses.includes("authorized")) {
    issues.push("There is an authorized payment that was not fully captured yet.");
  }

  if (input.billingStatuses.includes("failed")) {
    issues.push("A failed payment exists in the billing history.");
  }

  if (input.billingStatuses.includes("refunded")) {
    issues.push("A full refund exists on this account, so paid access may have been revoked.");
  }

  if (input.refundStatuses.includes("pending")) {
    issues.push("A refund is still pending on Razorpay and has not settled yet.");
  }

  if (input.subscriptionStatus !== "active" && input.billingStatuses.includes("paid")) {
    issues.push("A paid order exists, but the user subscription is not active. Reconciliation may be needed.");
  }

  return issues;
}

export async function POST(request: Request) {
  const authUser = await getAuthenticatedAppUser();

  if (!authUser) {
    return NextResponse.json({ message: "Sign in to open admin support." }, { status: 401 });
  }

  if (!isBillingAdminEmail(authUser.profile.email)) {
    return NextResponse.json(
      { message: "Admin support tools are restricted to TamGam billing admins." },
      { status: 403 },
    );
  }

  const payload = (await request.json()) as {
    email?: unknown;
  };
  const email = asTrimmedString(payload.email).toLowerCase();

  if (!email) {
    return NextResponse.json({ message: "Enter a user email to inspect." }, { status: 400 });
  }

  const profile = await findUserProfileByEmail(email);

  if (!profile) {
    return NextResponse.json({
      ok: true,
      userFound: false,
      email,
      issues: buildIssueSignals({
        profileFound: false,
        billingStatuses: [],
        refundStatuses: [],
      }),
    });
  }

  const [reports, billing, refunds, feedback] = await Promise.all([
    listRecentReports(profile.id, 6),
    listBillingRecordsForUser(profile.id, 10),
    listRefundRecordsForUser(profile.id, 10),
    listRecentFeedbackForUser(profile.id, 6),
  ]);

  const issues = buildIssueSignals({
    profileFound: true,
    subscriptionStatus: profile.subscriptionStatus,
    billingStatuses: billing.map((entry) => entry.status),
    refundStatuses: refunds.map((entry) => entry.status),
  });

  return NextResponse.json({
    ok: true,
    userFound: true,
    email,
    profile,
    reports,
    billing,
    refunds,
    feedback,
    issues,
  });
}

