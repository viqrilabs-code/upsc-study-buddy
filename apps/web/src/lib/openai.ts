import OpenAI from "openai";

let client: OpenAI | null = null;
let cachedApiKey = "";

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  if (!client || cachedApiKey !== apiKey) {
    client = new OpenAI({ apiKey });
    cachedApiKey = apiKey;
  }

  return client;
}

export function getConfiguredModel() {
  return process.env.OPENAI_MODEL || "gpt-4.1-mini";
}

export function getReasoningConfig(model: string) {
  const normalized = model.trim().toLowerCase();

  if (
    normalized.startsWith("gpt-5") ||
    normalized.startsWith("o1") ||
    normalized.startsWith("o3") ||
    normalized.startsWith("o4")
  ) {
    return {
      effort: "minimal" as const,
    };
  }

  return undefined;
}

export function getTextVerbosity(
  model: string,
  preferred: "low" | "medium" | "high" = "medium",
) {
  const normalized = model.trim().toLowerCase();

  if (normalized.startsWith("gpt-4.1-mini")) {
    return "medium" as const;
  }

  return preferred;
}
