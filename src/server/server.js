import { serve } from "@hono/node-server";
import dns from "node:dns";
import app from "./index.js";

// Load .env when running with Node (Bun loads it automatically)
try {
  process.loadEnvFile();
} catch {
  // No .env file
}

// Optional DNS override, e.g. when the local resolver refuses the SRV lookups
// that mongodb+srv:// connection strings need
if (process.env.DNS_SERVERS) {
  dns.setServers(process.env.DNS_SERVERS.split(",").map((server) => server.trim()));
}

const port = process.env.PORT || 3000;
console.log(`🚀 Server is running on http://localhost:${port}`);

serve({
  // Routes read their configuration from c.env, so expose process.env there
  fetch: (request, env) => app.fetch(request, { ...env, ...process.env }),
  port,
});
