import { Db, Collection, IndexDescription } from "mongodb";
import { z } from "zod";
import { getDb } from "@/lib/db/mongodb";
import { LifeStats } from "@/lib/simulation/statClamper";
import { LifeEvent } from "@/lib/simulation/eventRoller";
import {
  PersonaSeedType,
  TimelineBranch,
} from "@/lib/simulation/personaSeeder";
import { CastMember } from "@/lib/ai/agents/worldBuilder";

/**
 * Status of a multi-universe simulation session
 */
export type SimulationStatus = "pending" | "running" | "completed" | "failed";

export const SimulationStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
]);

/**
 * Zod Schema for the root Simulation Document
 */
export const SimulationDocumentSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().default("anonymous"),
  decisionPrompt: z.string().min(10).max(500),
  age: z.number().int().min(18).max(100),
  currentLocation: z.string().min(2),
  optionA: z.object({
    name: z.string().min(2),
    location: z.string().min(2),
    description: z.string().optional(),
  }),
  optionB: z.object({
    name: z.string().min(2),
    location: z.string().min(2),
    description: z.string().optional(),
  }),
  corePriorities: z.array(z.string()).min(1),
  status: SimulationStatusSchema.default("pending"),
  cast: z.array(z.custom<CastMember>()).optional(),
  branches: z.array(z.custom<TimelineBranch>()).optional(),
  totalTimelines: z.number().int().default(12),
  completedTimelines: z.number().int().default(0),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  completedAt: z.date().optional(),
});

export type SimulationDocument = z.infer<typeof SimulationDocumentSchema>;

/**
 * Zod Schema for an individual Timeline branch
 */
