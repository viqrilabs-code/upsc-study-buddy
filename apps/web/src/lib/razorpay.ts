import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";

let razorpayClient: Razorpay | null = null;

export function isRazorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function getRazorpayClient() {
  if (!isRazorpayConfigured()) {
    throw new Error("Razorpay is not configured.");
  }

  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID as string,
      key_secret: process.env.RAZORPAY_KEY_SECRET as string,
    });
  }

  return razorpayClient;
}

export function verifyRazorpayPaymentSignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const secret = process.env.RAZORPAY_KEY_SECRET;

  if (!secret) {
    return false;
  }

  const generated = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");

  return timingSafeEqual(Buffer.from(generated), Buffer.from(signature));
}

export function verifyRazorpayWebhookSignature({
  payload,
  signature,
  secret,
}: {
  payload: string;
  signature: string;
  secret: string;
}) {
  const generated = createHmac("sha256", secret).update(payload).digest("hex");

  return timingSafeEqual(Buffer.from(generated), Buffer.from(signature));
}

export function getRazorpayPublicKey() {
  return process.env.RAZORPAY_KEY_ID || "";
}
