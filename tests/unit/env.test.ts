import { describe, it, expect } from "vitest";
import { validateEnv, assertProductionEnv, Env } from "@/lib/env";

describe("Phase 2: Environment Schema Validation & Config Guard", () => {
  it("applies default values for NODE_ENV and URLs", () => {
    const parsed = validateEnv({});
    expect(parsed.NODE_ENV).toBe("development");
    expect(parsed.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
    expect(parsed.VEESHREE_API_URL).toBe("https://veeshree.vercel.app/api");
    expect(parsed.QSTASH_URL).toBe("https://qstash.upstash.io/v2");
  });

  it("accepts valid MongoDB connection strings", () => {
    const srv = validateEnv({
      MONGODB_URI: "mongodb+srv://user:pass@cluster0.abc.mongodb.net/test?retryWrites=true",
    });
    expect(srv.MONGODB_URI).toContain("mongodb+srv://");

    const direct = validateEnv({
      MONGODB_URI: "mongodb://localhost:27017/multiverse",
    });
    expect(direct.MONGODB_URI).toContain("mongodb://localhost:27017");
  });

  it("rejects invalid MongoDB URI protocol with descriptive error", () => {
    expect(() =>
      validateEnv({
        MONGODB_URI: "postgres://user:pass@localhost:5432/db",
      })
    ).toThrow(/mongodb:\/\/ or mongodb\+srv:\/\//);
  });

  it("rejects malformed Upstash Redis URL", () => {
    expect(() =>
      validateEnv({
        UPSTASH_REDIS_REST_URL: "not-a-valid-url",
      })
    ).toThrow(/UPSTASH_REDIS_REST_URL must be a valid URL/);
  });

  it("assertProductionEnv fails when critical production keys are missing", () => {
    const mockDevEnv: Env = {
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: "https://multiverse.app",
      QSTASH_URL: "https://qstash.upstash.io/v2",
      NVIDIA_BASE_URL: "https://integrate.api.nvidia.com/v1",
      VEESHREE_API_URL: "https://veeshree.vercel.app/api",
    };

    expect(() => assertProductionEnv(mockDevEnv)).toThrow(
      /Missing critical production environment variables/
    );
  });

  it("assertProductionEnv succeeds when all production keys are present", () => {
    const completeEnv: Env = {
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: "https://multiverse.app",
      MONGODB_URI: "mongodb+srv://user:pass@cluster.mongodb.net/prod",
      UPSTASH_REDIS_REST_URL: "https://my-redis.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "mock_token",
      QSTASH_URL: "https://qstash.upstash.io/v2",
      GROQ_API_KEY: "gsk_mock_key",
      NVIDIA_API_KEY: "nvapi_mock_key",
      NVIDIA_BASE_URL: "https://integrate.api.nvidia.com/v1",
      GOOGLE_GENERATIVE_AI_API_KEY: "AIzaSy_mock_key",
      VEESHREE_API_URL: "https://veeshree.vercel.app/api",
    };

    expect(() => assertProductionEnv(completeEnv)).not.toThrow();
  });
});
