export type PlanId = "free" | "day" | "month" | "year";

export const APP_NAME = "TamGam";
export const FREE_TURN_LIMIT = 3;

export const planCatalog = {
  free: {
    id: "free" as const,
    name: "Free Trial",
    priceLabel: "Rs 0",
    cadenceLabel: "",
    amountPaise: 0,
    durationDays: 0,
    shortLabel: "3 free turns",
    description: "Explore the agent before subscribing.",
  },
  day: {
    id: "day" as const,
    name: "Daily Pass",
    priceLabel: "Rs 11",
    cadenceLabel: "/day",
    amountPaise: 1100,
    durationDays: 1,
    shortLabel: "Rs 11/day",
    description: "A light daily pass for focused revision and practice.",
  },
  month: {
    id: "month" as const,
    name: "Monthly",
    priceLabel: "Rs 299",
    cadenceLabel: "/month",
    amountPaise: 29900,
    durationDays: 30,
    shortLabel: "Rs 299/month",
    description: "The main plan for regular chat, tests, reports, and review loops.",
  },
  year: {
    id: "year" as const,
    name: "Yearly",
    priceLabel: "Rs 1999",
    cadenceLabel: "/year",
    amountPaise: 199900,
    durationDays: 365,
    shortLabel: "Rs 1999/year",
    description: "The best-value plan for a full UPSC cycle.",
  },
};

export const paidPlans = [planCatalog.day, planCatalog.month, planCatalog.year];

export function isPaidPlan(planId: PlanId) {
  return planId !== "free";
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
