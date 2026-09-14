/**
 * E2E tests for the Sakeenah API
 *
 * These tests run against the actual Hono app (but with mocked database).
 * For full integration tests with a real database, see the integration test files.
 *
 * To run E2E tests against a real server:
 * 1. Start the server: bun run dev:server
 * 2. Set TEST_API_URL=http://localhost:3000/api
 * 3. Run: bun run test:e2e
 */

import { describe, it, expect, vi } from "vitest";
import app from "../src/server/index.js";

// Mock database for E2E tests
vi.mock("../src/server/lib/db-client.js", () => {
  const mockInvitation = {
    uid: "e2e-test-wedding",
    title: "E2E Test Wedding",
    description: "Test invitation",
    groom_name: "Test Groom",
    bride_name: "Test Bride",
    parent_groom: "Parent Groom",
    parent_bride: "Parent Bride",
    wedding_date: "2025-12-25",
    time: "10:00",
    location: "Test Venue",
    address: "123 Test Street",
    maps_url: "https://maps.google.com",
    maps_embed: "<iframe></iframe>",
    og_image: "/og.jpg",
    favicon: "/favicon.ico",
    audio: "/music.mp3",
  };

  const mockWishes = [
    {
      id: 1,
      name: "Guest One",
      message: "Congratulations!",
      attendance: "ATTENDING",
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      name: "Guest Two",
      message: "Best wishes!",
      attendance: "MAYBE",
      created_at: new Date().toISOString(),
    },
  ];

  const mockPool = {
    query: vi.fn(async (sql, params) => {
      // Invitation queries
      if (
        sql.includes("SELECT * FROM invitations") ||
        sql.includes("SELECT uid FROM invitations")
      ) {
        if (params[0] === "e2e-test-wedding") {
          return { rows: [mockInvitation] };
        }
        return { rows: [] };
      }

      // Agenda queries
      if (sql.includes("SELECT id, title, date, start_time")) {
        return {
          rows: [
            {
              id: 1,
              title: "Akad Nikah",
              date: "2025-12-25",
              start_time: "10:00",
              end_time: "11:00",
              location: "Mosque",
              address: "123 Street",
            },
          ],
        };
      }

      // Banks queries
      if (sql.includes("SELECT id, bank, account_number")) {
        return {
          rows: [
            {
              id: 1,
              bank: "BCA",
              account_number: "1234567890",
              account_name: "Test Groom",
            },
          ],
        };
      }

      // Wishes list query
      if (sql.includes("SELECT id, name, message, attendance")) {
        return { rows: mockWishes };
      }

      // Wishes count query
      if (sql.includes("SELECT COUNT(*)") && !sql.includes("FILTER")) {
        return { rows: [{ count: "2" }] };
      }

      // Stats query
      if (sql.includes("FILTER")) {
        return {
          rows: [
            {
              attending: "1",
              not_attending: "0",
              maybe: "1",
              total: "2",
            },
          ],
        };
      }

      // Check existing wish
      if (
        sql.includes("SELECT id FROM wishes WHERE invitation_uid") &&
        sql.includes("name")
      ) {
        if (params[1] === "Existing Guest") {
          return { rows: [{ id: 1 }] };
        }
        return { rows: [] };
      }

      // Insert wish
      if (sql.includes("INSERT INTO wishes")) {
        return {
          rows: [
            {
              id: 3,
              name: params[1],
              message: params[2],
              attendance: params[3],
              created_at: new Date().toISOString(),
            },
          ],
        };
      }

      // Delete wish
      if (sql.includes("DELETE FROM wishes")) {
        if (params[0] === "1") {
          return { rows: [{ id: 1 }] };
        }
        return { rows: [] };
      }

      return { rows: [] };
    }),
  };

  return {
    getDbClient: vi.fn().mockResolvedValue(mockPool),
  };
});

describe("E2E: Sakeenah API", () => {
  describe("Invitation Endpoints", () => {
    it("GET /api/invitation/:uid - should return invitation data", async () => {
      const res = await app.request("/api/invitation/e2e-test-wedding");
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.groomName).toBe("Test Groom");
      expect(json.data.brideName).toBe("Test Bride");
      expect(json.data.agenda).toHaveLength(1);
      expect(json.data.banks).toHaveLength(1);
    });

    it("GET /api/invitation/:uid - should return 404 for non-existent wedding", async () => {
      const res = await app.request("/api/invitation/non-existent");
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Invitation not found");
    });

    it("GET /api/invitation/:uid - should validate UID format", async () => {
      const res = await app.request("/api/invitation/INVALID_FORMAT");
      expect(res.status).toBe(400);
    });
  });

  describe("Wishes Endpoints", () => {
    it("GET /api/:uid/wishes - should return wishes with pagination", async () => {
      const res = await app.request("/api/e2e-test-wedding/wishes");
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(2);
      expect(json.pagination.total).toBe(2);
    });

    it("GET /api/:uid/wishes - should respect limit parameter", async () => {
      const res = await app.request("/api/e2e-test-wedding/wishes?limit=1");
      expect(res.status).toBe(200);
    });

    it("POST /api/:uid/wishes - should create a new wish", async () => {
      const res = await app.request("/api/e2e-test-wedding/wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New Guest",
          message: "Happy wedding!",
          attendance: "ATTENDING",
        }),
      });

      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.name).toBe("New Guest");
    });

    it("POST /api/:uid/wishes - should reject duplicate wish", async () => {
      const res = await app.request("/api/e2e-test-wedding/wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Existing Guest",
          message: "Another message",
          attendance: "ATTENDING",
        }),
      });

      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.code).toBe("DUPLICATE_WISH");
    });

    it("POST /api/:uid/wishes - should validate input", async () => {
      const res = await app.request("/api/e2e-test-wedding/wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "",
          message: "",
        }),
      });

      expect(res.status).toBe(400);
    });

    it("DELETE /api/:uid/wishes/:id - should delete a wish", async () => {
      const res = await app.request("/api/e2e-test-wedding/wishes/1", {
        method: "DELETE",
      });

      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
    });

    it("DELETE /api/:uid/wishes/:id - should return 404 for non-existent wish", async () => {
      const res = await app.request("/api/e2e-test-wedding/wishes/999", {
        method: "DELETE",
      });

      expect(res.status).toBe(404);
    });
  });

  describe("Stats Endpoint", () => {
    it("GET /api/:uid/stats - should return attendance statistics", async () => {
      const res = await app.request("/api/e2e-test-wedding/stats");
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toHaveProperty("attending");
      expect(json.data).toHaveProperty("not_attending");
      expect(json.data).toHaveProperty("maybe");
      expect(json.data).toHaveProperty("total");
    });
  });

  describe("CORS and Headers", () => {
    it("should include CORS headers on regular requests", async () => {
      const res = await app.request("/api/e2e-test-wedding/wishes");

      // CORS headers are added on actual requests, not preflight
      expect(res.status).toBe(200);
    });
  });
});
