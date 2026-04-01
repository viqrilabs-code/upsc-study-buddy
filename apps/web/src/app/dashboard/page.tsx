import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { CircleGauge, FileChartColumnIncreasing, Star, Target } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { SectionShell } from "@/components/section-shell";
import { getOrCreateUserProfile, listRecentReports } from "@/lib/app-db";
import { authOptions } from "@/lib/auth";
import { buildMetadata } from "@/lib/metadata";
import { pageDescriptions } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Dashboard",
  description: pageDescriptions.dashboard,
});

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/");
  }

  const profile = await getOrCreateUserProfile({
    id: session.user.id || session.user.email,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
  });
  const reports = await listRecentReports(profile.id, 6);

  return (
    <>
      <PageHero
        eyebrow="Saved performance memory"
        title="A report-backed dashboard that keeps the next session honest."
        description="TamGam saves mains and prelims reports, updates weak spots after each evaluation, and uses that memory to shape later questions."
        primaryHref="/app"
        primaryLabel="Open workspace"
        secondaryHref="/pricing"
        secondaryLabel="View plans"
      />

      <SectionShell eyebrow="Profile state" title="What TamGam is actively tracking for this user.">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Plan",
              value: profile.plan.toUpperCase(),
              detail: profile.subscriptionStatus === "active" ? "Paid access active" : "Free trial / inactive",
              icon: CircleGauge,
            },
            {
              label: "Recent reports",
              value: String(reports.length),
              detail: "Latest stored Mains and Prelims evaluations.",
              icon: FileChartColumnIncreasing,
            },
            {
              label: "Top strengths",
              value: String(profile.strengths.length),
              detail: "Signals reused while building later questions.",
              icon: Target,
            },
            {
              label: "Average rating",
              value: profile.feedbackCount ? String(profile.averageRating) : "N/A",
              detail: "Captured from session feedback submissions.",
              icon: Star,
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <article key={item.label} className="glass-panel rounded-[1.8rem] p-5">
                <Icon className="text-gold-strong" size={20} />
                <div className="mt-4 font-mono text-xs uppercase tracking-[0.24em] text-copy">
                  {item.label}
                </div>
                <div className="mt-3 editorial-title text-5xl text-ink">{item.value}</div>
                <p className="mt-3 text-sm leading-7 text-copy">{item.detail}</p>
              </article>
            );
          })}
        </div>
      </SectionShell>

      <SectionShell
        eyebrow="Weakness memory"
        title="The signals that now influence question design."
        description="These are saved in the database and fed back into later study, Mains, and Prelims prompts."
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="glass-panel rounded-[2rem] p-6">
            <div className="text-lg font-semibold text-ink">Strengths</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.strengths.length ? (
                profile.strengths.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-[#f07b17]/18 bg-[#fff4ea] px-3 py-1 text-sm font-semibold text-[#d96200]"
                  >
                    {item}
                  </span>
                ))
              ) : (
                <div className="text-sm text-copy">No saved strengths yet. Complete a report first.</div>
              )}
            </div>
          </section>

          <section className="glass-panel rounded-[2rem] p-6">
            <div className="text-lg font-semibold text-ink">Weaknesses</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.weaknesses.length ? (
                profile.weaknesses.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-[#151311]/10 bg-white px-3 py-1 text-sm font-semibold text-ink"
                  >
                    {item}
                  </span>
                ))
              ) : (
                <div className="text-sm text-copy">No saved weaknesses yet. Complete a report first.</div>
              )}
            </div>
          </section>
        </div>
      </SectionShell>

      <SectionShell
        eyebrow="Recent reports"
        title="Saved results from recent Mains and Prelims work."
        description="Only user reports and performance signals are stored. Raw uploads are not the long-term record."
      >
        <div className="grid gap-4">
          {reports.length ? (
            reports.map((report) => (
              <article key={report.id} className="surface-panel rounded-[1.7rem] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-[#18130f] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#fff7ef]">
                      {report.mode}
                    </span>
                    <span className="text-sm font-semibold text-ink">{report.subject}</span>
                    <span className="text-sm text-copy">{report.topic || "General focus"}</span>
                  </div>
                  <div className="text-sm font-semibold text-ink">{report.score}</div>
                </div>
                <p className="mt-3 text-sm leading-7 text-copy">{report.verdict}</p>
              </article>
            ))
          ) : (
            <div className="glass-panel rounded-[2rem] p-6 text-sm leading-7 text-copy">
              No reports are saved yet. Complete a Mains or Prelims practice run and the dashboard
              will start building the user memory from there.
            </div>
          )}
        </div>
      </SectionShell>
    </>
  );
}
