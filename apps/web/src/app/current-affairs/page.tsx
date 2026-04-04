import { CalendarRange, Download, Newspaper, ScanText } from "lucide-react";
import { CurrentAffairsStudio } from "@/components/current-affairs-studio";
import { PageHero } from "@/components/page-hero";
import { SectionShell } from "@/components/section-shell";
import { buildMetadata } from "@/lib/metadata";
import { pageDescriptions } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Current Affairs",
  description: pageDescriptions.currentAffairs,
});

export default function CurrentAffairsPage() {
  const digestCards = [
    {
      title: "India-Middle East trade corridor",
      tag: "GS2 + International Relations",
      crux:
        "Watch this as a connectivity and strategic-economy story. For UPSC, the real angle is how trade corridors change India’s diplomacy, energy routes, and maritime influence beyond the neighbourhood.",
    },
    {
      title: "Heat action plans and urban resilience",
      tag: "GS3",
      crux:
        "The issue is not just rising temperature, but whether cities are actually prepared. Link it with disaster readiness, vulnerable populations, public health, and climate-adaptive urban governance.",
    },
    {
      title: "Cooperative federalism in health delivery",
      tag: "GS2",
      crux:
        "Health outcomes depend on how the Centre and states coordinate money, data, and implementation. This becomes important whenever schemes look strong on paper but uneven across states.",
    },
    {
      title: "Ethics lens on administrative accountability",
      tag: "GS4",
      crux:
        "Use this to think beyond rules. UPSC usually rewards answers that connect accountability with integrity, transparency, empathy in service delivery, and the ethical use of public authority.",
    },
  ];

  return (
    <>
      <PageHero
        eyebrow="Current affairs"
        title="Upload the paper, open Diya, and study current affairs article by article."
        description="Start with 3 current-affairs trial turns. Upload The Indian Express and your UPSC magazine, then let Diya turn them into a teacher-student class with one MCQ for every news issue covered."
        primaryHref="#diya-current-affairs"
        primaryLabel="Launch Diya"
        secondaryHref="/notes"
        secondaryLabel="Open 1-pager revision notes"
      />

      <SectionShell
        eyebrow="Today's flow"
        title="From newspaper input to a study artifact."
        description="This page shows how the product treats current affairs as a structured learning pipeline rather than a random reading feed."
      >
        <div className="mb-5 inline-flex items-center rounded-full bg-pine/12 px-4 py-2 text-sm font-semibold text-pine">
          3 free current-affairs turns
        </div>
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="glass-panel rounded-[2rem] p-6 md:p-8">
            <div className="flex items-center gap-3 text-navy">
              <Newspaper size={22} />
              <h2 className="text-2xl font-semibold">Morning digest preview</h2>
            </div>
            <div className="mt-3 text-sm leading-7 text-copy">
              Diya highlights only high-value UPSC issues here. Each card gives the issue in one glance
              and the crux you should carry into Prelims, Mains, and revision.
            </div>
            <div className="mt-5 grid gap-4">
              {digestCards.map((item, index) => (
                <article
                  key={item.title}
                  className="rounded-[1.65rem] border border-border-subtle bg-white/88 p-5 shadow-[0_18px_45px_rgba(17,24,39,0.06)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-[#8a6f46]">
                        News {index + 1}
                      </div>
                      <h3 className="mt-2 text-lg font-semibold text-navy">{item.title}</h3>
                    </div>
                    <span className="rounded-full bg-[#fff4ea] px-3 py-1 text-xs font-semibold text-[#d96200]">
                      {item.tag}
                    </span>
                  </div>

                  <div className="mt-4 rounded-[1.2rem] bg-[linear-gradient(180deg,rgba(251,245,236,0.95),rgba(255,251,246,0.92))] px-4 py-3">
                    <div className="font-mono text-[0.66rem] uppercase tracking-[0.22em] text-[#9a6a2a]">
                      Crux
                    </div>
                    <p className="mt-2 text-sm leading-7 text-copy">{item.crux}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            {[
              {
                icon: Download,
                title: "PDF export",
                description: "Downloadable daily brief with notes and 10 MCQs.",
              },
              {
                icon: ScanText,
                title: "Archive tagging",
                description: "Saved by date, issue, GS paper, and revision relevance.",
              },
              {
                icon: CalendarRange,
                title: "Revision return",
                description: "Digest items can reappear in later revision loops.",
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.title} className="surface-panel rounded-[1.75rem] p-5">
                  <Icon className="text-navy" size={22} />
                  <h3 className="mt-4 text-lg font-semibold text-navy">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-copy">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </SectionShell>

      <SectionShell
        eyebrow="Live studio"
        title="Diya reads the uploaded sources and teaches from them."
        description="Use this class mode for newspaper-led preparation, issue mapping, background context, and article-wise MCQ checks."
      >
        <CurrentAffairsStudio />
      </SectionShell>
    </>
  );
}
