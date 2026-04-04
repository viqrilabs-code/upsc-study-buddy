import type { LucideIcon } from "lucide-react";
import {
  BookMarked,
  BrainCircuit,
  ClipboardCheck,
  Flame,
  Newspaper,
} from "lucide-react";
import { paidPlans } from "@/lib/plans";

export type NavItem = {
  href: string;
  label: string;
  badge?: string;
};

export type FeatureCard = {
  title: string;
  description: string;
  eyebrow: string;
  icon: LucideIcon;
  accent: string;
};

export const subjectOptions = [
  "Polity",
  "History",
  "Geography",
  "Economy",
  "Environment",
  "Science and Tech",
  "Ethics",
  "Essay",
  "CSAT",
];

export const mainNav: NavItem[] = [
  { href: "/app", label: "Workspace" },
  { href: "/pricing", label: "Pricing" },
  { href: "/current-affairs", label: "Current Affairs", badge: "Trial" },
  { href: "/notes", label: "1-Pager Notes" },
];

export const companyNav: NavItem[] = [
  { href: "/contact", label: "Contact" },
  { href: "/help", label: "Help" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export const featureCards: FeatureCard[] = [
  {
    eyebrow: "Weakness-driven prep",
    title: "The agent remembers where the user is losing marks and targets it on the next attempt.",
    description:
      "Every report updates strengths, weaknesses, and the next question-selection logic so practice gets sharper over time.",
    icon: BrainCircuit,
    accent: "from-[#f07b17]/24 to-[#151311]/5",
  },
  {
    eyebrow: "Daily relevance",
    title: "Current affairs becomes a guided daily class, not another messy tab pile.",
    description:
      "Users get 3 current-affairs trial turns, then continue with the same article-wise classroom flow on a paid plan.",
    icon: Newspaper,
    accent: "from-[#ffd8b5]/40 to-[#f07b17]/8",
  },
  {
    eyebrow: "Serious evaluation",
    title: "Mains and Prelims practice behaves like a real UPSC training loop.",
    description:
      "Question design, handwriting review, score reports, and weakness tags are built to push performance, not flatter it.",
    icon: ClipboardCheck,
    accent: "from-[#151311]/22 to-[#f07b17]/10",
  },
  {
    eyebrow: "One place, less noise",
    title: "Study chat, tests, notes, reports, and feedback live inside one clean workspace.",
    description:
      "The app is designed to feel like a focused daily operating system for UPSC, not a scattered coaching portal.",
    icon: BookMarked,
    accent: "from-[#151311]/10 to-[#f07b17]/18",
  },
];

export const productTracks = [
  {
    title: "Interactive Study Buddy",
    description:
      "Teacher-style dialogue that starts simple, evaluates responses, and gradually moves into deeper UPSC territory.",
  },
  {
    title: "Mains Practice + OCR",
    description:
      "Generate one serious mains question, upload a handwritten answer, and get detailed feedback with report memory.",
  },
  {
    title: "Prelims Practice",
    description:
      "Solve 10 MCQs one by one, then review score, traps, explanations, and personalized repair points.",
  },
  {
    title: "1-Pager Revision Notes",
    description:
      "Turn uploaded content into keywords, mind maps, crisp revision, and one probable mains answer.",
  },
];

export const homeStats = [
  { label: "Study trial", value: "3 turns" },
  { label: "Current affairs", value: "3-turn trial" },
  { label: "Plans", value: "11 / 299 / 1999" },
  { label: "Storage", value: "Only user data" },
];

export const dashboardHighlights = [
  {
    label: "Weakness repair",
    value: "Live",
    detail: "Reports keep updating the topics where the user is repeatedly slipping.",
  },
  {
    label: "Report memory",
    value: "Saved",
    detail: "Mains and Prelims reports are stored and fed back into question design.",
  },
  {
    label: "Feedback loop",
    value: "After every session",
    detail: "Ratings and short feedback are captured once a session ends.",
  },
];

export const testimonials = [
  {
    name: "Working aspirants",
    role: "Need structure fast",
    quote:
      "TamGam feels less like a chatbot and more like a disciplined study companion that keeps the day moving.",
  },
  {
    name: "Self-study users",
    role: "Need honest reports",
    quote:
      "The useful part is that it remembers weak spots and keeps pushing them until they stop being weak spots.",
  },
  {
    name: "Revision-focused users",
    role: "Need compression",
    quote:
      "The notes and practice modules feel connected. One session actually improves the next one.",
  },
];

export const pricingPlans = paidPlans.map((plan) => ({
  name: plan.name,
  price: plan.priceLabel,
  cadence: plan.cadenceLabel,
  description: plan.description,
  featured: plan.id === "month",
  planId: plan.id,
  features:
    plan.id === "day"
      ? [
          "1 uploaded study document across the workspace",
          "1 1-pager revision note generation",
          "1 Prelims test and result",
          "1 Mains question with evaluation",
          "Current affairs access after the 3 free trial turns",
        ]
      : [
          "Google sign-in and saved workspace",
          "Study, Current Affairs, Mains, Prelims, and notes inside one account",
          "Report memory with strength and weakness tracking",
          "Current affairs, Mains, Prelims, and notes stay unlocked",
        ],
}));

export const faqItems = [
  {
    question: "What does the database store?",
    answer:
      "Only user account details, saved reports, evolving strength and weakness signals, plan status, and feedback. Raw uploads are not meant for long-term storage.",
  },
  {
    question: "When does payment start?",
    answer:
      "Study gets 3 free turns. Current affairs gets 3 free turns. Mains includes 1 free question and 1 free evaluation. 1-pager notes include 1 free generation. Prelims is paid from the first test.",
  },
  {
    question: "Can TamGam customize questions from past mistakes?",
    answer:
      "Yes. Mains and Prelims reports are stored and used as context so later questions can focus on recurring weak areas.",
  },
  {
    question: "Which sign-in method is supported?",
    answer:
      "The app is set up for Google account sign-in and sign-up through the same secure OAuth flow.",
  },
];

export const supportChannels = [
  {
    title: "Email",
    detail: "viqrilabs@gmail.com",
    note: "For account, product, and payment-related queries.",
    href: "mailto:viqrilabs@gmail.com",
  },
  {
    title: "WhatsApp",
    detail: "+91 92702 11542",
    note: "Message us directly on WhatsApp for quick support.",
    href: "https://wa.me/919270211542",
  },
];

export const legalSummary = {
  privacy: [
    "TamGam stores only the user information required to operate the workspace, reports, ratings, and subscription state.",
    "Generated tests and raw uploads are processed for output generation and are not intended for permanent storage.",
    "User performance signals may be reused to personalize future questions and study guidance.",
  ],
  terms: [
    "TamGam is an educational software product and does not guarantee UPSC outcomes.",
    "The platform uses stored performance signals to personalize the next study session.",
    "TamGam is a proprietary product of Viqri Labs Private Limited.",
  ],
};

export const pageDescriptions = {
  admin:
    "Admin support console for TamGam covering sign-in, signup, payment, refund, and user account diagnostics.",
  about:
    "Why TamGam is being built as a focused UPSC study companion that remembers user performance and keeps practice honest.",
  currentAffairs:
    "Daily current affairs classes, issue mapping, and revision-ready outputs inside TamGam.",
  dashboard:
    "A real report-driven dashboard for TamGam users, including saved tests, strengths, weaknesses, and plan state.",
  help:
    "Support, setup guidance, sign-in help, and product questions for TamGam users.",
  notes:
    "Upload-led 1-pager revision notes for GS and Optional with keywords, mind maps, and probable mains Q&A.",
  pricing:
    "TamGam pricing for daily, monthly, and yearly plans, with feature-specific trials before payment.",
  privacy:
    "How TamGam handles user data, reports, uploads, ratings, and subscription information.",
  pyqs:
    "How TamGam uses PYQ-style framing and practice logic across its modules.",
  terms:
    "Terms and conditions for TamGam, a proprietary product of Viqri Labs Private Limited.",
};

export const landingHighlights = [
  "Study with an AI buddy that actually remembers your weak areas.",
  "Practice Mains and Prelims in the same place where the reports get saved.",
  "Current affairs, notes, and Mains each start with a small trial, then continue on paid plans.",
];

export const landingPunch = [
  "Not another chatbot.",
  "A UPSC study loop that gets sharper after every report.",
];

export const marketingLine = {
  eyebrow: "TamGam for UPSC",
  title: "The study buddy that tracks weakness, sharpens practice, and keeps the day disciplined.",
  description:
    "Chat less blindly. Practice with memory. Turn reports into better next questions.",
  proof: "3 free Study turns. 3 Current Affairs trial turns. 1 free note. 1 free Mains evaluation.",
  icon: Flame,
};
