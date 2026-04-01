type SectionShellProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function SectionShell({
  eyebrow,
  title,
  description,
  children,
}: SectionShellProps) {
  return (
    <section className="container-shell py-10 md:py-14">
      <div className="mb-8 max-w-3xl reveal-up">
        {eyebrow ? (
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.24em] text-gold-strong">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="editorial-title text-4xl leading-none text-navy md:text-5xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-4 max-w-2xl text-base leading-8 text-copy md:text-lg">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
