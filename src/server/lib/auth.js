/**
 * Admin authentication helpers
 *
 * The admin password is read from ADMIN_PASSWORD. Successful logins receive an
 * HS256 JWT signed with ADMIN_SECRET (falls back to ADMIN_PASSWORD), which must
 * be sent as `Authorization: Bearer <token>` on protected routes.
 */

import { sign, verify } from "hono/jwt";
import { AppError } from "./errors.js";

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

/**
 * Read admin settings from the environment
 * @param {import('hono').Context} c - Hono context
 * @returns {{ password: string, secret: string }}
 */
function getAdminConfig(c) {
  const password = c.env?.ADMIN_PASSWORD;

  if (typeof password !== "string" || password.length === 0) {
    throw new AppError(
      "Admin panel is not configured. Set ADMIN_PASSWORD.",
      500,
      "ADMIN_NOT_CONFIGURED",
    );
  }

  return { password, secret: c.env?.ADMIN_SECRET || password };
}

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
}

/**
 * Compare a candidate password against ADMIN_PASSWORD in constant time
 * @param {import('hono').Context} c - Hono context
 * @param {string} candidate - Password sent by the client
 * @returns {Promise<boolean>}
 */
export async function isValidAdminPassword(c, candidate) {
  const { password } = getAdminConfig(c);
  const [a, b] = await Promise.all([sha256(candidate), sha256(password)]);

  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/**
 * Create a signed admin session token
 * @param {import('hono').Context} c - Hono context
 * @returns {Promise<string>}
 */
export async function createAdminToken(c) {
  const { secret } = getAdminConfig(c);
  const now = Math.floor(Date.now() / 1000);

  return sign(
    { role: "admin", iat: now, exp: now + TOKEN_TTL_SECONDS },
    secret,
    "HS256",
  );
}

/**
 * Middleware that only lets requests with a valid admin token through
 */
export async function requireAdmin(c, next) {
  const { secret } = getAdminConfig(c);
  const header = c.req.header("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    throw new UnauthorizedError();
  }

  try {
    const payload = await verify(token, secret, "HS256");
    if (payload.role !== "admin") {
      throw new Error("Invalid role");
    }
  } catch {
    throw new UnauthorizedError("Session expired, please log in again");
  }

  await next();
}
