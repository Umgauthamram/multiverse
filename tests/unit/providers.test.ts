import { describe, it, expect, beforeEach } from "vitest";
import {
  getGroqProvider,
  getNvidiaProvider,
  getGeminiProvider,
  getLifeSimulationModel,
  getWorldBuilderModel,
  getNarratorModel,
  AI_MODEL_CONFIGS,
} from "@/lib/ai/providers";

describe("Phase 6: Vercel AI SDK Core Setup & Providers Matrix", () => {
  beforeEach(() => {
    delete process.env.GROQ_API_KEY;
    delete process.env.NVIDIA_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  });

  it("throws descriptive errors when API keys are not provided", () => {
    expect(() => getGroqProvider("")).toThrow(
      /GROQ_API_KEY is not defined/
    );
    expect(() => getNvidiaProvider("")).toThrow(
      /NVIDIA_API_KEY is not defined/
    );
    expect(() => getGeminiProvider("")).toThrow(
      /GOOGLE_GENERATIVE_AI_API_KEY is not defined/
    );
  });

  interface TestModelInspector {
    modelId: string;
    provider: string;
  }

  it("initializes Groq provider with custom key and targets Groq endpoint", () => {
    const provider = getGroqProvider("gsk-test-key-123");
    expect(provider).toBeDefined();

    const model = getLifeSimulationModel("llama-3.1-8b-instant", "gsk-test-key-123") as unknown as TestModelInspector;
    expect(model).toBeDefined();
    expect(model.modelId).toBe("llama-3.1-8b-instant");
    expect(model.provider).toBe("groq.responses");
  });

  it("initializes NVIDIA NIM provider with custom base URL and key", () => {
    const customBase = "https://custom.nvidia.local/v1";
    const provider = getNvidiaProvider("nvapi-test-key", customBase);
    expect(provider).toBeDefined();

    const model = getWorldBuilderModel("meta/llama-3.1-70b-instruct", "nvapi-test-key") as unknown as TestModelInspector;
    expect(model).toBeDefined();
    expect(model.modelId).toBe("meta/llama-3.1-70b-instruct");
    expect(model.provider).toBe("nvidia.responses");
  });

  it("initializes Google Gemini provider and model correctly", () => {
    const provider = getGeminiProvider("AIzaSy-test-key");
    expect(provider).toBeDefined();

    const model = getNarratorModel("gemini-2.5-flash", "AIzaSy-test-key") as unknown as TestModelInspector;
    expect(model).toBeDefined();
    expect(model.modelId).toBe("gemini-2.5-flash");
    expect(model.provider).toBe("google.generative-ai");
  });

  it("exposes expected default model configurations", () => {
    expect(AI_MODEL_CONFIGS.groq.defaultModel).toBe("llama-3.1-8b-instant");
    expect(AI_MODEL_CONFIGS.nvidia.defaultModel).toBe("meta/llama-3.1-70b-instruct");
    expect(AI_MODEL_CONFIGS.gemini.defaultModel).toBe("gemini-2.5-flash");
  });
});
