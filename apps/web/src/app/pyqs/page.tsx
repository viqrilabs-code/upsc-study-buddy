import { BadgeIndianRupee, CalendarArrowUp, Filter, Sparkles, Target } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { SectionShell } from "@/components/section-shell";
import { buildMetadata } from "@/lib/metadata";
import { pageDescriptions } from "@/lib/site";

export const metadata = buildMetadata({
  title: "PYQs",
  description: pageDescriptions.pyqs,
});

export default function PyqsPage() {
  return (
    <>
      <PageHero
        eyebrow="PYQ intelligence"
        title="The exam leaves a trail. This page is where users learn to read it."
        description="PYQs should not sit in a PDF graveyard. They should be indexed by topic, year, paper, difficulty, and pattern so the user can see what UPSC keeps returning to."
        primaryHref="/pricing"
        primaryLabel="Access the PYQ layer"
        secondaryHref="/dashboard"
        secondaryLabel="See benchmarks"
      />

      <SectionShell
        eyebrow="Pattern-first study"
        title="Actual exam behavior before synthetic generation."
        description="Users can browse raw PYQs, see the themes that repeat, then move into generated practice only after the pattern is visible."
      >
        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="glass-panel rounded-[2rem] p-6 md:p-8">
            <div className="flex items-center gap-3 text-navy">
              <Filter size={22} />
              <h2 className="text-2xl font-semibold">Filter wall</h2>
            </div>
            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              {["GS2", "Polity", "2019", "2020", "2023", "High frequency", "Prelims", "Mains"].map(
                (chip) => (
                  <span key={chip} className="rounded-full bg-white/86 px-4 py-2 font-semibold text-navy">
                    {chip}
                  </span>
                ),
              )}
            </div>
            <div className="mt-6 rounded-[1.5rem] bg-navy p-5 text-sand">
              <div className="font-mono text-xs uppercase tracking-[0.24em] text-sand/70">
                Sample insight
              </div>
              <p className="mt-3 text-sm leading-7 text-sand/80">
                Federalism-linked polity questions recur when governance, fiscal relations, and social policy debates intensify. Revision pack generated accordingly.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                icon: CalendarArrowUp,
                title: "Year mapping",
                description: "Track how a theme changes across the last ten UPSC cycles.",
              },
              {
                icon: Target,
                title: "Topic density",
                description: "Identify which syllabus pockets carry the heaviest PYQ weight.",
              },
              {
                icon: Sparkles,
                title: "Guided generation",
                description: "Only generate fresh questions after seeing PYQ evidence.",
              },
              {
                icon: BadgeIndianRupee,
                title: "Exam payoff",
                description: "Measure whether PYQ work is actually improving test outcomes.",
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
    </>
  );
}
