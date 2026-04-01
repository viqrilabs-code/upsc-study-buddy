import { PageHero } from "@/components/page-hero";
import { SectionShell } from "@/components/section-shell";
import { buildMetadata } from "@/lib/metadata";
import { legalSummary, pageDescriptions } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Terms",
  description: pageDescriptions.terms,
});

export default function TermsPage() {
  return (
    <>
      <PageHero
        eyebrow="Terms and conditions"
        title="Clear terms for platform use, content handling, and account responsibilities."
        description="These terms exist to keep the product useful, lawful, and fair while the platform evolves into a full preparation system."
      />

      <SectionShell eyebrow="Terms summary" title="The practical rules behind the product.">
        <div className="glass-panel prose-rich rounded-[2rem] p-6 md:p-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl">1. Platform use</h2>
              <p>
                TamGam is an educational product for guided preparation. It does not
                guarantee ranks, cut-offs, or final examination outcomes.
              </p>
            </div>
            <div>
              <h2 className="text-3xl">2. Account responsibilities</h2>
              <p>
                Users are responsible for protecting login credentials, ensuring lawful use of
                uploads, and avoiding misuse of the product for prohibited or harmful activity.
              </p>
            </div>
            <div>
              <h2 className="text-3xl">3. Content boundaries</h2>
              <ul>
                {legalSummary.terms.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </SectionShell>
    </>
  );
}
