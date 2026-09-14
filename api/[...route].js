/**
 * Vercel serverless entrypoint for the Hono API.
 *
 * Catch-all so every /api/* path reaches the app, which mounts its routes
 * under /api (see src/server/index.js).
 */

import app from "../src/server/index.js";

export default function handler(request) {
  // Routes read their configuration from c.env, so expose process.env there,
  // mirroring what src/server/server.js does for Node.
  return app.fetch(request, { ...process.env });
}
