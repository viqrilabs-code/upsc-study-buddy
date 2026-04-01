import { PageHero } from "@/components/page-hero";
import { SectionShell } from "@/components/section-shell";
import { buildMetadata } from "@/lib/metadata";
import { supportChannels } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Contact",
  description: "Reach TamGam on email or WhatsApp.",
});

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Reach TamGam directly."
        description="Email or WhatsApp us for support."
      />

      <SectionShell eyebrow="Contact details" title="Direct support channels only.">
        <div className="grid gap-5 md:grid-cols-2">
          {supportChannels.map((channel) => (
            <div key={channel.title} className="surface-panel rounded-[1.75rem] p-5">
              <h2 className="text-lg font-semibold text-navy">{channel.title}</h2>
              {channel.href ? (
                <a
                  href={channel.href}
                  target={channel.href.startsWith("http") ? "_blank" : undefined}
                  rel={channel.href.startsWith("http") ? "noreferrer" : undefined}
                  className="mt-2 block font-medium text-gold-strong transition hover:text-[#d96200]"
                >
                  {channel.detail}
                </a>
              ) : (
                <p className="mt-2 font-medium text-gold-strong">{channel.detail}</p>
              )}
              <p className="mt-3 text-sm leading-7 text-copy">{channel.note}</p>
            </div>
          ))}
        </div>
      </SectionShell>
    </>
  );
}
