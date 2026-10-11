import { MongoClient, Db, MongoClientOptions } from "mongodb";
import { env } from "@/lib/env";

/**
 * MongoDB Atlas Connection Pool & Singleton Client
 * Optimized for serverless Next.js runtimes by caching the connection promise
 * across invocations and HMR reloads on globalThis.
 */

const uri = env.MONGODB_URI || process.env.MONGODB_URI;

const options: MongoClientOptions = {
  maxPoolSize: 10,
  minPoolSize: 1,
  maxIdleTimeMS: 60000,
  serverSelectionTimeoutMS: 5000,
};

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

/**
 * Creates or retrieves the singleton MongoClient connection promise.
 * Can accept a custom URI for testing or isolation.
 */
export function getMongoClientPromise(customUri?: string): Promise<MongoClient> {
  const targetUri = customUri || uri;

  if (!targetUri) {
    throw new Error(
      "[MongoDB] Cannot connect: MONGODB_URI is not defined in environment variables."
    );
  }

  // In development, preserve connection on globalThis to prevent exhaustion during HMR
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(targetUri, options);
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  }

  // In production or testing, create and cache at module level if not already cached
  if (!clientPromise) {
    const client = new MongoClient(targetUri, options);
    clientPromise = client.connect();
  }

  return clientPromise;
}

/**
 * Retrieves the connected MongoClient instance.
 */
export async function getMongoClient(customUri?: string): Promise<MongoClient> {
  return getMongoClientPromise(customUri);
}

/**
 * Retrieves a MongoDB Database instance.
 * Defaults to "multiverse_you" or the database defined in the connection string.
 */
export async function getDb(dbName: string = "multiverse_you", customUri?: string): Promise<Db> {
  const client = await getMongoClient(customUri);
  return client.db(dbName);
}

/**
 * Health check helper to verify database connectivity.
 */
export async function isMongoConnected(customUri?: string): Promise<boolean> {
  try {
    const client = await getMongoClient(customUri);
    const adminDb = client.db().admin();
    const pingResult = await adminDb.ping();
    return !!pingResult.ok;
  } catch (error) {
    console.warn("[MongoDB] Health check ping failed:", error);
    return false;
  }
}

/**
 * Helper to close and teardown connection (useful for tests or graceful shutdown).
 */
export async function closeMongoConnection(): Promise<void> {
  if (global._mongoClientPromise) {
    const client = await global._mongoClientPromise;
    await client.close();
    global._mongoClientPromise = undefined;
  }
  if (clientPromise) {
    const client = await clientPromise;
    await client.close();
    // @ts-expect-error reset internal promise for testing
    clientPromise = undefined;
  }
}
