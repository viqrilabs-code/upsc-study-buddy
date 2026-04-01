import { redirect } from "next/navigation";
import { AlertCircle, CreditCard, Database, ShieldCheck } from "lucide-react";
import { AdminCurrentAffairsUploadCard } from "@/components/admin-current-affairs-upload-card";
import { AdminUserLookupCard } from "@/components/admin-user-lookup-card";
import { BillingReconcileCard } from "@/components/billing-reconcile-card";
import { BillingRefundCard } from "@/components/billing-refund-card";
import { PageHero } from "@/components/page-hero";
import { SectionShell } from "@/components/section-shell";
import { getBillingAdminCount, isBillingAdminEmail } from "@/lib/billing-admin";
import { getPersistentStoreMode } from "@/lib/app-db";
import { isGoogleAuthConfigured } from "@/lib/auth";
import { getLatestAdminCurrentAffairsPack } from "@/lib/current-affairs-pack";
import { getFirestoreInitMode } from "@/lib/firestore-admin";
import { buildMetadata } from "@/lib/metadata";
import { getAuthenticatedAppUser } from "@/lib/product-access";
import { getRazorpayPublicKey, isRazorpayConfigured } from "@/lib/razorpay";
import { isLocalJsonStoreAllowed, isProductionRuntime } from "@/lib/runtime-config";
import { pageDescriptions } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Admin Support",
  description: pageDescriptions.admin,
});

export default async function AdminPage() {
  const authUser = await getAuthenticatedAppUser();

  if (!authUser) {
    redirect("/");
  }

  if (!isBillingAdminEmail(authUser.profile.email)) {
    redirect("/app");
  }

  const currentAffairsPack = await getLatestAdminCurrentAffairsPack();
  const production = isProductionRuntime();
  const storageMode = getPersistentStoreMode();
  const firestoreInitMode = getFirestoreInitMode();

  const diagnostics = [
    {
      label: "Google OAuth",
      value: isGoogleAuthConfigured() ? "Ready" : "Missing",
      detail: "Controls sign-in and sign-up via Google.",
      icon: ShieldCheck,
    },
    {
      label: "NextAuth base URL",
      value: process.env.NEXTAUTH_URL || "Missing",
      detail: "Expected callback = /api/auth/callback/google",
      icon: AlertCircle,
    },
    {
      label: "Payments",
      value: isRazorpayConfigured() ? "Razorpay ready" : "Missing keys",
      detail: process.env.RAZORPAY_WEBHOOK_SECRET
        ? `Public key: ${getRazorpayPublicKey()}`
        : "Webhook secret missing",
      icon: CreditCard,
    },
    {
      label: "Storage mode",
      value:
        storageMode === "firestore"
          ? `Firestore (${firestoreInitMode})`
          : storageMode === "local-json"
            ? "Local JSON fallback"
            : "Missing persistent store",
      detail:
        storageMode === "firestore"
          ? `${getBillingAdminCount()} admin email(s) configured`
          : production
            ? "Production is blocked until Firestore is configured."
            : `Dev fallback active. Local JSON allowed = ${isLocalJsonStoreAllowed() ? "yes" : "no"}`,
      icon: Database,
    },
    {
      label: "Production gate",
      value: production ? (storageMode === "firestore" ? "Ready" : "Blocked") : "Development",
      detail: production
        ? "Cloud Run production should use Firestore instead of the local JSON fallback."
        : "Local development can still use the fallback store unless disabled explicitly.",
      icon: AlertCircle,
    },
  ];

  return (
    <>
      <PageHero
        eyebrow="Admin support"
        title="One place to handle TamGam login, signup, billing, and refund issues."
        description="Inspect the user record, verify auth configuration, reconcile missed payments, and issue support-approved refunds without leaving the product."
        primaryHref="/pricing"
        primaryLabel="Open billing tools"
        secondaryHref="/app"
        secondaryLabel="Back to workspace"
      />

      <SectionShell
        eyebrow="Diagnostics"
        title="What the support admin can validate first."
        description={`Signed in as ${authUser.profile.email}. These checks help narrow auth and payment issues before touching a user account.`}
      >
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {diagnostics.map((item) => {
            const Icon = item.icon;

            return (
              <article key={item.label} className="glass-panel rounded-[1.8rem] p-5">
                <Icon className="text-gold-strong" size={20} />
                <div className="mt-4 font-mono text-xs uppercase tracking-[0.24em] text-copy">
                  {item.label}
                </div>
                <div className="mt-3 break-words text-xl font-semibold text-ink">{item.value}</div>
                <p className="mt-3 text-sm leading-7 text-copy">{item.detail}</p>
              </article>
            );
          })}
        </div>
      </SectionShell>

      <SectionShell
        eyebrow="User support"
        title="Find the affected account and inspect the saved state."
        description="This is the quickest path for signup or login complaints because it shows whether the profile exists, whether billing is linked, and whether reports are being saved."
      >
        <AdminUserLookupCard />
      </SectionShell>

      <SectionShell
        eyebrow="Current affairs sources"
        title="Upload the private daily newspaper and magazine pack for Diya."
        description="These files remain admin-only. Users do not see them, but Diya uses them automatically inside current affairs mode."
      >
        <AdminCurrentAffairsUploadCard initialPack={currentAffairsPack} />
      </SectionShell>

      <SectionShell
        eyebrow="Payment recovery"
        title="Resolve payment mismatch before escalating to refund."
        description="Use reconciliation when Razorpay says the payment is done but the TamGam plan still looks inactive."
      >
        <BillingReconcileCard />
      </SectionShell>

      <SectionShell
        eyebrow="Refunds"
        title="Issue a support-approved refund and keep the ledger in sync."
        description="A full refund revokes the linked paid access automatically once Razorpay settles it."
      >
        <BillingRefundCard />
      </SectionShell>
    </>
  );
}
