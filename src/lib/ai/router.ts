import { generateText, generateObject, LanguageModel } from "ai";
import { z } from "zod";
import {
  getLifeSimulationModel,
  getWorldBuilderModel,
  getNarratorModel,
  AI_MODEL_CONFIGS,
  getGroqProvider,
} from "@/lib/ai/providers";

export type AIRole = "life_simulation" | "world_builder" | "narrator";
export type ProviderName = "groq" | "nvidia" | "gemini";

export interface ProviderCandidate {
  name: ProviderName;
  getModel: () => LanguageModel;
}

export interface RouterExecutionTelemetry {
  provider: ProviderName;
  fallbackCount: number;
  attempts: number;
  durationMs: number;
}

export interface RouterResult<T> {
  data: T;
  telemetry: RouterExecutionTelemetry;
}

/**
 * Ordered fallback chains per AI role.
 */
export function getProviderChainForRole(role: AIRole): ProviderCandidate[] {
  switch (role) {
    case "life_simulation":
      return [
        { name: "groq", getModel: () => getLifeSimulationModel() },
        { name: "nvidia", getModel: () => getWorldBuilderModel() },
        { name: "gemini", getModel: () => getNarratorModel() },
      ];
    case "world_builder":
      return [
        { name: "nvidia", getModel: () => getWorldBuilderModel() },
        { name: "gemini", getModel: () => getNarratorModel() },
        {
          name: "groq",
          getModel: () => {
            const provider = getGroqProvider();
            return provider(AI_MODEL_CONFIGS.groq.versatileModel);
          },
        },
      ];
    case "narrator":
      return [
        { name: "gemini", getModel: () => getNarratorModel() },
        {
          name: "groq",
          getModel: () => {
            const provider = getGroqProvider();
            return provider(AI_MODEL_CONFIGS.groq.versatileModel);
          },
        },
        { name: "nvidia", getModel: () => getWorldBuilderModel() },
      ];
  }
}

/**
 * Checks whether an error is transient (e.g., 429 rate limit or 5xx server error).
 */
export function isRetryableError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  return (
    msg.includes("429") ||
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    msg.includes("quota exceeded") ||
    msg.includes("500") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("504") ||
    msg.includes("timeout") ||
    msg.includes("fetch failed")
  );
}

export type TextExecutor = (params: {
  model: LanguageModel;
  prompt: string;
  system?: string;
}) => Promise<{ text: string }>;

export type ObjectExecutor<T> = (params: {
  model: LanguageModel;
  prompt: string;
  schema: z.ZodType<T>;
  system?: string;
}) => Promise<{ object: T }>;

/**
 * Executes a structured object generation with automatic provider failover.
 */
export async function routeGenerateObject<T>(params: {
  role: AIRole;
  prompt: string;
  schema: z.ZodType<T>;
  system?: string;
  customChain?: ProviderCandidate[];
  executor?: ObjectExecutor<T>;
}): Promise<RouterResult<T>> {
  const chain = params.customChain || getProviderChainForRole(params.role);
  const executeFn = params.executor || (generateObject as unknown as ObjectExecutor<T>);
  const startTime = Date.now();
  let attempts = 0;
  let fallbackCount = 0;
  const errorsEncountered: Array<{ provider: ProviderName; error: string }> = [];

  for (let i = 0; i < chain.length; i++) {
    const candidate = chain[i];
    attempts++;

    try {
      const model = candidate.getModel();
      const result = await executeFn({
        model,
        schema: params.schema,
        prompt: params.prompt,
        system: params.system,
      });

      return {
        data: result.object,
        telemetry: {
          provider: candidate.name,
          fallbackCount,
          attempts,
          durationMs: Date.now() - startTime,
        },
      };
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : String(err);
      errorsEncountered.push({ provider: candidate.name, error: errMessage });

      console.warn(
        `[LLMRouter] Provider "${candidate.name}" failed for role "${params.role}": ${errMessage}. Attempting fallback.`
      );

      fallbackCount++;
    }
  }

  const diagnostics = errorsEncountered
    .map((e) => `  - [${e.provider}]: ${e.error}`)
    .join("\n");

  throw new Error(
    `[LLMRouter] All providers failed for role "${params.role}" after ${attempts} attempts:\n${diagnostics}`
  );
}

/**
 * Executes a text generation with automatic provider failover.
 */
export async function routeGenerateText(params: {
  role: AIRole;
  prompt: string;
  system?: string;
  customChain?: ProviderCandidate[];
  executor?: TextExecutor;
}): Promise<RouterResult<string>> {
  const chain = params.customChain || getProviderChainForRole(params.role);
  const executeFn = params.executor || (generateText as unknown as TextExecutor);
  const startTime = Date.now();
  let attempts = 0;
  let fallbackCount = 0;
  const errorsEncountered: Array<{ provider: ProviderName; error: string }> = [];

  for (let i = 0; i < chain.length; i++) {
    const candidate = chain[i];
    attempts++;

    try {
      const model = candidate.getModel();
      const result = await executeFn({
        model,
        prompt: params.prompt,
        system: params.system,
      });

      return {
        data: result.text,
        telemetry: {
          provider: candidate.name,
          fallbackCount,
          attempts,
          durationMs: Date.now() - startTime,
        },
      };
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : String(err);
      errorsEncountered.push({ provider: candidate.name, error: errMessage });

      console.warn(
        `[LLMRouter] Provider "${candidate.name}" failed for role "${params.role}": ${errMessage}. Attempting fallback.`
      );

      fallbackCount++;
    }
  }

  const diagnostics = errorsEncountered
    .map((e) => `  - [${e.provider}]: ${e.error}`)
    .join("\n");

  throw new Error(
    `[LLMRouter] All providers failed for role "${params.role}" after ${attempts} attempts:\n${diagnostics}`
  );
}
