import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getRedisClient,
  resetRedisClient,
  acquireLock,
  releaseLock,
  withLock,
  isRedisConnected,
} from "@/lib/redis/client";
import { Redis } from "@upstash/redis";

describe("Phase 5: Upstash Redis & Distributed Lock Engine", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetRedisClient();
  });

  it("throws descriptive error when required credentials are missing", () => {
    expect(() => getRedisClient("", "")).toThrow(
      /UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be configured/
    );
  });

  it("successfully acquires lock with NX EX parameters", async () => {
    const mockRedis = {
      set: vi.fn().mockResolvedValue("OK"),
    } as unknown as Redis;

    const token = await acquireLock("timeline-batch-1", 15, "worker-abc", mockRedis);

    expect(token).toBe("worker-abc");
    expect(mockRedis.set).toHaveBeenCalledWith(
      "lock:timeline-batch-1",
      "worker-abc",
      { nx: true, ex: 15 }
    );
  });

  it("returns null when resource is already locked by another worker", async () => {
    const mockRedis = {
      set: vi.fn().mockResolvedValue(null),
    } as unknown as Redis;

    const token = await acquireLock("timeline-batch-1", 15, "worker-2", mockRedis);

    expect(token).toBeNull();
  });

  it("releases lock via Lua script when owner token matches", async () => {
    const mockRedis = {
      eval: vi.fn().mockResolvedValue(1),
    } as unknown as Redis;

    const released = await releaseLock("timeline-batch-1", "worker-abc", mockRedis);

    expect(released).toBe(true);
    expect(mockRedis.eval).toHaveBeenCalledWith(
      expect.stringContaining('redis.call("get", KEYS[1])'),
      ["lock:timeline-batch-1"],
      ["worker-abc"]
    );
  });

  it("fails to release lock if token does not match or expired", async () => {
    const mockRedis = {
      eval: vi.fn().mockResolvedValue(0),
    } as unknown as Redis;

    const released = await releaseLock("timeline-batch-1", "stale-worker", mockRedis);

    expect(released).toBe(false);
  });

  it("withLock wraps execution and guarantees lock release in finally block", async () => {
    const mockRedis = {
      set: vi.fn().mockResolvedValue("OK"),
      eval: vi.fn().mockResolvedValue(1),
    } as unknown as Redis;

    let executed = false;

    const result = await withLock(
      "simulation-run-123",
      async () => {
        executed = true;
        return "simulation_complete";
      },
      30,
      mockRedis
    );

    expect(executed).toBe(true);
    expect(result).toBe("simulation_complete");
    expect(mockRedis.set).toHaveBeenCalledTimes(1);
    expect(mockRedis.eval).toHaveBeenCalledTimes(1);
  });

  it("withLock releases lock even when action throws", async () => {
    const mockRedis = {
      set: vi.fn().mockResolvedValue("OK"),
      eval: vi.fn().mockResolvedValue(1),
    } as unknown as Redis;

    await expect(
      withLock(
        "faulty-job",
        async () => {
          throw new Error("Simulated worker crash");
        },
        30,
        mockRedis
      )
    ).rejects.toThrow("Simulated worker crash");

    expect(mockRedis.eval).toHaveBeenCalledTimes(1);
  });

  it("withLock throws when lock cannot be acquired", async () => {
    const mockRedis = {
      set: vi.fn().mockResolvedValue(null),
    } as unknown as Redis;

    await expect(
      withLock("busy-resource", async () => "never_called", 30, mockRedis)
    ).rejects.toThrow(/Failed to acquire lock for resource: "busy-resource"/);
  });

  it("isRedisConnected verifies ping status correctly", async () => {
    const mockRedis = {
      ping: vi.fn().mockResolvedValue("PONG"),
    } as unknown as Redis;

    const connected = await isRedisConnected(mockRedis);
    expect(connected).toBe(true);

    const brokenRedis = {
      ping: vi.fn().mockRejectedValue(new Error("Network timeout")),
    } as unknown as Redis;

    const broken = await isRedisConnected(brokenRedis);
    expect(broken).toBe(false);
  });
});
