import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope, Newsreader } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "TamGam",
    template: "%s | TamGam",
  },
  description:
    "TamGam is a UPSC study companion with Google sign-in, saved reports, weakness-aware practice, and paid access after a short free trial.",
  applicationName: "TamGam",
  category: "education",
  keywords: [
    "UPSC",
    "TamGam",
    "UPSC study companion",
    "UPSC mains practice",
    "UPSC prelims practice",
    "UPSC current affairs",
    "UPSC answer writing",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${newsreader.variable} ${plexMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full bg-sand text-ink selection:bg-gold/30 selection:text-ink">
        <Providers>
          <div className="relative flex min-h-screen flex-col overflow-x-clip">
            <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top,_rgba(240,123,23,0.24),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(26,29,51,0.14),_transparent_34%)]" />
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(22,19,17,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(22,19,17,0.03)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.62),transparent_82%)]" />
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
