"use client";

import { LogOut, Sparkles } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";

export function AuthActions({ compact = false }: { compact?: boolean }) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="rounded-full border border-border-subtle bg-white/75 px-4 py-2 text-sm text-copy">
        Loading...
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className={`flex ${compact ? "flex-col" : "items-center"} gap-3`}>
        <button type="button" onClick={() => signIn("google", { callbackUrl: "/app" })} className="button-primary">
          <Sparkles size={18} />
          Sign up with Google
        </button>
        {!compact ? (
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/app" })}
            className="rounded-full border border-border-subtle bg-white/78 px-4 py-3 text-sm font-semibold text-ink transition hover:border-[#151311]/22 hover:bg-white"
          >
            Sign in
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`flex ${compact ? "flex-col" : "items-center"} gap-3`}>
      <a href="/app" className="button-primary">
        Open workspace
      </a>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="rounded-full border border-border-subtle bg-white/78 px-4 py-3 text-sm font-semibold text-ink transition hover:border-[#151311]/22 hover:bg-white"
      >
        <span className="inline-flex items-center gap-2">
          <LogOut size={16} />
          Sign out
        </span>
      </button>
    </div>
  );
}
