import Link from "next/link";

export default function NotFound() {
  return (
    <section className="container-shell py-24">
      <div className="glass-panel rounded-[2rem] p-8 text-center md:p-12">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-gold-strong">
          Page not found
        </p>
        <h1 className="mt-4 editorial-title text-5xl text-navy md:text-6xl">
          This route has not been charted yet.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-copy md:text-lg">
          The page may have moved, or the route is still part of the implementation roadmap.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className="button-primary">
            Go home
          </Link>
          <Link href="/help" className="button-secondary">
            Visit help
          </Link>
        </div>
      </div>
    </section>
  );
}
