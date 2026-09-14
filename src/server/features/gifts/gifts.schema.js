/**
 * Gifts Feature - Validation Schemas
 */

import { z } from "zod";

// Uploaded images arrive as base64 (already resized in the browser)
const MAX_IMAGE_BASE64_LENGTH = 2_000_000; // ~1.5 MB of binary data

/**
 * Gift create/update schema
 */
export const giftSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(150, "Name must be less than 150 characters"),

  description: z
    .string()
    .trim()
    .max(1000, "Description must be less than 1000 characters")
    .default(""),

  store: z
    .string()
    .trim()
    .max(100, "Store must be less than 100 characters")
    .default(""),

  price: z
    .string()
    .trim()
    .max(50, "Price must be less than 50 characters")
    .default(""),

  url: z
    .string()
    .trim()
    .min(1, "Store link is required")
    .max(2000, "URL must be less than 2000 characters")
    .regex(/^https?:\/\//i, "URL must start with http:// or https://"),

  // External image link, used when no image is uploaded
  imageUrl: z
    .string()
    .trim()
    .max(2000, "URL must be less than 2000 characters")
    .refine((val) => val === "" || /^https?:\/\//i.test(val), {
      message: "URL must start with http:// or https://",
    })
    .default(""),

  // New uploaded image (replaces the current one)
  image: z
    .object({
      data: z
        .string()
        .min(1)
        .max(MAX_IMAGE_BASE64_LENGTH, "Image is too large")
        .regex(/^[A-Za-z0-9+/=]+$/, "Image must be base64 encoded"),
      type: z.enum(["image/jpeg", "image/png", "image/webp"]),
    })
    .nullable()
    .optional(),

  // Remove the uploaded image on update
  removeImage: z.boolean().optional().default(false),
});

/**
 * Gift ID parameter schema (MongoDB ObjectId)
 */
export const giftIdParamSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/i, "Gift ID must be a valid id"),
});

/**
 * Claim-a-gift schema (guest declares they will bring it)
 */
export const claimGiftSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
});

/**
 * @typedef {import('zod').infer<typeof giftSchema>} Gift
 * @typedef {import('zod').infer<typeof giftIdParamSchema>} GiftIdParam
 */
