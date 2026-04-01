import { NextResponse } from "next/server";
import { createRequestLogger } from "@/lib/logger";

type ContactPayload = {
  name?: unknown;
  email?: unknown;
  topic?: unknown;
  message?: unknown;
};

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const logger = createRequestLogger("api/contact", request);
  const payload = (await request.json()) as ContactPayload;
  const name = asTrimmedString(payload.name);
  const email = asTrimmedString(payload.email);
  const topic = asTrimmedString(payload.topic);
  const message = asTrimmedString(payload.message);

  logger.info("contact.submit.received", {
    topic: topic || "missing",
    hasName: Boolean(name),
    hasEmail: Boolean(email),
    messageLength: message.length,
  });

  if (!name || !email || !topic || !message) {
    logger.warn("contact.submit.rejected", {
      reason: "missing_fields",
      hasName: Boolean(name),
      hasEmail: Boolean(email),
      hasTopic: Boolean(topic),
      hasMessage: Boolean(message),
    });
    return NextResponse.json(
      { message: "Please complete every field before submitting the form." },
      { status: 400 },
    );
  }

  if (!email.includes("@")) {
    logger.warn("contact.submit.rejected", {
      reason: "invalid_email",
    });
    return NextResponse.json(
      { message: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  if (message.length < 20) {
    logger.warn("contact.submit.rejected", {
      reason: "message_too_short",
      messageLength: message.length,
    });
    return NextResponse.json(
      { message: "Please share a bit more detail so the team can help properly." },
      { status: 400 },
    );
  }

  logger.info("contact.submit.accepted", {
    topic,
    messageLength: message.length,
  });

  return NextResponse.json({
    message: "Thanks for reaching out. The team will reply within one business day.",
  });
}
