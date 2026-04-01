"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { AuthActions } from "@/components/auth-actions";
import { BrandMark } from "@/components/brand-mark";
import { companyNav, mainNav } from "@/lib/site";

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }

  return pathname.startsWith(href);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle/70 bg-sand/80 backdrop-blur-xl">
      <div className="container-shell flex items-center justify-between gap-5 py-4">
        <BrandMark />

        <nav className="hidden items-center gap-2 lg:flex">
          {mainNav.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-[#18130f] text-[#fff7ef]"
                    : "text-copy hover:bg-white/76 hover:text-ink"
                }`}
              >
                <span>{item.label}</span>
                {item.badge ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.18em] ${
                      active ? "bg-white/12 text-[#fff7ef]" : "bg-[#fff1e3] text-[#d96200]"
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <AuthActions />
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border-subtle bg-white/76 text-ink lg:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Close navigation" : "Open navigation"}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open ? (
        <div className="container-shell pb-5 lg:hidden">
          <div className="glass-panel rounded-[2rem] p-4">
            <div className="grid gap-2">
              {[...mainNav, ...companyNav].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold ${
                    isActive(pathname, item.href) ? "bg-[#18130f] text-[#fff7ef]" : "hover:bg-white/78"
                  }`}
                  onClick={() => setOpen(false)}
                >
                  <span>{item.label}</span>
                  {item.badge ? (
                    <span className="rounded-full bg-[#fff1e3] px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#d96200]">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
            <div className="mt-4 border-t border-border-subtle pt-4">
              <AuthActions compact />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
