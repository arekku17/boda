/**
 * Unit tests for Admin API routes
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import adminRoutes from "./routes.js";
import { AppError } from "../../lib/errors.js";

const ENV = { ADMIN_PASSWORD: "test-password" };

function login(app, password, env = ENV) {
  return app.request(
    "/admin/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    },
    env,
  );
}

describe("admin routes", () => {
  let app;

  beforeEach(() => {
    app = new Hono();

    // Add error handler identical to src/server/index.js
    app.onError((err, c) => {
      if (err instanceof AppError) {
        return c.json(
          { success: false, error: err.message, code: err.code },
          err.status,
        );
      }
      return c.json({ success: false, error: "Internal server error" }, 500);
    });

    app.route("/admin", adminRoutes);
  });

  describe("POST /admin/login", () => {
    it("should return a token for the correct password", async () => {
      const res = await login(app, "test-password");
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.token).toEqual(expect.any(String));
    });

    it("should return 401 for a wrong password", async () => {
      const res = await login(app, "wrong");

      expect(res.status).toBe(401);
    });

    it("should return 500 when ADMIN_PASSWORD is not configured", async () => {
      const res = await login(app, "test-password", {});
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.code).toBe("ADMIN_NOT_CONFIGURED");
    });
  });

  describe("GET /admin/session", () => {
    it("should accept a token issued by login", async () => {
      const { data } = await (await login(app, "test-password")).json();

      const res = await app.request(
        "/admin/session",
        { headers: { Authorization: `Bearer ${data.token}` } },
        ENV,
      );

      expect(res.status).toBe(200);
    });

    it("should reject a token signed with another secret", async () => {
      const { data } = await (await login(app, "test-password")).json();

      const res = await app.request(
        "/admin/session",
        { headers: { Authorization: `Bearer ${data.token}` } },
        { ADMIN_PASSWORD: "different-password" },
      );

      expect(res.status).toBe(401);
    });
  });
});
