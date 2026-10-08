import { describe, it, expect, vi, beforeEach } from "vitest";
import { VeeshreeClient, UserPersonaMemory } from "@/lib/memory/veeshree";

describe("Phase 8: Veeshree Memory Layer Client", () => {
  const mockBaseUrl = "https://mock.veeshree.local/api";
  const mockApiKey = "test-vee-key-123";
  let client: VeeshreeClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    client = new VeeshreeClient(mockBaseUrl, mockApiKey);
  });

  it("handles 404 cleanly and returns null for unseeded user", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    const memory = await client.getPersonaMemory("user-999");
    expect(memory).toBeNull();
  });

  it("retrieves and parses existing persona memory correctly", async () => {
    const mockMemory: UserPersonaMemory = {
      userId: "user-123",
      corePriorities: ["financial_growth", "family_proximity"],
      riskTolerance: "moderate",
      identifiedBiases: ["sunk_cost_fallacy"],
      constraints: ["cannot relocate outside country for 2 years"],
      historicalDecisions: [],
      updatedAt: new Date().toISOString(),
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: mockMemory }),
    });

    const result = await client.getPersonaMemory("user-123");
    expect(result).not.toBeNull();
    expect(result?.userId).toBe("user-123");
    expect(result?.riskTolerance).toBe("moderate");
    expect(result?.corePriorities).toContain("financial_growth");
  });

  it("sends appropriate authentication and JSON headers when saving memory", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    const memoryToSave: UserPersonaMemory = {
      userId: "user-456",
      corePriorities: ["autonomy"],
      riskTolerance: "aggressive",
      identifiedBiases: [],
      constraints: ["liquid savings > $10,000"],
      historicalDecisions: [],
      updatedAt: new Date().toISOString(),
    };

    const success = await client.savePersonaMemory(memoryToSave);
    expect(success).toBe(true);

    expect(global.fetch).toHaveBeenCalledWith(
      `${mockBaseUrl}/memory/user-456`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: `Bearer ${mockApiKey}`,
        }),
      })
    );
  });

  it("appends decision reflections without overwriting existing history", async () => {
    const initialMemory: UserPersonaMemory = {
      userId: "user-789",
      corePriorities: ["peace_of_mind"],
      riskTolerance: "conservative",
      identifiedBiases: [],
      constraints: [],
      historicalDecisions: [
        {
          dilemma: "Stay or resign from legacy firm",
          chosenPath: "Resigned",
          timestamp: "2026-01-01T00:00:00.000Z",
        },
      ],
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    global.fetch = vi
      .fn()
      // First call (getPersonaMemory)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: initialMemory }),
      })
      // Second call (savePersonaMemory)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

    const success = await client.recordDecisionReflection("user-789", {
      dilemma: "Accept London startup offer",
      chosenPath: "Accepted offer",
      keyLearning: "Higher risk compensated by steep learning curve",
    });

    expect(success).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(2);

    const postCallBody = JSON.parse(
      (vi.mocked(global.fetch).mock.calls[1][1] as RequestInit).body as string
    );
    expect(postCallBody.historicalDecisions).toHaveLength(2);
    expect(postCallBody.historicalDecisions[1].dilemma).toBe("Accept London startup offer");
  });
});
