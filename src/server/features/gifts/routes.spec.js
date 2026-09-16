/**
 * Unit tests for Gifts API routes
 * Uses a mocked MongoDB collection for isolated testing
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { Binary, ObjectId } from "mongodb";
import giftsRoutes from "./routes.js";
import { AppError } from "../../lib/errors.js";
import { createAdminToken } from "../../lib/auth.js";

// Mock the mongo-client module
vi.mock("../../lib/mongo-client.js", () => ({
  getMongoDb: vi.fn(),
}));

import { getMongoDb } from "../../lib/mongo-client.js";

const ENV = { ADMIN_PASSWORD: "test-password" };
const UPDATED_AT = new Date("2026-09-13T00:00:00.000Z");
const GIFT_ID = "64b7f0a2c9e77a1d2c3b4a5f";

const validGift = {
  name: "Cafetera",
  store: "Amazon",
  url: "https://www.amazon.com.mx/cafetera",
};

function createGiftDoc(overrides = {}) {
  return {
    _id: new ObjectId(GIFT_ID),
    name: "Cafetera",
    description: "",
    store: "Amazon",
    price: "",
    url: "https://www.amazon.com.mx/cafetera",
    imageUrl: "",
    imageType: null,
    orderIndex: 1,
    createdAt: UPDATED_AT,
    updatedAt: UPDATED_AT,
    ...overrides,
  };
}

/**
 * Creates a mock gifts collection and wires getMongoDb to return it
 */
function mockCollection({
  findDocs = [],
  findOneDoc = null,
  updatedDoc = null,
  deletedCount = 0,
} = {}) {
  const cursor = {
    sort: vi.fn(() => cursor),
    limit: vi.fn(() => cursor),
    toArray: vi.fn(async () => findDocs),
  };

  const collection = {
    find: vi.fn(() => cursor),
    findOne: vi.fn(async () => findOneDoc),
    insertOne: vi.fn(async () => ({ insertedId: new ObjectId(GIFT_ID) })),
    findOneAndUpdate: vi.fn(async () => updatedDoc),
    deleteOne: vi.fn(async () => ({ deletedCount })),
  };

  getMongoDb.mockResolvedValue({ collection: vi.fn(() => collection) });
  return collection;
}

function jsonRequest(method, body, token) {
  return {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  };
}

