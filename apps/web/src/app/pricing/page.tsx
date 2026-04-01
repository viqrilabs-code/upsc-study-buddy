import { Check } from "lucide-react";
import { BillingReconcileCard } from "@/components/billing-reconcile-card";
import { BillingRefundCard } from "@/components/billing-refund-card";
import { PlanCheckoutButton } from "@/components/plan-checkout-button";
import { PageHero } from "@/components/page-hero";
import { SectionShell } from "@/components/section-shell";
import { isBillingAdminEmail } from "@/lib/billing-admin";
import { buildMetadata } from "@/lib/metadata";
import { getAuthenticatedAppUser } from "@/lib/product-access";
import { faqItems, pageDescriptions, pricingPlans } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Pricing",
  description: pageDescriptions.pricing,
});

export default async function PricingPage() {
  const authUser = await getAuthenticatedAppUser();
  const showAdminRefundTools = isBillingAdminEmail(authUser?.profile.email);

  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title="Simple pricing for a serious daily UPSC loop."
        description="TamGam gives 3 free turns, keeps current affairs free, and unlocks the full memory-driven workspace on paid plans."
        primaryHref="/app"
        primaryLabel="Open workspace"
        secondaryHref="/help"
        secondaryLabel="Read FAQs"
      />

      <SectionShell
        eyebrow="Plans"
        title="Start lean, then grow into deeper preparation."
        description="The product is priced around daily usage, not bloated coaching-style bundles."
      >
        <div className="mb-6 rounded-[1.75rem] border border-pine/20 bg-pine/8 px-5 py-4 text-sm text-pine">
          Current affairs is free for all users. Paid plans unlock the full AI study, Mains, Prelims, saved reports, and feedback memory.
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <article
              key={plan.name}
              className={`rounded-[2rem] p-[1px] ${
                plan.featured
                  ? "bg-[linear-gradient(135deg,rgba(18,34,61,0.85),rgba(200,156,77,0.8))]"
                  : "surface-panel"
              }`}
            >
              <div
                className={`h-full rounded-[calc(2rem-1px)] p-6 ${
                  plan.featured ? "bg-[#13233f] text-sand" : "bg-white/88 text-navy"
                }`}
              >
                <div className="font-mono text-xs uppercase tracking-[0.24em]">
                  {plan.featured ? "Most recommended" : "Built for focus"}
                </div>
                <h2 className="mt-4 text-3xl font-semibold">{plan.name}</h2>
                <div className="mt-5 flex items-end gap-2">
                  <div className="editorial-title text-5xl">{plan.price}</div>
                  <div className={plan.featured ? "text-sand/70" : "text-copy"}>{plan.cadence}</div>
                </div>
                <p className={`mt-4 text-sm leading-7 ${plan.featured ? "text-sand/78" : "text-copy"}`}>
                  {plan.description}
                </p>
                <ul className="mt-6 grid gap-3 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className={plan.featured ? "text-gold" : "text-pine"} size={18} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <PlanCheckoutButton
                    planId={plan.planId}
                    label={plan.featured ? "Start monthly plan" : `Choose ${plan.name}`}
                    className={plan.featured ? "button-primary w-full" : "button-secondary w-full"}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      </SectionShell>

      <SectionShell eyebrow="FAQs" title="Pricing questions users usually ask before committing.">
        <div className="grid gap-4">
          {faqItems.map((item) => (
            <details key={item.question} className="surface-panel rounded-[1.5rem] p-5">
              <summary className="cursor-pointer text-lg font-semibold text-navy">
                {item.question}
              </summary>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-copy">{item.answer}</p>
            </details>
          ))}
        </div>
      </SectionShell>

      <SectionShell
        eyebrow="Resolver"
        title="If payment succeeds but the plan stays inactive, verify it here."
        description="This checks the live Razorpay state against the saved TamGam billing record and explains what happened."
      >
        <BillingReconcileCard />
      </SectionShell>

      {showAdminRefundTools ? (
        <SectionShell
          eyebrow="Refunds"
          title="Admin refund workflow"
          description="This action creates a Razorpay refund, stores the refund ledger inside TamGam, and revokes paid access automatically once a full refund settles."
        >
          <BillingRefundCard />
        </SectionShell>
      ) : null}
    </>
  );
}
