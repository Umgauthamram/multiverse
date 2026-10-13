import { EventEmitter } from "node:events";
import { TimelineQuarterRecord } from "@/lib/simulation/timelineRunner";

export type StreamEventType =
  | "connected"
  | "quarter_step"
  | "timeline_complete"
  | "simulation_complete"
  | "error"
  | "heartbeat";

export interface StreamMessage {
  event: StreamEventType;
  data: unknown;
}

/**
 * Formats a payload into the standard Server-Sent Events (SSE) wire protocol.
 */
export function formatSSE(event: StreamEventType, data: unknown): string {
  const json = typeof data === "string" ? data : JSON.stringify(data);
  return `event: ${event}\ndata: ${json}\n\n`;
}

/**
 * Pub/Sub Stream Manager coordinating real-time Server-Sent Events across
 * simulation workers and client HTTP streaming connections.
 */
class SimulationStreamManager extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(200);
  }

  /**
   * Broadcasts a completed quarter step to any active SSE subscribers for the session.
   */
  public emitStep(step: TimelineQuarterRecord): void {
    this.emit(`step:${step.sessionId}`, step);
  }

  /**
   * Signals that an entire simulation session or timeline branch has completed.
   */
  public emitComplete(sessionId: string, summary?: unknown): void {
    this.emit(`complete:${sessionId}`, summary || { sessionId, status: "completed" });
  }

  /**
   * Broadcasts an unexpected error to active session subscribers.
   */
  public emitError(sessionId: string, error: unknown): void {
    this.emit(`error:${sessionId}`, error);
  }

  /**
   * Subscribes a listener callback to events for a specific simulation session.
   * Returns an unsubscribe cleanup function.
   */
  public subscribe(
    sessionId: string,
    callbacks: {
      onStep: (step: TimelineQuarterRecord) => void;
      onComplete?: (summary: unknown) => void;
      onError?: (err: unknown) => void;
    }
  ): () => void {
    const stepChannel = `step:${sessionId}`;
    const completeChannel = `complete:${sessionId}`;
    const errorChannel = `error:${sessionId}`;

    this.on(stepChannel, callbacks.onStep);
    if (callbacks.onComplete) this.on(completeChannel, callbacks.onComplete);
    if (callbacks.onError) this.on(errorChannel, callbacks.onError);

    return () => {
      this.off(stepChannel, callbacks.onStep);
      if (callbacks.onComplete) this.off(completeChannel, callbacks.onComplete);
      if (callbacks.onError) this.off(errorChannel, callbacks.onError);
    };
  }
}

declare global {
  var _simulationStreamManager: SimulationStreamManager | undefined;
}

export const streamManager: SimulationStreamManager =
  globalThis._simulationStreamManager ?? new SimulationStreamManager();

if (process.env.NODE_ENV !== "production") {
  globalThis._simulationStreamManager = streamManager;
}
