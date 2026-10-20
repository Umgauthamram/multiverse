import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  appendLines,
  readLinesAfter,
  initSceneOpsIndexes,
  encodeCursor,
  decodeCursor,
  SceneOpDocument,
} from "@/lib/scene/sceneStore";
import { Db, Collection, ObjectId } from "mongodb";

describe("Phase 2: Scene Store MongoDB Layer", () => {
  let storedDocs: SceneOpDocument[];
  let createdIndexes: Array<{ keys: Record<string, unknown>; options?: Record<string, unknown> }>;
  let mockCol: Partial<Collection<SceneOpDocument>>;
  let mockDb: Db;

  beforeEach(() => {
    storedDocs = [];
    createdIndexes = [];

    mockCol = {
      createIndex: vi.fn(async (keys, options) => {
        createdIndexes.push({ keys: keys as Record<string, unknown>, options });
        return "idx_created";
      }) as unknown as Collection<SceneOpDocument>["createIndex"],
      bulkWrite: vi.fn(async (ops: Array<{ updateOne?: { filter: { sessionId: string; storyId: string; quarter: number; idx: number }; update: { $set: { line: string }; $setOnInsert?: { createdAt: Date } } } }>) => {
        for (const op of ops) {
          if (op.updateOne) {
            const { filter, update } = op.updateOne;
            const existingIndex = storedDocs.findIndex(
              (doc) =>
                doc.sessionId === filter.sessionId &&
                doc.storyId === filter.storyId &&
                doc.quarter === filter.quarter &&
                doc.idx === filter.idx
            );

            if (existingIndex >= 0) {
              // Update existing document in place (idempotency)
              storedDocs[existingIndex] = {
                ...storedDocs[existingIndex],
                ...update.$set,
              };
            } else {
              // Insert new document
              const newDoc: SceneOpDocument = {
                _id: new ObjectId(),
                sessionId: filter.sessionId,
                storyId: filter.storyId,
                quarter: filter.quarter,
                idx: filter.idx,
                line: update.$set.line,
                createdAt: update.$setOnInsert?.createdAt || new Date(),
              };
              storedDocs.push(newDoc);
            }
          }
        }
        return { ok: 1, insertedCount: 0, matchedCount: 0, modifiedCount: 0, deletedCount: 0, upsertedCount: ops.length, upsertedIds: {} } as unknown as Awaited<ReturnType<Collection<SceneOpDocument>["bulkWrite"]>>;
      }) as unknown as Collection<SceneOpDocument>["bulkWrite"],
      find: vi.fn((filter: { sessionId?: string; $or?: Array<{ createdAt: { $gt: Date } } | { createdAt: Date; _id: { $gt: ObjectId } }> }) => {
        let results = [...storedDocs];

        if (filter.sessionId) {
          results = results.filter((d) => d.sessionId === filter.sessionId);
        }

        if (filter.$or) {
          const first = filter.$or[0] as { createdAt: { $gt: Date } };
          const second = filter.$or[1] as { createdAt: Date; _id: { $gt: ObjectId } };
          const afterDate = first.createdAt.$gt;
          const sameDate = second.createdAt;
          const afterId = second._id.$gt;

          results = results.filter((d) => {
            if (d.createdAt.getTime() > afterDate.getTime()) return true;
            if (
              d.createdAt.getTime() === sameDate.getTime() &&
              d._id &&
              afterId &&
              d._id.toString() > afterId.toString()
            ) {
              return true;
            }
            return false;
          });
        }

        return {
          sort: vi.fn().mockReturnThis(),
          limit: vi.fn().mockImplementation((limitNum: number) => ({
            toArray: async () => results.slice(0, limitNum),
          })),
          toArray: async () => results,
        } as unknown as ReturnType<Collection<SceneOpDocument>["find"]>;
      }) as unknown as Collection<SceneOpDocument>["find"],
    };

    mockDb = {
      collection: vi.fn(() => mockCol as Collection<SceneOpDocument>),
    } as unknown as Db;
  });

  it("initializes unique index and 24-hour TTL index", async () => {
    await initSceneOpsIndexes(mockDb);

    expect(createdIndexes).toHaveLength(3);
    expect(createdIndexes[0].keys).toEqual({
      sessionId: 1,
      storyId: 1,
      quarter: 1,
      idx: 1,
    });
    expect(createdIndexes[0].options?.unique).toBe(true);

    expect(createdIndexes[1].keys).toEqual({ createdAt: 1 });
    expect(createdIndexes[1].options?.expireAfterSeconds).toBe(86400);
  });

  it("ensures upsert idempotency: same quarter written twice yields exactly one row", async () => {
    const sessionId = "sess_idemp_test";
    const linePayload = [
      {
        storyId: "S1",
        quarter: 1,
        idx: 0,
        line: "@S1/Q1 ROLL ev=steady sev=neu title=\"Steady state\"",
      },
      {
        storyId: "S1",
        quarter: 1,
        idx: 1,
        line: "@S1/Q1 CALC cash0=25000 inc=5000 exp=2500 evc=0 cash1=32500",
      },
    ];

    // First write
    await appendLines(sessionId, linePayload, mockDb);
    expect(storedDocs).toHaveLength(2);

    // Second write (e.g. QStash retry with same items)
    await appendLines(sessionId, linePayload, mockDb);
    expect(storedDocs).toHaveLength(2); // Still exactly 2, no duplicates
    expect(storedDocs[0].line).toBe(linePayload[0].line);
  });

  it("encodes and decodes cursor tokens correctly", () => {
    const id = new ObjectId();
    const doc: SceneOpDocument = {
      _id: id,
      sessionId: "test-sess",
      storyId: "S1",
      quarter: 1,
      idx: 0,
      line: "test line",
      createdAt: new Date("2026-10-19T10:00:00.000Z"),
    };

    const encoded = encodeCursor(doc);
    expect(typeof encoded).toBe("string");

    const decoded = decodeCursor(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded?.createdAt.toISOString()).toBe("2026-10-19T10:00:00.000Z");
    expect(decoded?.id?.toString()).toBe(id.toString());
  });

  it("reads lines ordered and correctly resumes via cursor", async () => {
    const sessionId = "sess_resume_test";
    const baseTime = new Date("2026-10-19T10:00:00.000Z").getTime();

    // Insert 4 sequential lines
    for (let i = 0; i < 4; i++) {
      storedDocs.push({
        _id: new ObjectId(),
        sessionId,
        storyId: "S1",
        quarter: i + 1,
        idx: 0,
        line: `@S1/Q${i + 1} DONE`,
        createdAt: new Date(baseTime + i * 1000),
      });
    }

    // First read: limit 2
    const firstPage = await readLinesAfter(sessionId, null, 2, mockDb);
    expect(firstPage.lines).toHaveLength(2);
    expect(firstPage.lines[0]).toBe("@S1/Q1 DONE");
    expect(firstPage.lines[1]).toBe("@S1/Q2 DONE");
    expect(firstPage.nextCursor).not.toBeNull();

    // Second read: using cursor from first page
    const secondPage = await readLinesAfter(sessionId, firstPage.nextCursor, 2, mockDb);
    expect(secondPage.lines).toHaveLength(2);
    expect(secondPage.lines[0]).toBe("@S1/Q3 DONE");
    expect(secondPage.lines[1]).toBe("@S1/Q4 DONE");
  });
});
