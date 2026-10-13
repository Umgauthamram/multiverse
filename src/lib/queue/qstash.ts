/**
 * Upstash QStash Client & Signature Verification Engine
 * Provides asynchronous job dispatching, chunk scheduling, and cryptographic webhook verification.
 */

import { Client, Receiver } from "@upstash/qstash";
import { env } from "@/lib/env";

export interface BatchJobPayload {
  sessionId: string;
  timelineId: string;
  branchOption: "A" | "B";
  personaSeed: string;
  startQuarter: number; // e.g. 1, 6, 11, 16
  endQuarter: number; // e.g. 5, 10, 15, 20
  currentLiquidSavings: number;
  currentMonthlyBurn: number;
  currentStats: {
    happiness: number;
    health: number;
    relationships: number;
    career: number;
  };
}

let qstashClient: Client | null = null;
let qstashReceiver: Receiver | null = null;

/**
 * Returns the singleton QStash Client instance, or null if QSTASH_TOKEN is unconfigured.
 */
export function getQStashClient(): Client | null {
  const token = env.QSTASH_TOKEN || process.env.QSTASH_TOKEN;
  if (!token) {
    return null;
  }

  if (!qstashClient) {
    qstashClient = new Client({
      token,
      baseUrl: env.QSTASH_URL || process.env.QSTASH_URL || "https://qstash.upstash.io/v2",
    });
  }

  return qstashClient;
}

/**
 * Returns the QStash cryptographic Receiver instance for verifying webhooks.
 */
export function getQStashReceiver(): Receiver | null {
  const currentKey =
    env.QSTASH_CURRENT_SIGNING_KEY || process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextKey =
    env.QSTASH_NEXT_SIGNING_KEY || process.env.QSTASH_NEXT_SIGNING_KEY;

  if (!currentKey) {
    return null;
  }

  if (!qstashReceiver) {
    qstashReceiver = new Receiver({
      currentSigningKey: currentKey,
      nextSigningKey: nextKey || currentKey,
    });
  }

  return qstashReceiver;
}

/**
 * Verifies that an incoming HTTP request originated authentically from Upstash QStash.
 */
export async function verifyQStashSignature(
  signature: string | null,
  rawBody: string,
  url?: string
): Promise<boolean> {
  if (!signature) {
    return false;
  }

  const receiver = getQStashReceiver();
  if (!receiver) {
    // In local development or test mode when signing keys are omitted, allow dev bypass if explicit flag set
    if (
      process.env.NODE_ENV === "development" &&
      process.env.ALLOW_DEV_QSTASH_BYPASS === "true"
    ) {
      return true;
    }
    return false;
  }

  try {
    return await receiver.verify({
      signature,
      body: rawBody,
      url,
    });
  } catch {
    return false;
  }
}

/**
 * Dispatches an asynchronous batch simulation step to QStash.
 */
export async function dispatchBatchJob(params: {
  destinationUrl: string;
  payload: BatchJobPayload;
  delaySeconds?: number;
}): Promise<{ messageId: string; mode: "qstash" | "direct" }> {
  const client = getQStashClient();

  if (!client) {
    // Graceful offline development fallback
    return {
      messageId: `mock_${Date.now()}_${params.payload.timelineId}`,
      mode: "direct",
    };
  }

  const result = await client.publishJSON({
    url: params.destinationUrl,
    body: params.payload,
    delay: params.delaySeconds,
  });

  return {
    messageId: result.messageId,
    mode: "qstash",
  };
}
