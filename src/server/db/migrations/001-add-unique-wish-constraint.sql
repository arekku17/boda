-- =============================================================================
-- Migration: Add unique constraint for one wish per guest
-- Version: 2.1.0
-- Date: 2026-02-05
-- =============================================================================
-- This migration adds a unique constraint to prevent guests from submitting
-- multiple wishes. Each guest (identified by name) can only submit one wish
-- per invitation.
--
-- How to run this migration:
--   psql -d sakeenah -f 001-add-unique-wish-constraint.sql
--   OR copy and paste into your database client (pgAdmin, DBeaver, etc.)
-- =============================================================================

BEGIN;

-- Step 1: Remove duplicate wishes (keep the oldest wish for each guest)
-- This ensures the unique constraint can be added without conflicts
DELETE FROM wishes
WHERE id NOT IN (
    SELECT MIN(id)
    FROM wishes
    GROUP BY invitation_uid, name
);

-- Step 2: Add unique constraint to wishes table
-- This prevents guests from submitting multiple wishes
ALTER TABLE wishes
ADD CONSTRAINT unique_wish_per_guest UNIQUE (invitation_uid, name);

COMMIT;

-- =============================================================================
-- Rollback instructions (if needed):
-- =============================================================================
-- To remove this constraint and allow multiple wishes per guest again:
--
-- BEGIN;
-- ALTER TABLE wishes DROP CONSTRAINT unique_wish_per_guest;
-- COMMIT;
-- =============================================================================
