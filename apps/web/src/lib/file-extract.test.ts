import { beforeEach, describe, expect, it, vi } from "vitest";

const responsesCreate = vi.fn();

vi.mock("@/lib/openai", () => ({
  getOpenAIClient: () => ({
    responses: {
      create: responsesCreate,
    },
  }),
  getConfiguredModel: () => "gpt-4.1-mini",
  getReasoningConfig: () => undefined,
  getTextVerbosity: () => "low",
}));

import { extractFileText } from "@/lib/file-extract";

describe("extractFileText", () => {
  beforeEach(() => {
    responsesCreate.mockReset();
  });

  it("extracts plain text uploads directly", async () => {
    const file = new File(["Directive Principles and fundamental duties"], "polity.txt", {
      type: "text/plain",
    });

    await expect(extractFileText(file)).resolves.toBe(
      "Directive Principles and fundamental duties",
    );
    expect(responsesCreate).not.toHaveBeenCalled();
  });

  it("uses OCR for supported image uploads", async () => {
    responsesCreate.mockResolvedValue({
      output_text: "Parliamentary sovereignty and constitutional supremacy",
    });

    const file = new File(["image-bytes"], "notes.jpg", {
      type: "image/jpeg",
    });

    await expect(extractFileText(file)).resolves.toBe(
      "Parliamentary sovereignty and constitutional supremacy",
    );
    expect(responsesCreate).toHaveBeenCalledTimes(1);
  });

  it("rejects unsupported upload types with the expanded guidance", async () => {
    const file = new File(["binary"], "notes.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    await expect(extractFileText(file)).rejects.toThrow(
      "Please upload JPG, PNG, WEBP, PDF, TXT, MD, CSV, JSON, HTML, or XML files.",
    );
  });
});
