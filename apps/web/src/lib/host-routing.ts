const FALLBACK_PRIMARY_APP_ORIGIN = "https://tamgam.in";

export const FIREBASE_HOSTS = new Set([
  "tamgam-upsc.web.app",
  "tamgam-upsc.firebaseapp.com",
]);

export const REDIRECTABLE_HOSTS = new Set([
  ...FIREBASE_HOSTS,
  "tamgam-web-1052274651199.asia-south1.run.app",
  "tamgam.in",
  "www.tamgam.in",
]);

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function safeOriginFromEnv(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    return trimTrailingSlash(new URL(value).origin);
  } catch {
    return null;
  }
}

export function getServerPrimaryAppOrigin() {
  return (
    safeOriginFromEnv(process.env.PRIMARY_APP_ORIGIN) ||
    safeOriginFromEnv(process.env.NEXTAUTH_URL) ||
    FALLBACK_PRIMARY_APP_ORIGIN
  );
}

export function getClientPrimaryAppOrigin() {
  return (
    safeOriginFromEnv(process.env.NEXT_PUBLIC_PRIMARY_APP_ORIGIN) ||
    FALLBACK_PRIMARY_APP_ORIGIN
  );
}

export function getHostFromOrigin(origin: string) {
  return new URL(origin).host;
}
