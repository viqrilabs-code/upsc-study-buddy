import { getServerSession } from "next-auth";
import {
  consumeAgentTurn,
  getOrCreateUserProfile,
  getPersonalizationSnapshot,
  getRemainingFreeTurns,
  hasActiveSubscription,
  type UserProfile,
} from "@/lib/app-db";
import { authOptions } from "@/lib/auth";

export async function getAuthenticatedAppUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return null;
  }

  const profile = await getOrCreateUserProfile({
    id: session.user.id || session.user.email,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
  });

  return {
    session,
    profile,
  };
}

export async function consumeTurnIfNeeded(profile: UserProfile) {
  if (hasActiveSubscription(profile)) {
    return {
      blocked: false,
      profile,
    };
  }

  const remaining = getRemainingFreeTurns(profile);

  if (remaining <= 0) {
    return {
      blocked: true,
      profile,
    };
  }

  const updatedProfile = await consumeAgentTurn(profile.id);

  return {
    blocked: false,
    profile: updatedProfile,
  };
}

export function getUsageMeta(profile: UserProfile) {
  const hasActivePlan = hasActiveSubscription(profile);

  return {
    plan: profile.plan,
    hasActivePlan,
    freeTurnsUsed: profile.freeTurnsUsed,
    remainingFreeTurns: hasActivePlan ? 0 : getRemainingFreeTurns(profile),
  };
}

export async function buildPersonalizationContext(userId: string, subject: string) {
  const snapshot = await getPersonalizationSnapshot(userId, subject);

  if (!snapshot.strengths.length && !snapshot.weaknesses.length && !snapshot.reportSummaries.length) {
    return "";
  }

  return [
    "User preparation memory:",
    snapshot.strengths.length ? `Top strengths in ${subject}: ${snapshot.strengths.join("; ")}` : "",
    snapshot.weaknesses.length
      ? `Top weaknesses to repair in ${subject}: ${snapshot.weaknesses.join("; ")}`
      : "",
    snapshot.reportSummaries.length
      ? `Recent report notes: ${snapshot.reportSummaries.join(" || ")}`
      : "",
    "Use this context to target weaknesses, reinforce strengths, and avoid repeating the same blind spots.",
  ]
    .filter(Boolean)
    .join("\n");
}
