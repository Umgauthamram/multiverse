/**
 * Scene Store: MongoDB Persistence Layer for Multiverse Theater Scene Operations
 * Collection: "scene_ops"
 * Guarantees idempotent upserts, 24-hour TTL expiration, and cursor-based resume streaming.
 */

import { Db, Collection, ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";

export interface SceneOpDocument {
  _id?: ObjectId;
  sessionId: string;
  storyId: string | "*";
  quarter: number;
  idx: number;
  line: string;
  createdAt: Date;
}

export interface AppendSceneLineInput {
  storyId?: string | "*";
  quarter?: number;
  idx?: number;
  line: string;
}

export interface ReadLinesResult {
  lines: string[];
  nextCursor: string | null;
  ops: SceneOpDocument[];
}

export async function getSceneOpsCol(db?: Db): Promise<Collection<SceneOpDocument>> {
  const database = db || (await getDb());
  return database.collection<SceneOpDocument>("scene_ops");
}

let indexesInitialized = false;

/**
 * Initializes required unique and TTL indexes on scene_ops.
 */
export async function initSceneOpsIndexes(db?: Db): Promise<void> {
  const col = await getSceneOpsCol(db);
  try {
    await col.createIndex(
      { sessionId: 1, storyId: 1, quarter: 1, idx: 1 },
      { unique: true, name: "uniq_scene_op_idx" }
    );
    await col.createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 86400, name: "ttl_scene_ops_24h" }
    );
    await col.createIndex(
      { sessionId: 1, createdAt: 1, _id: 1 },
      { name: "cursor_scene_ops_idx" }
    );
    indexesInitialized = true;
  } catch (err) {
    console.warn("[SceneStore] Failed to create indexes on scene_ops:", err);
  }
}

/**
 * Appends Scene lines idempotently via upsert operations.
 */
export async function appendLines(
  sessionId: string,
  lines: AppendSceneLineInput[],
  db?: Db
): Promise<void> {
  if (!lines || lines.length === 0) return;

  const col = await getSceneOpsCol(db);
  if (!indexesInitialized) {
    await initSceneOpsIndexes(db);
  }

  const now = new Date();
  const operations = lines.map((item, index) => {
    const storyId = item.storyId ?? "*";
    const quarter = item.quarter ?? 0;
    const idx = item.idx ?? (quarter === 0 ? Date.now() + index : index);

    return {
      updateOne: {
        filter: { sessionId, storyId, quarter, idx },
        update: {
          $set: {
            sessionId,
            storyId,
            quarter,
            idx,
            line: item.line,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        upsert: true,
      },
    };
  });

  await col.bulkWrite(operations, { ordered: true });
}

/**
 * Serializes a cursor string from a SceneOpDocument.
 */
export function encodeCursor(doc: SceneOpDocument): string {
  const idStr = doc._id ? doc._id.toString() : "";
  const timeStr = doc.createdAt.toISOString();
  return Buffer.from(`${timeStr}|${idStr}`).toString("base64");
}

/**
 * Deserializes a cursor string into date and ObjectId components.
 */
export function decodeCursor(cursor: string): { createdAt: Date; id: ObjectId | null } | null {
  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const [timeStr, idStr] = decoded.split("|");
    const createdAt = new Date(timeStr);
    const id = idStr && ObjectId.isValid(idStr) ? new ObjectId(idStr) : null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

/**
 * Reads Scene Language lines after a given cursor for streaming replay or resume.
 */
export async function readLinesAfter(
  sessionId: string,
  cursor?: string | null,
  limit: number = 200,
  db?: Db
): Promise<ReadLinesResult> {
  const col = await getSceneOpsCol(db);
  const filter: Record<string, unknown> = { sessionId };

  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      if (decoded.id) {
        filter.$or = [
          { createdAt: { $gt: decoded.createdAt } },
          {
            createdAt: decoded.createdAt,
            _id: { $gt: decoded.id },
          },
        ];
      } else {
        filter.createdAt = { $gt: decoded.createdAt };
      }
    }
  }

  const ops = await col
    .find(filter)
    .sort({ createdAt: 1, _id: 1 })
    .limit(limit)
    .toArray();

  const lines = ops.map((op) => op.line);
  const lastOp = ops.length > 0 ? ops[ops.length - 1] : null;
  const nextCursor = lastOp ? encodeCursor(lastOp) : null;

  return {
    lines,
    nextCursor,
    ops,
  };
}
