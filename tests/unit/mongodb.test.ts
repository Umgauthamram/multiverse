import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getMongoClientPromise,
  getMongoClient,
  getDb,
  isMongoConnected,
  closeMongoConnection,
} from "@/lib/db/mongodb";
import { MongoClient } from "mongodb";

describe("Phase 4: MongoDB Atlas Client & Connection Pool", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await closeMongoConnection();
  });

  afterEach(async () => {
    await closeMongoConnection();
  });

  it("throws descriptive error when no URI is configured", () => {
    expect(() => getMongoClientPromise("")).toThrow(
      /Cannot connect: MONGODB_URI is not defined/
    );
  });

  it("caches and reuses the same connection promise (singleton behavior)", async () => {
    const mockClient = {
      db: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
    } as unknown as MongoClient;

    const connectSpy = vi
      .spyOn(MongoClient.prototype, "connect")
      .mockResolvedValue(mockClient);

    const promise1 = getMongoClientPromise("mongodb://localhost:27017/test");
    const promise2 = getMongoClientPromise("mongodb://localhost:27017/test");

    expect(promise1).toBe(promise2);
    expect(connectSpy).toHaveBeenCalledTimes(1);

    const client = await promise1;
    expect(client).toBe(mockClient);
  });

  it("retrieves the database handle via getDb", async () => {
    const mockDb = { databaseName: "multiverse_you" };
    const mockClient = {
      db: vi.fn().mockReturnValue(mockDb),
      close: vi.fn().mockResolvedValue(undefined),
    } as unknown as MongoClient;

    vi.spyOn(MongoClient.prototype, "connect").mockResolvedValue(mockClient);

    const db = await getDb("multiverse_you", "mongodb://localhost:27017/test");
    expect(db).toBe(mockDb);
    expect(mockClient.db).toHaveBeenCalledWith("multiverse_you");
  });

  it("performs health check ping successfully when connected", async () => {
    const mockAdmin = {
      ping: vi.fn().mockResolvedValue({ ok: 1 }),
    };
    const mockDb = {
      admin: vi.fn().mockReturnValue(mockAdmin),
    };
    const mockClient = {
      db: vi.fn().mockReturnValue(mockDb),
      close: vi.fn().mockResolvedValue(undefined),
    } as unknown as MongoClient;

    vi.spyOn(MongoClient.prototype, "connect").mockResolvedValue(mockClient);

    const healthy = await isMongoConnected("mongodb://localhost:27017/test");
    expect(healthy).toBe(true);
    expect(mockAdmin.ping).toHaveBeenCalled();
  });

  it("handles ping error gracefully and returns false", async () => {
    const mockAdmin = {
      ping: vi.fn().mockRejectedValue(new Error("Connection timeout")),
    };
    const mockDb = {
      admin: vi.fn().mockReturnValue(mockAdmin),
    };
    const mockClient = {
      db: vi.fn().mockReturnValue(mockDb),
      close: vi.fn().mockResolvedValue(undefined),
    } as unknown as MongoClient;

    vi.spyOn(MongoClient.prototype, "connect").mockResolvedValue(mockClient);

    const healthy = await isMongoConnected("mongodb://localhost:27017/test");
    expect(healthy).toBe(false);
  });

  it("cleans up connection cleanly on closeMongoConnection", async () => {
    const closeSpy = vi.fn().mockResolvedValue(undefined);
    const mockClient = {
      db: vi.fn(),
      close: closeSpy,
    } as unknown as MongoClient;

    vi.spyOn(MongoClient.prototype, "connect").mockResolvedValue(mockClient);

    await getMongoClient("mongodb://localhost:27017/test");
    await closeMongoConnection();

    expect(closeSpy).toHaveBeenCalled();
  });
});
