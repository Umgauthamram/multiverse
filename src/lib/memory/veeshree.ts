/**
 * Veeshree Memory Layer Client
 * Provides version-controlled, controllable cognitive memory for Multiverse You personas,
 * tracking user constraints, long-term values, and decision trade-offs across sessions.
 * 
 * Reference: https://veeshree.vercel.app/
 */

import { env } from "@/lib/env";

export interface UserPersonaMemory {
  userId: string;
  corePriorities: string[];
  riskTolerance: "conservative" | "moderate" | "aggressive";
  identifiedBiases: string[];
  constraints: string[];
  historicalDecisions: {
    dilemma: string;
    chosenPath: string;
    timestamp: string;
    keyLearning?: string;
  }[];
  updatedAt: string;
}

export interface VeeshreeApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class VeeshreeClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || env.VEESHREE_API_URL;
    this.apiKey = apiKey || env.VEESHREE_API_KEY;
  }

  /**
   * Retrieve active persona memory and historical constraints for a user.
   */
  async getPersonaMemory(userId: string): Promise<UserPersonaMemory | null> {
    try {
      const response = await fetch(`${this.baseUrl}/memory/${encodeURIComponent(userId)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        cache: "no-store",
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Veeshree API error: ${response.status} ${response.statusText}`);
      }

      const json = (await response.json()) as VeeshreeApiResponse<UserPersonaMemory>;
      return json.data ?? null;
    } catch (error) {
      console.warn(`[Veeshree] Failed to retrieve persona memory for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Persist or update user persona memory, values, and life constraints.
   */
  async savePersonaMemory(memory: UserPersonaMemory): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/memory/${encodeURIComponent(memory.userId)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({
          ...memory,
          updatedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Veeshree API error: ${response.status} ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error(`[Veeshree] Failed to persist memory for user ${memory.userId}:`, error);
      return false;
    }
  }

  /**
   * Append a completed counterfactual decision reflection to the user's permanent memory.
   */
  async recordDecisionReflection(
    userId: string,
    decision: { dilemma: string; chosenPath: string; keyLearning?: string }
  ): Promise<boolean> {
    const existing = await this.getPersonaMemory(userId);
    const updatedMemory: UserPersonaMemory = {
      userId,
      corePriorities: existing?.corePriorities || [],
      riskTolerance: existing?.riskTolerance || "moderate",
      identifiedBiases: existing?.identifiedBiases || [],
      constraints: existing?.constraints || [],
      historicalDecisions: [
        ...(existing?.historicalDecisions || []),
        {
          ...decision,
          timestamp: new Date().toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    };

    return this.savePersonaMemory(updatedMemory);
  }
}

// Singleton export
export const veeshree = new VeeshreeClient();