describe("gifts routes", () => {
  let app;
  let token;

  beforeEach(async () => {
    vi.clearAllMocks();

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

    app.route("/gifts", giftsRoutes);

    token = await createAdminToken({ env: ENV });
  });

  describe("GET /gifts", () => {
    it("should return gifts with resolved image paths", async () => {
      const collection = mockCollection({
        findDocs: [
          createGiftDoc({ imageType: "image/jpeg" }),
          createGiftDoc({
            _id: new ObjectId(),
            imageUrl: "https://example.com/cafetera.jpg",
          }),
        ],
      });

      const res = await app.request("/gifts", {}, ENV);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data).toHaveLength(2);
      expect(json.data[0]).toMatchObject({
        id: GIFT_ID,
        hasUploadedImage: true,
        image: `/api/gifts/${GIFT_ID}/image?v=${UPDATED_AT.getTime()}`,
      });
      expect(json.data[1]).toMatchObject({
        hasUploadedImage: false,
        image: "https://example.com/cafetera.jpg",
      });

      // Image bytes are excluded, and unauthenticated requests only see
      // unclaimed gifts
      expect(collection.find).toHaveBeenCalledWith(
        { claimedBy: null },
        { projection: { imageData: 0 } },
      );
    });

    it("should hide who claimed a gift from public requests", async () => {
      mockCollection({
        findDocs: [createGiftDoc({ claimedBy: "Ana", claimedAt: UPDATED_AT })],
      });

      const res = await app.request("/gifts", {}, ENV);
      const json = await res.json();

      expect(json.data[0]).not.toHaveProperty("claimedBy");
      expect(json.data[0]).not.toHaveProperty("claimedAt");
    });

    it("should return every gift plus who claimed it for admins", async () => {
      const collection = mockCollection({
        findDocs: [createGiftDoc({ claimedBy: "Ana", claimedAt: UPDATED_AT })],
      });

      const res = await app.request(
        "/gifts",
        { headers: { Authorization: `Bearer ${token}` } },
        ENV,
      );
      const json = await res.json();

      expect(collection.find).toHaveBeenCalledWith(
        {},
        { projection: { imageData: 0 } },
      );
      expect(json.data[0]).toMatchObject({
        claimedBy: "Ana",
        claimedAt: UPDATED_AT.toISOString(),
      });
    });
  });

  describe("POST /gifts/:id/claim", () => {
    it("should let a guest claim an available gift", async () => {
      const collection = mockCollection({
        updatedDoc: createGiftDoc({ claimedBy: "Ana", claimedAt: UPDATED_AT }),
      });

      const res = await app.request(
        `/gifts/${GIFT_ID}/claim`,
        jsonRequest("POST", { name: "Ana" }),
        ENV,
      );
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data).not.toHaveProperty("claimedBy");

      const [filter, update] = collection.findOneAndUpdate.mock.calls[0];
      expect(filter).toMatchObject({ claimedBy: null });
      expect(update.$set.claimedBy).toBe("Ana");
      expect(update.$set.claimToken).toEqual(expect.any(String));
      expect(json.data.claimToken).toBe(update.$set.claimToken);
    });

    it("should reject claiming a gift someone else already claimed", async () => {
      const collection = mockCollection({ updatedDoc: null });
      collection.findOne.mockResolvedValue({ _id: new ObjectId(GIFT_ID) });

      const res = await app.request(
        `/gifts/${GIFT_ID}/claim`,
        jsonRequest("POST", { name: "Ana" }),
        ENV,
      );
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.code).toBe("GIFT_ALREADY_CLAIMED");
    });

    it("should return 404 when the gift doesn't exist", async () => {
      const collection = mockCollection({ updatedDoc: null });
      collection.findOne.mockResolvedValue(null);

      const res = await app.request(
        `/gifts/${GIFT_ID}/claim`,
        jsonRequest("POST", { name: "Ana" }),
        ENV,
      );

      expect(res.status).toBe(404);
    });

    it("should return 400 for an empty name", async () => {
      mockCollection();

      const res = await app.request(
        `/gifts/${GIFT_ID}/claim`,
        jsonRequest("POST", { name: "" }),
        ENV,
      );

      expect(res.status).toBe(400);
    });
  });

  describe("POST /gifts/:id/release", () => {
    const CLAIM_TOKEN = "3f1c6d2e-8a4b-4c5d-9e6f-7a8b9c0d1e2f";

    it("should release a gift claimed with the given token", async () => {
      const collection = mockCollection({ updatedDoc: createGiftDoc() });

      const res = await app.request(
        `/gifts/${GIFT_ID}/release`,
        jsonRequest("POST", { token: CLAIM_TOKEN }),
        ENV,
      );

      expect(res.status).toBe(200);
      const [filter, update] = collection.findOneAndUpdate.mock.calls[0];
      expect(filter).toEqual({
        _id: new ObjectId(GIFT_ID),
        claimToken: CLAIM_TOKEN,
      });
      expect(update.$set).toEqual({
        claimedBy: null,
        claimedAt: null,
        claimToken: null,
      });
    });

    it("should return 404 when the token doesn't match", async () => {
      mockCollection({ updatedDoc: null });

      const res = await app.request(
        `/gifts/${GIFT_ID}/release`,
        jsonRequest("POST", { token: CLAIM_TOKEN }),
        ENV,
      );

      expect(res.status).toBe(404);
    });

    it("should return 400 without a valid token", async () => {
      mockCollection();

      const res = await app.request(
        `/gifts/${GIFT_ID}/release`,
        jsonRequest("POST", { token: null }),
        ENV,
      );

      expect(res.status).toBe(400);
    });
  });

  describe("POST /gifts/mine", () => {
    const CLAIM_TOKEN = "3f1c6d2e-8a4b-4c5d-9e6f-7a8b9c0d1e2f";

    it("should return the gifts matching the saved claim tokens", async () => {
      const collection = mockCollection({
        findDocs: [
          createGiftDoc({
            claimedBy: "Ana",
            claimedAt: UPDATED_AT,
            claimToken: CLAIM_TOKEN,
          }),
        ],
      });

      const res = await app.request(
        "/gifts/mine",
        jsonRequest("POST", { tokens: [CLAIM_TOKEN] }),
        ENV,
      );
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(collection.find).toHaveBeenCalledWith(
        { claimToken: { $in: [CLAIM_TOKEN] } },
        { projection: { imageData: 0 } },
      );
      expect(json.data[0]).toMatchObject({
        id: GIFT_ID,
        claimToken: CLAIM_TOKEN,
      });
      expect(json.data[0]).not.toHaveProperty("claimedBy");
    });

    it("should not query the database without tokens", async () => {
      const collection = mockCollection();

      const res = await app.request(
        "/gifts/mine",
        jsonRequest("POST", { tokens: [] }),
        ENV,
      );
      const json = await res.json();

      expect(json.data).toEqual([]);
      expect(collection.find).not.toHaveBeenCalled();
    });

    it("should return 400 for invalid tokens", async () => {
      mockCollection();

      const res = await app.request(
        "/gifts/mine",
        jsonRequest("POST", { tokens: [{ $ne: null }] }),
        ENV,
      );

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /gifts/:id/claim", () => {
    it("should reject requests without a token", async () => {
      const res = await app.request(
        `/gifts/${GIFT_ID}/claim`,
        { method: "DELETE" },
        ENV,
      );

      expect(res.status).toBe(401);
    });

    it("should release a claimed gift", async () => {
      const collection = mockCollection({ updatedDoc: createGiftDoc() });

      const res = await app.request(
        `/gifts/${GIFT_ID}/claim`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
        ENV,
      );

      expect(res.status).toBe(200);
      const [, update] = collection.findOneAndUpdate.mock.calls[0];
      expect(update.$set).toEqual({
        claimedBy: null,
        claimedAt: null,
        claimToken: null,
      });
    });

    it("should return 404 for a non-existent gift", async () => {
      mockCollection({ updatedDoc: null });

      const res = await app.request(
        `/gifts/${GIFT_ID}/claim`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
        ENV,
      );

      expect(res.status).toBe(404);
    });
  });

  describe("GET /gifts/:id/image", () => {
    it("should serve the uploaded image", async () => {
      mockCollection({
        findOneDoc: {
          imageData: new Binary(Buffer.from([1, 2, 3])),
          imageType: "image/png",
        },
      });

      const res = await app.request(`/gifts/${GIFT_ID}/image`, {}, ENV);

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/png");
      expect([...new Uint8Array(await res.arrayBuffer())]).toEqual([1, 2, 3]);
    });

    it("should return 404 when the gift has no uploaded image", async () => {
      mockCollection({ findOneDoc: { imageData: null, imageType: null } });

      const res = await app.request(`/gifts/${GIFT_ID}/image`, {}, ENV);

      expect(res.status).toBe(404);
    });

    it("should return 400 for an invalid id", async () => {
      const res = await app.request("/gifts/not-an-id/image", {}, ENV);

      expect(res.status).toBe(400);
    });
  });

  describe("POST /gifts", () => {
    it("should reject requests without a token", async () => {
      const res = await app.request(
        "/gifts",
        jsonRequest("POST", validGift),
        ENV,
      );

      expect(res.status).toBe(401);
      expect(getMongoDb).not.toHaveBeenCalled();
    });

    it("should create a gift with an uploaded image", async () => {
      const collection = mockCollection({
        findDocs: [{ orderIndex: 4 }],
      });

      const res = await app.request(
        "/gifts",
        jsonRequest(
          "POST",
          {
            ...validGift,
            image: {
              data: Buffer.from("hola").toString("base64"),
              type: "image/jpeg",
            },
          },
          token,
        ),
        ENV,
      );
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.data).toMatchObject({ id: GIFT_ID, hasUploadedImage: true });

      const [inserted] = collection.insertOne.mock.calls[0];
      expect(inserted.orderIndex).toBe(5);
      expect(inserted.imageType).toBe("image/jpeg");
      expect(Buffer.from(inserted.imageData.buffer).toString()).toBe("hola");
    });

    it("should return 400 for an invalid store link", async () => {
      const res = await app.request(
        "/gifts",
        jsonRequest("POST", { ...validGift, url: "amazon.com" }, token),
        ENV,
      );

      expect(res.status).toBe(400);
    });

    it("should return 500 when ADMIN_PASSWORD is not configured", async () => {
      const res = await app.request(
        "/gifts",
        jsonRequest("POST", validGift, token),
        {},
      );
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.code).toBe("ADMIN_NOT_CONFIGURED");
    });
  });

  describe("PUT /gifts/:id", () => {
    it("should update a gift and remove its image", async () => {
      const collection = mockCollection({ updatedDoc: createGiftDoc() });

      const res = await app.request(
        `/gifts/${GIFT_ID}`,
        jsonRequest("PUT", { ...validGift, removeImage: true }, token),
        ENV,
      );

      expect(res.status).toBe(200);

      const [filter, update] = collection.findOneAndUpdate.mock.calls[0];
      expect(filter._id.toString()).toBe(GIFT_ID);
      expect(update.$set).toMatchObject({ imageData: null, imageType: null });
    });

    it("should keep the current image when none is sent", async () => {
      const collection = mockCollection({ updatedDoc: createGiftDoc() });

      await app.request(
        `/gifts/${GIFT_ID}`,
        jsonRequest("PUT", validGift, token),
        ENV,
      );

      const [, update] = collection.findOneAndUpdate.mock.calls[0];
      expect(update.$set).not.toHaveProperty("imageData");
      expect(update.$set).not.toHaveProperty("imageType");
    });

    it("should return 404 for a non-existent gift", async () => {
      mockCollection({ updatedDoc: null });

      const res = await app.request(
        `/gifts/${GIFT_ID}`,
        jsonRequest("PUT", validGift, token),
        ENV,
      );

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /gifts/:id", () => {
    it("should delete a gift", async () => {
      mockCollection({ deletedCount: 1 });

      const res = await app.request(
        `/gifts/${GIFT_ID}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
        ENV,
      );

      expect(res.status).toBe(200);
    });

    it("should return 404 for a non-existent gift", async () => {
      mockCollection({ deletedCount: 0 });

      const res = await app.request(
        `/gifts/${GIFT_ID}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
        ENV,
      );

      expect(res.status).toBe(404);
    });

    it("should reject an invalid token", async () => {
      const res = await app.request(
        `/gifts/${GIFT_ID}`,
        { method: "DELETE", headers: { Authorization: "Bearer not-a-token" } },
        ENV,
      );

      expect(res.status).toBe(401);
    });
  });
});
