/**
 * Gifts Feature - API Routes
 * Public gift registry plus admin-only management, stored in MongoDB
 * (collection "gifts" of the MONGODB_DB database)
 */

import { Buffer } from "node:buffer";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { zValidator } from "@hono/zod-validator";
import { Binary, ObjectId } from "mongodb";
import {
  giftSchema,
  giftIdParamSchema,
  claimGiftSchema,
} from "./gifts.schema.js";
import { getMongoDb } from "../../lib/mongo-client.js";
import { AppError, ConflictError, NotFoundError } from "../../lib/errors.js";
import { requireAdmin, isAdminRequest } from "../../lib/auth.js";

const giftsRoutes = new Hono();

const COLLECTION = "gifts";
const MAX_BODY_SIZE = 3 * 1024 * 1024; // 3 MB (base64 images are ~33% larger)

// Never send image bytes in list/update responses
const WITHOUT_IMAGE_DATA = { imageData: 0 };

async function getGiftsCollection(c) {
  const db = await getMongoDb(c);
  return db.collection(COLLECTION);
}

/**
 * Format a gift document for the frontend.
 * `image` points to the uploaded image endpoint when there is one,
 * otherwise to the external image link (or "").
 * @param {object} doc - Gift document
 * @param {boolean} includeClaim - Whether to include who is bringing it
 *   (kept out of the public list so guest names aren't exposed to everyone)
 */
function formatGift(doc, includeClaim = true) {
  const id = doc._id.toString();
  const hasUploadedImage = Boolean(doc.imageType);
  const version = new Date(doc.updatedAt).getTime();

  const gift = {
    id,
    name: doc.name,
    description: doc.description || "",
    store: doc.store || "",
    price: doc.price || "",
    url: doc.url,
    imageUrl: doc.imageUrl || "",
    hasUploadedImage,
    image: hasUploadedImage
      ? `/api/gifts/${id}/image?v=${version}`
      : doc.imageUrl || "",
  };

  if (includeClaim) {
    gift.claimedBy = doc.claimedBy || null;
    gift.claimedAt = doc.claimedAt
      ? new Date(doc.claimedAt).toISOString()
      : null;
  }

  return gift;
}

const toBinary = (image) => new Binary(Buffer.from(image.data, "base64"));

const toBytes = (value) =>
  value instanceof Binary
    ? value.buffer.subarray(0, value.position)
    : new Uint8Array(value);

const limitBody = bodyLimit({
  maxSize: MAX_BODY_SIZE,
  onError: () => {
    throw new AppError("Image is too large", 413, "PAYLOAD_TOO_LARGE");
  },
});

/**
 * GET /gifts
 * List gifts in display order. Admins see every gift plus who is bringing
 * each one; guests only see the ones still available (unclaimed), so a gift
 * disappears from the public registry as soon as someone claims it.
 */
giftsRoutes.get("/", async (c) => {
  const admin = await isAdminRequest(c);
  const gifts = await getGiftsCollection(c);
  const filter = admin ? {} : { claimedBy: null };
  const docs = await gifts
    .find(filter, { projection: WITHOUT_IMAGE_DATA })
    .sort({ orderIndex: 1, createdAt: 1 })
    .toArray();

  return c.json({
    success: true,
    data: docs.map((doc) => formatGift(doc, admin)),
  });
});

/**
 * GET /gifts/:id/image
 * Serve an uploaded gift image
 */
giftsRoutes.get(
  "/:id/image",
  zValidator("param", giftIdParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");

    const gifts = await getGiftsCollection(c);
    const doc = await gifts.findOne(
      { _id: new ObjectId(id) },
      { projection: { imageData: 1, imageType: 1 } },
    );

    if (!doc?.imageData || !doc.imageType) {
      throw new NotFoundError("Image not found");
    }

    return c.body(toBytes(doc.imageData), 200, {
      "Content-Type": doc.imageType,
      // URLs include ?v=<updatedAt>, so they can be cached forever
      "Cache-Control": "public, max-age=31536000, immutable",
    });
  },
);

/**
 * POST /gifts
 * Create a gift (admin only)
 */