export const TimelineDocumentSchema = z.object({
  sessionId: z.string().min(1),
  timelineId: z.string().min(1),
  branchOption: z.enum(["A", "B"]),
  branchName: z.string().min(1),
  branchLocation: z.string().min(1),
  personaSeed: z.custom<PersonaSeedType>(),
  totalQuartersCompleted: z.number().int().min(0).max(20),
  finalStats: z.custom<LifeStats>(),
  finalSavings: z.number(),
  isBurnedOut: z.boolean(),
  lowestHappinessQuarter: z.number().int().optional(),
  peakCareerQuarter: z.number().int().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type TimelineDocument = z.infer<typeof TimelineDocumentSchema>;

/**
 * Zod Schema for a single 3-month quarterly step document
 */
export const TimelineStepDocumentSchema = z.object({
  sessionId: z.string().min(1),
  timelineId: z.string().min(1),
  branchOption: z.enum(["A", "B"]),
  branchName: z.string().min(1),
  branchLocation: z.string().min(1),
  personaSeed: z.custom<PersonaSeedType>(),
  quarter: z.number().int().min(1).max(20),
  month: z.number().int().min(3).max(60),
  startingSavings: z.number(),
  endingSavings: z.number(),
  netWorthDelta: z.number(),
  monthlyIncome: z.number(),
  monthlyBurn: z.number(),
  stats: z.custom<LifeStats>(),
  statDeltas: z.object({
    deltaHappiness: z.number(),
    deltaHealth: z.number(),
    deltaRelationships: z.number(),
    deltaCareer: z.number(),
  }),
  rolledEvent: z.custom<LifeEvent>(),
  diaryEntry: z.string(),
  reflection: z.string(),
  isBurnedOut: z.boolean(),
  status: z.enum(["active", "burned_out", "completed"]),
  recordedAt: z.date().default(() => new Date()),
});

export type TimelineStepDocument = z.infer<typeof TimelineStepDocumentSchema>;

/**
 * Collection Name Constants
 */
export const COLLECTIONS = {
  SIMULATIONS: "simulations",
  TIMELINES: "timelines",
  TIMELINE_STEPS: "timeline_steps",
} as const;

/**
 * Accessor Helpers
 */
export async function getSimulationsCol(
  db?: Db
): Promise<Collection<SimulationDocument>> {
  const database = db || (await getDb());
  return database.collection<SimulationDocument>(COLLECTIONS.SIMULATIONS);
}

export async function getTimelinesCol(
  db?: Db
): Promise<Collection<TimelineDocument>> {
  const database = db || (await getDb());
  return database.collection<TimelineDocument>(COLLECTIONS.TIMELINES);
}

export async function getTimelineStepsCol(
  db?: Db
): Promise<Collection<TimelineStepDocument>> {
  const database = db || (await getDb());
  return database.collection<TimelineStepDocument>(COLLECTIONS.TIMELINE_STEPS);
}

/**
 * Simulation Index Definitions
 */
export const SIMULATION_INDEXES: IndexDescription[] = [
  { key: { sessionId: 1 }, unique: true, name: "uniq_sessionId" },
  { key: { userId: 1, createdAt: -1 }, name: "idx_userId_createdAt" },
  { key: { status: 1, createdAt: -1 }, name: "idx_status_createdAt" },
];

export const TIMELINE_INDEXES: IndexDescription[] = [
  {
    key: { sessionId: 1, timelineId: 1 },
    unique: true,
    name: "uniq_sessionId_timelineId",
  },
  { key: { sessionId: 1, branchOption: 1 }, name: "idx_sessionId_branchOption" },
];

export const TIMELINE_STEP_INDEXES: IndexDescription[] = [
  {
    key: { sessionId: 1, timelineId: 1, quarter: 1 },
    unique: true,
    name: "uniq_sessionId_timelineId_quarter",
  },
  {
    key: { sessionId: 1, quarter: 1 },
    name: "idx_sessionId_quarter",
  },
  {
    key: { sessionId: 1, timelineId: 1, month: 1 },
    name: "idx_sessionId_timelineId_month",
  },
];

export interface IndexReport {
  simulationsIndexes: string[];
  timelinesIndexes: string[];
  stepsIndexes: string[];
}

/**
 * Ensures all required compound and unique performance indexes exist across
 * simulations, timelines, and timeline_steps collections.
 */
export async function ensureSimulationIndexes(db?: Db): Promise<IndexReport> {
  const database = db || (await getDb());

  const simCol = database.collection(COLLECTIONS.SIMULATIONS);
  const timeCol = database.collection(COLLECTIONS.TIMELINES);
  const stepCol = database.collection(COLLECTIONS.TIMELINE_STEPS);

  const simResults = await simCol.createIndexes(SIMULATION_INDEXES);
  const timeResults = await timeCol.createIndexes(TIMELINE_INDEXES);
  const stepResults = await stepCol.createIndexes(TIMELINE_STEP_INDEXES);

  return {
    simulationsIndexes: simResults,
    timelinesIndexes: timeResults,
    stepsIndexes: stepResults,
  };
}

export type CreateSimulationInput = z.input<typeof SimulationDocumentSchema>;

/**
 * Creates and initializes a new simulation document with validation
 */
export async function createSimulation(
  input: CreateSimulationInput,
  db?: Db
): Promise<SimulationDocument> {
  const doc = SimulationDocumentSchema.parse(input);
  const col = await getSimulationsCol(db);
  await col.insertOne(doc);
  return doc;
}

/**
 * Fetches a simulation document by sessionId
 */
export async function getSimulationBySessionId(
  sessionId: string,
  db?: Db
): Promise<SimulationDocument | null> {
  const col = await getSimulationsCol(db);
  return col.findOne({ sessionId });
}

/**
 * Updates a simulation status (e.g. running -> completed)
 */
export async function updateSimulationStatus(
  sessionId: string,
  status: SimulationStatus,
  db?: Db
): Promise<boolean> {
  const col = await getSimulationsCol(db);
  const updateDoc: Record<string, unknown> = {
    status,
    updatedAt: new Date(),
  };
  if (status === "completed") {
    updateDoc.completedAt = new Date();
  }
  const result = await col.updateOne({ sessionId }, { $set: updateDoc });
  return result.matchedCount > 0;
}

/**
 * Retrieves all timeline steps for a given session (used by HUD visualizer)
 */
export async function getTimelineStepsBySession(
  sessionId: string,
  db?: Db
): Promise<TimelineStepDocument[]> {
  const col = await getTimelineStepsCol(db);
  return col
    .find({ sessionId })
    .sort({ quarter: 1, timelineId: 1 })
    .toArray();
}

/**
 * Retrieval benchmark helper: Measures performance when retrieving all quarter steps
 * for a simulation session.
 */
export async function benchmarkStepRetrieval(
  sessionId: string,
  db?: Db
): Promise<{ count: number; durationMs: number }> {
  const col = await getTimelineStepsCol(db);
  const start = performance.now();
  const steps = await col.find({ sessionId }).sort({ quarter: 1 }).toArray();
  const durationMs = performance.now() - start;

  return {
    count: steps.length,
    durationMs,
  };
}
