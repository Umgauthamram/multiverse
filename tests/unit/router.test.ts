import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  routeGenerateText,
  routeGenerateObject,
  isRetryableError,
  getProviderChainForRole,
  ProviderCandidate,
  TextExecutor,
  ObjectExecutor,
} from "@/lib/ai/router";
import type { LanguageModel } from "ai";
import { z } from "zod";

describe("Phase 7: Resilient LLM Router with Automatic Fallback", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const dummyModelGetter = () => ({} as unknown as LanguageModel);

  it("identifies retryable error messages accurately", () => {
    expect(isRetryableError(new Error("Rate limit exceeded (HTTP 429)"))).toBe(true);
    expect(isRetryableError(new Error("503 Service Unavailable"))).toBe(true);
    expect(isRetryableError(new Error("Connection timeout"))).toBe(true);
    expect(isRetryableError(new Error("Invalid prompt syntax"))).toBe(false);
  });

  it("returns calibrated provider priority chains for each role", () => {
    const lifeChain = getProviderChainForRole("life_simulation");
    expect(lifeChain.map((p) => p.name)).toEqual(["groq", "nvidia", "gemini"]);

    const worldChain = getProviderChainForRole("world_builder");
    expect(worldChain.map((p) => p.name)).toEqual(["nvidia", "gemini", "groq"]);

    const narratorChain = getProviderChainForRole("narrator");
    expect(narratorChain.map((p) => p.name)).toEqual(["gemini", "groq", "nvidia"]);
  });

  it("executes primary provider when healthy without triggering fallback", async () => {
    const mockExecutor: TextExecutor = vi.fn().mockResolvedValueOnce({
      text: "Quarter 1 simulated successfully.",
    });

    const mockChain: ProviderCandidate[] = [
      { name: "groq", getModel: dummyModelGetter },
      { name: "nvidia", getModel: dummyModelGetter },
    ];

    const result = await routeGenerateText({
      role: "life_simulation",
      prompt: "Simulate quarter 1",
      customChain: mockChain,
      executor: mockExecutor,
    });

    expect(result.data).toBe("Quarter 1 simulated successfully.");
    expect(result.telemetry.provider).toBe("groq");
    expect(result.telemetry.fallbackCount).toBe(0);
    expect(result.telemetry.attempts).toBe(1);
    expect(mockExecutor).toHaveBeenCalledTimes(1);
  });

  it("seamlessly fails over to NVIDIA when Groq hits HTTP 429 rate limit", async () => {
    const mockExecutor: TextExecutor = vi
      .fn()
      // Primary (Groq) fails with 429
      .mockRejectedValueOnce(new Error("HTTP 429: Too Many Requests from Groq API"))
      // Fallback (NVIDIA) succeeds
      .mockResolvedValueOnce({
        text: "Quarter 1 simulated via NVIDIA fallback.",
      });

    const mockChain: ProviderCandidate[] = [
      { name: "groq", getModel: dummyModelGetter },
      { name: "nvidia", getModel: dummyModelGetter },
    ];

    const result = await routeGenerateText({
      role: "life_simulation",
      prompt: "Simulate quarter 1",
      customChain: mockChain,
      executor: mockExecutor,
    });

    expect(result.data).toBe("Quarter 1 simulated via NVIDIA fallback.");
    expect(result.telemetry.provider).toBe("nvidia");
    expect(result.telemetry.fallbackCount).toBe(1);
    expect(result.telemetry.attempts).toBe(2);
    expect(mockExecutor).toHaveBeenCalledTimes(2);
  });

  it("routes structured objects and fails over across multiple providers", async () => {
    const TestSchema = z.object({
      deltaHappiness: z.number(),
      diary: z.string(),
    });

    type TestType = z.infer<typeof TestSchema>;

    const mockExecutor: ObjectExecutor<TestType> = vi
      .fn()
      .mockRejectedValueOnce(new Error("Groq quota exceeded (429)"))
      .mockRejectedValueOnce(new Error("NVIDIA gateway timeout (504)"))
      .mockResolvedValueOnce({
        object: { deltaHappiness: 10, diary: "Promoted to tech lead." },
      });

    const mockChain: ProviderCandidate[] = [
      { name: "groq", getModel: dummyModelGetter },
      { name: "nvidia", getModel: dummyModelGetter },
      { name: "gemini", getModel: dummyModelGetter },
    ];

    const result = await routeGenerateObject({
      role: "life_simulation",
      prompt: "Generate quarter delta",
      schema: TestSchema,
      customChain: mockChain,
      executor: mockExecutor,
    });

    expect(result.data.deltaHappiness).toBe(10);
    expect(result.data.diary).toBe("Promoted to tech lead.");
    expect(result.telemetry.provider).toBe("gemini");
    expect(result.telemetry.fallbackCount).toBe(2);
    expect(result.telemetry.attempts).toBe(3);
    expect(mockExecutor).toHaveBeenCalledTimes(3);
  });

  it("throws comprehensive diagnostic error when all candidate providers fail", async () => {
    const mockExecutor: TextExecutor = vi
      .fn()
      .mockRejectedValueOnce(new Error("Groq API error 500"))
      .mockRejectedValueOnce(new Error("NVIDIA API error 503"));

    const mockChain: ProviderCandidate[] = [
      { name: "groq", getModel: dummyModelGetter },
      { name: "nvidia", getModel: dummyModelGetter },
    ];

    await expect(
      routeGenerateText({
        role: "life_simulation",
        prompt: "Simulate quarter",
        customChain: mockChain,
        executor: mockExecutor,
      })
    ).rejects.toThrow(/All providers failed for role "life_simulation"/);

    expect(mockExecutor).toHaveBeenCalledTimes(2);
  });
});
