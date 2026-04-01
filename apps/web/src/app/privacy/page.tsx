import { PageHero } from "@/components/page-hero";
import { SectionShell } from "@/components/section-shell";
import { buildMetadata } from "@/lib/metadata";
import { legalSummary, pageDescriptions } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Privacy",
  description: pageDescriptions.privacy,
});

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        eyebrow="Privacy policy"
        title="Data boundaries that match the promises in the product."
        description="The platform is designed to persist user profiles, progress, and reports while avoiding long-term storage of raw uploads and generated test papers."
      />

      <SectionShell eyebrow="Policy overview" title="How privacy is handled inside the platform.">
        <div className="glass-panel prose-rich rounded-[2rem] p-6 md:p-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl">1. What we collect</h2>
              <p>
                We collect account details, subject preferences, usage events, progress metrics,
                generated reports, workspace metadata, and support interactions needed to operate
                the product.
              </p>
            </div>
            <div>
              <h2 className="text-3xl">2. What we avoid storing</h2>
              <ul>
                {legalSummary.privacy.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-3xl">3. Temporary processing</h2>
              <p>
                Handwritten uploads and similar materials may be processed temporarily for OCR or
                evaluation, then discarded according to the platform&apos;s short-lived operational
                window unless a retry flow requires brief retention.
              </p>
            </div>
          </div>
        </div>
      </SectionShell>
    </>
  );
}