giftsRoutes.post(
  "/",
  requireAdmin,
  limitBody,
  zValidator("json", giftSchema),
  async (c) => {
    const gift = c.req.valid("json");
    const gifts = await getGiftsCollection(c);

    // New gifts go to the end of the list
    const [last] = await gifts
      .find({}, { projection: { orderIndex: 1 } })
      .sort({ orderIndex: -1 })
      .limit(1)
      .toArray();

    const now = new Date();
    const doc = {
      name: gift.name,
      description: gift.description,
      store: gift.store,
      price: gift.price,
      url: gift.url,
      imageUrl: gift.imageUrl,
      imageData: gift.image ? toBinary(gift.image) : null,
      imageType: gift.image?.type ?? null,
      orderIndex: (last?.orderIndex ?? 0) + 1,
      claimedBy: null,
      claimedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const { insertedId } = await gifts.insertOne(doc);

    return c.json(
      { success: true, data: formatGift({ ...doc, _id: insertedId }) },
      201,
    );
  },
);

/**
 * PUT /gifts/:id
 * Update a gift (admin only). Keeps the uploaded image unless a new one is
 * sent or removeImage is true.
 */
giftsRoutes.put(
  "/:id",
  requireAdmin,
  limitBody,
  zValidator("param", giftIdParamSchema),
  zValidator("json", giftSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const gift = c.req.valid("json");

    const changes = {
      name: gift.name,
      description: gift.description,
      store: gift.store,
      price: gift.price,
      url: gift.url,
      imageUrl: gift.imageUrl,
      updatedAt: new Date(),
    };

    if (gift.image) {
      changes.imageData = toBinary(gift.image);
      changes.imageType = gift.image.type;
    } else if (gift.removeImage) {
      changes.imageData = null;
      changes.imageType = null;
    }

    const gifts = await getGiftsCollection(c);
    const updated = await gifts.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: changes },
      { returnDocument: "after", projection: WITHOUT_IMAGE_DATA },
    );

    if (!updated) {
      throw new NotFoundError("Gift not found");
    }

    return c.json({ success: true, data: formatGift(updated) });
  },
);

/**
 * POST /gifts/:id/claim
 * A guest declares they will bring this gift. Public endpoint - atomically
 * only succeeds while the gift is still unclaimed, so two guests racing for
 * the same gift can't both "win" it.
 */
giftsRoutes.post(
  "/:id/claim",
  zValidator("param", giftIdParamSchema),
  zValidator("json", claimGiftSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const { name } = c.req.valid("json");

    const gifts = await getGiftsCollection(c);
    const updated = await gifts.findOneAndUpdate(
      { _id: new ObjectId(id), claimedBy: null },
      { $set: { claimedBy: name, claimedAt: new Date() } },
      { returnDocument: "after", projection: WITHOUT_IMAGE_DATA },
    );

    if (!updated) {
      const exists = await gifts.findOne(
        { _id: new ObjectId(id) },
        { projection: { _id: 1 } },
      );
      if (!exists) throw new NotFoundError("Gift not found");
      throw new ConflictError(
        "This gift was just claimed by someone else",
        "GIFT_ALREADY_CLAIMED",
      );
    }

    return c.json({ success: true, data: formatGift(updated, false) });
  },
);

/**
 * DELETE /gifts/:id/claim
 * Release a claimed gift back to the registry (admin only) - e.g. to fix a
 * mistaken claim.
 */
giftsRoutes.delete(
  "/:id/claim",
  requireAdmin,
  zValidator("param", giftIdParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");

    const gifts = await getGiftsCollection(c);
    const updated = await gifts.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { claimedBy: null, claimedAt: null } },
      { returnDocument: "after", projection: WITHOUT_IMAGE_DATA },
    );

    if (!updated) {
      throw new NotFoundError("Gift not found");
    }

    return c.json({ success: true, data: formatGift(updated) });
  },
);

/**
 * DELETE /gifts/:id
 * Delete a gift (admin only)
 */
giftsRoutes.delete(
  "/:id",
  requireAdmin,
  zValidator("param", giftIdParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");

    const gifts = await getGiftsCollection(c);
    const { deletedCount } = await gifts.deleteOne({ _id: new ObjectId(id) });

    if (deletedCount === 0) {
      throw new NotFoundError("Gift not found");
    }

    return c.json({ success: true, message: "Gift deleted" });
  },
);

export default giftsRoutes;
