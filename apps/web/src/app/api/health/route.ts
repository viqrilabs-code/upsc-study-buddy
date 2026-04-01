import { NextResponse } from "next/server";
import { getPersistentStoreMode } from "@/lib/app-db";
import { isGoogleAuthConfigured } from "@/lib/auth";
import { getFirestoreInitMode, isFirestoreConfigured } from "@/lib/firestore-admin";
import { createRequestLogger } from "@/lib/logger";
import { isRazorpayConfigured } from "@/lib/razorpay";
import { isLocalJsonStoreAllowed, isProductionRuntime } from "@/lib/runtime-config";

export function GET(request: Request) {
  const logger = createRequestLogger("api/health", request);
  const production = isProductionRuntime();
  const storageMode = getPersistentStoreMode();
  const firestoreMode = getFirestoreInitMode();
  const productionReady = !production || storageMode === "firestore";

  if (!productionReady) {
    logger.warn("health.not_ready", {
      storageMode,
      firestoreMode,
      production,
    });
  }

  return NextResponse.json(
    {
      ok: productionReady,
      backend: "enabled",
      environment: production ? "production" : "development",
      storageMode,
      firestoreConfigured: isFirestoreConfigured(),
      firestoreInitMode: firestoreMode,
      localJsonFallbackAllowed: isLocalJsonStoreAllowed(),
      openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
      googleAuthConfigured: isGoogleAuthConfigured(),
      nextAuthUrlConfigured: Boolean(process.env.NEXTAUTH_URL),
      nextAuthSecretConfigured: Boolean(process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET),
      razorpayConfigured: isRazorpayConfigured(),
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      productionReady,
    },
    {
      status: productionReady ? 200 : 503,
    },
  );
}
