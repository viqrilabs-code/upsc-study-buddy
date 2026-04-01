import { PageHero } from "@/components/page-hero";
import { SectionShell } from "@/components/section-shell";
import { buildMetadata } from "@/lib/metadata";
import { faqItems, pageDescriptions, supportChannels } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Help",
  description: pageDescriptions.help,
});

export default function HelpPage() {
  return (
    <>
      <PageHero
        eyebrow="Help center"
        title="Clear support paths for users, teams, and prospective customers."
        description="This help surface is designed to feel like the product itself: calm, useful, and direct. No maze, no vague copy, no dead-end pages."
      />

      <SectionShell eyebrow="FAQs" title="Answers to the questions users ask most often.">
        <div className="grid gap-4">
          {faqItems.map((item) => (
            <details key={item.question} className="surface-panel rounded-[1.5rem] p-5">
              <summary className="cursor-pointer text-lg font-semibold text-navy">
                {item.question}
              </summary>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-copy">{item.answer}</p>
            </details>
          ))}
        </div>
      </SectionShell>

      <SectionShell eyebrow="Support channels" title="If the FAQ does not solve it, here is where to go next.">
        <div className="grid gap-5 md:grid-cols-3">
          {supportChannels.map((channel) => (
            <div key={channel.title} className="surface-panel rounded-[1.75rem] p-5">
              <h2 className="text-lg font-semibold text-navy">{channel.title}</h2>
              <p className="mt-2 font-medium text-gold-strong">{channel.detail}</p>
              <p className="mt-3 text-sm leading-7 text-copy">{channel.note}</p>
            </div>
          ))}
        </div>
      </SectionShell>
    </>
  );
}
