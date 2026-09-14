/**
 * Vercel serverless entrypoint for the Hono API.
 *
 * Catch-all so every /api/* path reaches the app, which mounts its routes
 * under /api (see src/server/index.js).
 *
 * Vercel's Node runtime invokes handlers with (req, res) from node:http, but
 * Hono expects a web Request and returns a web Response, so we translate in
 * both directions here.
 */

import app from "../src/server/index.js";

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function toWebRequest(req, body) {
  const host = req.headers.host ?? "localhost";
  const proto = req.headers["x-forwarded-proto"] ?? "https";
  const url = new URL(req.url, `${proto}://${host}`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else {
      headers.set(key, value);
    }
  }

  return new Request(url, {
    method: req.method,
    headers,
    body: body.length > 0 ? body : undefined,
  });
}

export default async function handler(req, res) {
  const method = req.method ?? "GET";
  const body =
    method === "GET" || method === "HEAD"
      ? Buffer.alloc(0)
      : await readBody(req);

  // Routes read their configuration from c.env, so expose process.env there,
  // mirroring what src/server/server.js does for Node.
  const response = await app.fetch(toWebRequest(req, body), { ...process.env });

  res.statusCode = response.status;

  // Set-Cookie must stay as separate headers; Headers joins them otherwise.
  const setCookie = response.headers.getSetCookie?.() ?? [];
  if (setCookie.length > 0) {
    res.setHeader("set-cookie", setCookie);
  }
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "set-cookie") res.setHeader(key, value);
  });

  res.end(Buffer.from(await response.arrayBuffer()));
}
