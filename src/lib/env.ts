import { z } from "zod";

/**
 * Environment Schema Specification
 * Validates all required and optional runtime configuration keys.
 */
export const envSchema = z.object({
  // App & Environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  // Database (MongoDB Atlas)
  MONGODB_URI: z
    .string()
    .min(1, "MONGODB_URI is required")
    .refine(
      (val) => val.startsWith("mongodb://") || val.startsWith("mongodb+srv://"),
      "MONGODB_URI must be a valid mongodb:// or mongodb+srv:// connection URI"
    )
    .optional(),

  // Queue & Caching (Upstash Redis & QStash)
  UPSTASH_REDIS_REST_URL: z.string().url("UPSTASH_REDIS_REST_URL must be a valid URL").optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  QSTASH_URL: z.string().url().default("https://qstash.upstash.io/v2"),
  QSTASH_TOKEN: z.string().min(1).optional(),
  QSTASH_CURRENT_SIGNING_KEY: z.string().min(1).optional(),
  QSTASH_NEXT_SIGNING_KEY: z.string().min(1).optional(),

  // Multi-Provider AI Keys
  GROQ_API_KEY: z.string().min(1).optional(),
  NVIDIA_API_KEY: z.string().min(1).optional(),
  NVIDIA_BASE_URL: z.string().url().default("https://integrate.api.nvidia.com/v1"),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1).optional(),

  // Controllable Memory (Veeshree)
  VEESHREE_API_URL: z.string().url().default("https://veeshree.vercel.app/api"),
  VEESHREE_API_KEY: z.string().min(1).optional(),

  // Audio / Fallback
  OPENAI_API_KEY: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates any dictionary against the environment schema.
 * Throws a formatted diagnostic error on failure.
 */
export function validateEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const formattedErrors = result.error.issues
      .map((issue) => `  - [${issue.path.join(".")}]: ${issue.message}`)
      .join("\n");

    const message = `[EnvGuard] Invalid environment variables detected:\n${formattedErrors}`;
    console.error(message);
    throw new Error(message);
  }

  return result.data;
}

/**
 * Validates that all production-critical keys are present.
 * Used during server bootstrap or health checks.
 */
export function assertProductionEnv(envConfig: Env): void {
  const missingKeys: string[] = [];

  if (!envConfig.MONGODB_URI) missingKeys.push("MONGODB_URI");
  if (!envConfig.UPSTASH_REDIS_REST_URL) missingKeys.push("UPSTASH_REDIS_REST_URL");
  if (!envConfig.UPSTASH_REDIS_REST_TOKEN) missingKeys.push("UPSTASH_REDIS_REST_TOKEN");
  if (!envConfig.GROQ_API_KEY) missingKeys.push("GROQ_API_KEY");
  if (!envConfig.NVIDIA_API_KEY) missingKeys.push("NVIDIA_API_KEY");
  if (!envConfig.GOOGLE_GENERATIVE_AI_API_KEY) missingKeys.push("GOOGLE_GENERATIVE_AI_API_KEY");

  if (missingKeys.length > 0) {
    throw new Error(
      `[EnvGuard] Missing critical production environment variables:\n${missingKeys
        .map((k) => `  - ${k}`)
        .join("\n")}`
    );
  }
}

/**
 * Global validated environment accessor.
 */
export const env: Env = validateEnv(process.env);
