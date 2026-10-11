import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { env } from "@/lib/env";
import type { LanguageModel } from "ai";

/**
 * Multi-Provider Matrix for Multiverse You
 * Connects Groq, NVIDIA NIM, and Google Gemini via Vercel AI SDK.
 */

export const AI_MODEL_CONFIGS = {
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.1-8b-instant",
    versatileModel: "llama-3.3-70b-versatile",
  },
  nvidia: {
    baseUrl: env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
    defaultModel: "meta/llama-3.1-70b-instruct",
  },
  gemini: {
    defaultModel: "gemini-2.5-flash",
    fallbackModel: "gemini-1.5-flash",
  },
} as const;

/**
 * Creates or retrieves the Groq provider instance (OpenAI-compatible)
 */
export function getGroqProvider(customApiKey?: string) {
  const apiKey = customApiKey || env.GROQ_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "[AIProviders] GROQ_API_KEY is not defined. Required for quarterly simulation steps."
    );
  }

  return createOpenAI({
    name: "groq",
    baseURL: AI_MODEL_CONFIGS.groq.baseUrl,
    apiKey,
  });
}

/**
 * Creates or retrieves the NVIDIA NIM provider instance (OpenAI-compatible)
 */
export function getNvidiaProvider(customApiKey?: string, customBaseUrl?: string) {
  const apiKey = customApiKey || env.NVIDIA_API_KEY || process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error(
      "[AIProviders] NVIDIA_API_KEY is not defined. Required for creative world-building."
    );
  }

  return createOpenAI({
    name: "nvidia",
    baseURL: customBaseUrl || AI_MODEL_CONFIGS.nvidia.baseUrl,
    apiKey,
  });
}

/**
 * Creates or retrieves the Google Gemini provider instance
 */
export function getGeminiProvider(customApiKey?: string) {
  const apiKey =
    customApiKey || env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "[AIProviders] GOOGLE_GENERATIVE_AI_API_KEY is not defined. Required for long-context narrator synthesis."
    );
  }

  return createGoogleGenerativeAI({
    apiKey,
  });
}

/**
 * Returns the model for high-frequency quarterly life simulation steps (Groq)
 */
export function getLifeSimulationModel(
  modelId: string = AI_MODEL_CONFIGS.groq.defaultModel,
  customApiKey?: string
): LanguageModel {
  const provider = getGroqProvider(customApiKey);
  return provider(modelId);
}

/**
 * Returns the model for creative persona and world building (NVIDIA NIM)
 */
export function getWorldBuilderModel(
  modelId: string = AI_MODEL_CONFIGS.nvidia.defaultModel,
  customApiKey?: string
): LanguageModel {
  const provider = getNvidiaProvider(customApiKey);
  return provider(modelId);
}

/**
 * Returns the model for holistic cross-timeline narrator synthesis (Google Gemini)
 */
export function getNarratorModel(
  modelId: string = AI_MODEL_CONFIGS.gemini.defaultModel,
  customApiKey?: string
): LanguageModel {
  const provider = getGeminiProvider(customApiKey);
  return provider(modelId);
}
