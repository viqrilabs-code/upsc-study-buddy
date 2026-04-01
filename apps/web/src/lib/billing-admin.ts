function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function getBillingAdminEmails() {
  const raw = process.env.BILLING_ADMIN_EMAILS || "";

  return raw
    .split(",")
    .map((entry) => normalizeEmail(entry))
    .filter(Boolean);
}

export function isBillingAdminEmail(email?: string | null) {
  if (!email) {
    return false;
  }

  return getBillingAdminEmails().includes(normalizeEmail(email));
}

export function getBillingAdminCount() {
  return getBillingAdminEmails().length;
}
