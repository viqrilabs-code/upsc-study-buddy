import Image from "next/image";
import Link from "next/link";
import { APP_NAME } from "@/lib/plans";

type BrandMarkProps = {
  compact?: boolean;
};

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <Link href="/" className="flex items-center gap-3">
      <div className="relative overflow-hidden rounded-[1.2rem] border border-[#151311]/8 bg-white/75 shadow-[0_14px_32px_rgba(15,13,11,0.14)]">
        <Image
          src="/logo.png"
          alt={`${APP_NAME} logo`}
          width={compact ? 42 : 50}
          height={compact ? 42 : 50}
          className="h-auto w-auto"
          priority
        />
      </div>
      <div>
        <div className="font-display text-2xl leading-none tracking-[-0.04em] text-ink">
          <span className="text-[#151311]">Tam</span>
          <span className="text-[#f07b17]">Gam</span>
        </div>
        {!compact ? (
          <div className="mt-1 font-mono text-[0.66rem] uppercase tracking-[0.24em] text-copy">
            AI study companion
          </div>
        ) : null}
      </div>
    </Link>
  );
}
