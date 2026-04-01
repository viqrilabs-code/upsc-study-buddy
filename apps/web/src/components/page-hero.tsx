import Link from "next/link";
import { MoveRight } from "lucide-react";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export function PageHero({
  eyebrow,
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: PageHeroProps) {
  return (
    <section className="container-shell pt-14 pb-8 md:pt-20 md:pb-12">
      <div className="glass-panel reveal-up relative overflow-hidden rounded-[2rem] px-6 py-10 md:px-10 md:py-14">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,_rgba(200,156,77,0.24),_transparent_50%)]" />
        <p className="relative mb-4 font-mono text-xs uppercase tracking-[0.28em] text-gold-strong">
          {eyebrow}
        </p>
        <h1 className="relative max-w-4xl editorial-title text-5xl leading-[0.95] text-navy md:text-7xl">
          {title}
        </h1>
        <p className="relative mt-6 max-w-3xl text-lg leading-8 text-copy md:text-xl">
          {description}
        </p>
        {primaryHref || secondaryHref ? (
          <div className="relative mt-8 flex flex-col gap-3 sm:flex-row">
            {primaryHref && primaryLabel ? (
              <Link href={primaryHref} className="button-primary">
                {primaryLabel}
                <MoveRight size={18} />
              </Link>
            ) : null}
            {secondaryHref && secondaryLabel ? (
              <Link href={secondaryHref} className="button-secondary">
                {secondaryLabel}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
