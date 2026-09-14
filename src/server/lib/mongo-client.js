/**
 * MongoDB connection helper
 *
 * Reads MONGODB_URI (and optionally MONGODB_DB, default "invitaciones") from
 * the request env. Clients are created lazily and cached per URI for the
 * lifetime of the runtime instance, so we never reconnect per request.
 */

import { MongoClient } from "mongodb";
import { AppError } from "./errors.js";

const DEFAULT_DB_NAME = "invitaciones";

// Module-scoped cache: uri -> Promise<MongoClient>
const clientCache = new Map();

function connect(uri) {
  const clientPromise = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
  }).connect();

  // Forget failed connections so the next request can retry
  clientPromise.catch(() => clientCache.delete(uri));
  clientCache.set(uri, clientPromise);

  return clientPromise;
}

/**
 * Get the MongoDB database for the current request context.
 * @param {import('hono').Context} c - Hono context
 * @returns {Promise<import('mongodb').Db>}
 */
export async function getMongoDb(c) {
  const uri = c.env?.MONGODB_URI;

  if (typeof uri !== "string" || uri.length === 0) {
    throw new AppError(
      "No MongoDB connection available. Set MONGODB_URI.",
      500,
      "DATABASE_NOT_CONFIGURED",
    );
  }

  let client;
  try {
    client = await (clientCache.get(uri) || connect(uri));
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw new AppError(
      "Could not connect to MongoDB",
      503,
      "DATABASE_UNAVAILABLE",
    );
  }

  return client.db(c.env?.MONGODB_DB || DEFAULT_DB_NAME);
}
