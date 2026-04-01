import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getProjectIdFromEnv() {
  return (
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    ""
  ).trim();
}

export function hasFirestoreServiceAccountEnv() {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );
}

export function getFirestoreInitMode() {
  if (hasFirestoreServiceAccountEnv()) {
    return "service-account";
  }

  if (getProjectIdFromEnv()) {
    return "application-default";
  }

  return "missing";
}

export function isFirestoreConfigured() {
  return getFirestoreInitMode() !== "missing";
}

export function getAdminFirestore() {
  const mode = getFirestoreInitMode();

  if (mode === "missing") {
    return null;
  }

  if (!getApps().length) {
    if (mode === "service-account") {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      });
    } else {
      initializeApp({
        credential: applicationDefault(),
        ...(getProjectIdFromEnv() ? { projectId: getProjectIdFromEnv() } : {}),
      });
    }
  }

  return getFirestore();
}
