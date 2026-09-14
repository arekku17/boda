/**
 * Unit tests for Invitation validation schemas
 */

import { describe, it, expect } from "vitest";
import { uidParamSchema } from "./invitation.schema.js";

describe("invitation schemas", () => {
  describe("uidParamSchema", () => {
    it("should validate a valid UID", () => {
      const result = uidParamSchema.safeParse({
        uid: "ahmad-fatimah-2025",
      });

      expect(result.success).toBe(true);
      expect(result.data.uid).toBe("ahmad-fatimah-2025");
    });

    it("should accept UIDs with numbers", () => {
      const result = uidParamSchema.safeParse({
        uid: "wedding-2025",
      });

      expect(result.success).toBe(true);
    });

    it("should reject empty UID", () => {
      const result = uidParamSchema.safeParse({
        uid: "",
      });

      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toBe("UID is required");
    });

    it("should reject UID with uppercase letters", () => {
      const result = uidParamSchema.safeParse({
        uid: "Ahmad-Fatimah",
      });

      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toBe(
        "UID must contain only lowercase letters, numbers, and hyphens",
      );
    });

    it("should reject UID with special characters", () => {
      const result = uidParamSchema.safeParse({
        uid: "wedding@2025",
      });

      expect(result.success).toBe(false);
    });

    it("should reject UID with spaces", () => {
      const result = uidParamSchema.safeParse({
        uid: "wedding 2025",
      });

      expect(result.success).toBe(false);
    });

    it("should reject UID exceeding 100 characters", () => {
      const result = uidParamSchema.safeParse({
        uid: "a".repeat(101),
      });

      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toBe(
        "UID must be less than 100 characters",
      );
    });
  });
});
