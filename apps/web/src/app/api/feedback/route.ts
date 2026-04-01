import { NextResponse } from "next/server";
import { saveSessionFeedback } from "@/lib/app-db";
import { getAuthenticatedAppUser } from "@/lib/product-access";

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const authUser = await getAuthenticatedAppUser();

  if (!authUser) {
    return NextResponse.json({ message: "Sign in to submit feedback." }, { status: 401 });
  }

  const payload = (await request.json()) as {
    sessionKey?: unknown;
    sessionType?: unknown;
    subject?: unknown;
    rating?: unknown;
    feedback?: unknown;
  };

  const sessionKey = asTrimmedString(payload.sessionKey);
  const sessionType = asTrimmedString(payload.sessionType) || "general";
  const subject = asTrimmedString(payload.subject) || "General";
  const rating = Number(payload.rating);
  const feedback = asTrimmedString(payload.feedback);

  if (!sessionKey) {
    return NextResponse.json({ message: "Session key is required." }, { status: 400 });
  }

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ message: "Rating must be between 1 and 5." }, { status: 400 });
  }

  await saveSessionFeedback({
    userId: authUser.profile.id,
    sessionKey,
    sessionType,
    subject,
    rating,
    feedback,
  });

  return NextResponse.json({ ok: true });
}
