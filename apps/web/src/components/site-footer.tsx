import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { companyNav } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border-subtle/70 bg-[#f4ebdf]">
      <div className="container-shell grid gap-6 py-8 md:grid-cols-[1.1fr_0.9fr] md:items-end">
        <div className="grid gap-4">
          <BrandMark compact />
          <p className="max-w-2xl text-sm leading-7 text-copy">
            TamGam is a proprietary product of Viqri Labs Private Limited. The platform stores only
            user information, saved reports, strengths, weaknesses, subscription state, and
            feedback required to personalize the study loop.
          </p>
          <div className="text-xs uppercase tracking-[0.22em] text-copy">
            Copyright 2026 Viqri Labs Private Limited
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-copy md:justify-end">
          {companyNav.map((item) => (
            <Link key={item.href} href={item.href} className="transition-colors hover:text-ink">
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
