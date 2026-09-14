/**
 * Admin Feature - API Routes
 * Password login for the /admin panel
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { adminLoginSchema } from "./admin.schema.js";
import {
  createAdminToken,
  isValidAdminPassword,
  requireAdmin,
  UnauthorizedError,
} from "../../lib/auth.js";

const adminRoutes = new Hono();

/**
 * POST /admin/login
 * Exchange the admin password for a session token
 */
adminRoutes.post("/login", zValidator("json", adminLoginSchema), async (c) => {
  const { password } = c.req.valid("json");

  if (!(await isValidAdminPassword(c, password))) {
    throw new UnauthorizedError("Incorrect password");
  }

  const token = await createAdminToken(c);
  return c.json({ success: true, data: { token } });
});

/**
 * GET /admin/session
 * Check whether the current token is still valid
 */
adminRoutes.get("/session", requireAdmin, (c) => {
  return c.json({ success: true });
});

export default adminRoutes;
