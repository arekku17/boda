/**
 * Admin Feature - Validation Schemas
 */

import { z } from "zod";

/**
 * Admin login schema
 */
export const adminLoginSchema = z.object({
  password: z.string().min(1, "Password is required").max(200),
});

/**
 * @typedef {import('zod').infer<typeof adminLoginSchema>} AdminLogin
 */
