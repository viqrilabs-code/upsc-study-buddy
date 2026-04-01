import { Compass, Flag, Layers3, ShieldCheck } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { SectionShell } from "@/components/section-shell";
import { buildMetadata } from "@/lib/metadata";
import { pageDescriptions } from "@/lib/site";

export const metadata = buildMetadata({
  title: "About",
  description: pageDescriptions.about,
});

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About the product"
        title="A UPSC platform built around rhythm, clarity, and report memory."
        description="TamGam is designed as a serious preparation operating system: one that reduces study drift, respects exam patterns, and keeps aspirants moving through their weak areas with less friction."
        primaryHref="/pricing"
        primaryLabel="See the plans"
        secondaryHref="/contact"
        secondaryLabel="Talk to us"
      />

      <SectionShell
        eyebrow="What we optimize for"
        title="The product is designed to feel calmer than coaching chaos."
        description="We care about how preparation actually feels over months: too many tabs, too much current affairs noise, weak revision discipline, and not enough exam-grounded feedback."
      >
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              icon: Compass,
              title: "Clarity",
              description: "Users should always know the next best study action.",
            },
            {
              icon: Flag,
              title: "Exam grounding",
              description: "PYQs and benchmark datasets stay at the center of practice.",
            },
            {
              icon: Layers3,
              title: "Long-term memory",
              description: "Saved notes, reports, and revision queues matter as much as generation.",
            },
            {
              icon: ShieldCheck,
              title: "Trust",
              description: "Legal pages, privacy boundaries, and transparent flows are part of the product.",
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.title} className="surface-panel rounded-[1.75rem] p-5">
                <Icon className="text-navy" size={22} />
                <h2 className="mt-4 text-xl font-semibold text-navy">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-copy">{item.description}</p>
              </div>
            );
          })}
        </div>
      </SectionShell>
    </>
  );
}
