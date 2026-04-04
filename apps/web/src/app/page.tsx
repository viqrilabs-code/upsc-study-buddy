import { ArrowRight, Flame, ShieldCheck, Sparkles } from "lucide-react";
import { AuthActions } from "@/components/auth-actions";
import { BrandMark } from "@/components/brand-mark";
import { buildMetadata } from "@/lib/metadata";
import {
  featureCards,
  homeStats,
  landingHighlights,
  landingPunch,
  marketingLine,
  pricingPlans,
} from "@/lib/site";

export const metadata = buildMetadata({
  title: "Home",
  description:
    "TamGam is a UPSC study companion with Google sign-in, feature-specific free trials, saved reports, weakness-aware practice, and paid access for the full workspace.",
});

export default function HomePage() {
  return (
    <section className="container-shell py-8 md:py-12">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="glass-panel reveal-up relative overflow-hidden rounded-[2.4rem] px-6 py-8 md:px-10 md:py-12">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,_rgba(240,123,23,0.18),_transparent_58%)]" />
          <BrandMark />
          <p className="mt-8 font-mono text-xs uppercase tracking-[0.3em] text-gold-strong">
            {marketingLine.eyebrow}
          </p>
          <h1 className="mt-5 max-w-4xl editorial-title text-5xl leading-[0.95] text-ink md:text-7xl">
            {marketingLine.title}
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-copy md:text-xl">
            {marketingLine.description}
          </p>

          <div className="mt-8 grid gap-3">
            {landingPunch.map((line) => (
              <div key={line} className="flex items-center gap-3 text-base font-semibold text-ink">
                <Flame className="text-gold-strong" size={18} />
                {line}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {homeStats.map((item) => (
              <div
                key={item.label}
                className="rounded-full border border-border-subtle bg-white/80 px-4 py-2 text-sm text-ink"
              >
                <span className="font-semibold">{item.value}</span>
                <span className="ml-2 text-copy">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 max-w-3xl text-sm leading-7 text-copy">{marketingLine.proof}</div>
        </section>

        <aside className="glass-panel reveal-up rounded-[2.4rem] p-6 md:p-8">
          <div className="rounded-[1.8rem] border border-[#f07b17]/14 bg-[linear-gradient(180deg,rgba(255,245,234,0.94),rgba(255,255,255,0.88))] p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#18130f] text-[#fff7ef]">
                <ShieldCheck size={22} />
              </div>
              <div>
                <div className="text-lg font-semibold text-ink">Sign in or create account</div>
                <div className="text-sm text-copy">Google sign-in powers the saved workspace.</div>
              </div>
            </div>

            <div className="mt-6">
              <AuthActions compact />
            </div>

            <div className="mt-6 rounded-[1.4rem] border border-border-subtle bg-white/82 p-4">
              <div className="text-sm font-semibold text-ink">What gets saved</div>
              <ul className="mt-3 grid gap-2 text-sm text-copy">
                <li>User profile and plan status</li>
                <li>Prelims and Mains reports</li>
                <li>Strength and weakness signals</li>
                <li>Session ratings and short feedback</li>
              </ul>
            </div>
          </div>

          <div className="mt-5 rounded-[1.8rem] border border-border-subtle bg-white/80 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Sparkles size={16} className="text-gold-strong" />
              Free before payment
            </div>
            <div className="mt-3 grid gap-3 text-sm leading-7 text-copy">
              {landingHighlights.map((item) => (
                <div key={item} className="rounded-[1.2rem] bg-[#f8f2eb] px-4 py-3">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-4">
        {featureCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.title}
              className={`surface-panel rounded-[2rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.8))] p-6`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#18130f] text-[#fff7ef]">
                <Icon size={22} />
              </div>
              <div className="mt-5 font-mono text-xs uppercase tracking-[0.22em] text-gold-strong">
                {card.eyebrow}
              </div>
              <h2 className="mt-3 text-xl font-semibold leading-8 text-ink">{card.title}</h2>
              <p className="mt-3 text-sm leading-7 text-copy">{card.description}</p>
            </article>
          );
        })}
      </div>

      <div className="mt-8 glass-panel rounded-[2.4rem] p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.26em] text-gold-strong">
              Plans
            </div>
            <h2 className="mt-3 editorial-title text-4xl leading-tight text-ink md:text-5xl">
              Start free, then pick the rhythm that matches the preparation season.
            </h2>
          </div>
          <a href="/pricing" className="button-secondary">
            See full pricing
            <ArrowRight size={18} />
          </a>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <article
              key={plan.name}
              className={`rounded-[2rem] border p-6 ${
                plan.featured
                  ? "border-[#f07b17]/30 bg-[linear-gradient(180deg,rgba(255,244,233,0.98),rgba(255,255,255,0.9))]"
                  : "border-border-subtle bg-white/82"
              }`}
            >
              <div className="text-base font-semibold text-ink">{plan.name}</div>
              <div className="mt-3 editorial-title text-4xl text-ink">
                {plan.price}
                <span className="ml-2 text-base font-sans text-copy">{plan.cadence}</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-copy">{plan.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
