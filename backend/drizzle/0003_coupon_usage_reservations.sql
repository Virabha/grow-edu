-- =============================================
-- Migration: Coupon usage reservations
-- Description: Adds reservation/consumption lifecycle to coupon_usages
-- This migration is ADDITIVE ONLY and backward-compatible
-- =============================================

-- =============================================
-- STEP 1: Create coupon_usage_status enum
-- =============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'coupon_usage_status') THEN
        CREATE TYPE coupon_usage_status AS ENUM ('RESERVED', 'CONSUMED', 'CANCELLED');
    END IF;
END $$;

-- =============================================
-- STEP 2: Enhance coupon_usages table (ADDITIVE)
-- =============================================
ALTER TABLE coupon_usages
    ADD COLUMN IF NOT EXISTS status coupon_usage_status NOT NULL DEFAULT 'CONSUMED';

ALTER TABLE coupon_usages
    ADD COLUMN IF NOT EXISTS reserved_expires_at TIMESTAMP;

ALTER TABLE coupon_usages
    ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMP;

ALTER TABLE coupon_usages
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;

-- Backfill timestamps for existing rows (safe, non-destructive)
UPDATE coupon_usages
SET consumed_at = COALESCE(consumed_at, created_at)
WHERE status = 'CONSUMED' AND consumed_at IS NULL;

-- =============================================
-- STEP 3: Indexes to keep validation fast
-- =============================================

-- Fast lookup for usage counts per coupon (includes RESERVED/CONSUMED)
CREATE INDEX IF NOT EXISTS coupon_usages_coupon_status_idx
    ON coupon_usages (coupon_id, status, reserved_expires_at);

-- Fast lookup for per-user usage counts
CREATE INDEX IF NOT EXISTS coupon_usages_coupon_user_status_idx
    ON coupon_usages (coupon_id, user_id, status, reserved_expires_at);

-- Ensure one usage row per payment (prevents duplicate reservations)
CREATE UNIQUE INDEX IF NOT EXISTS coupon_usages_payment_unique_idx
    ON coupon_usages (payment_id)
    WHERE payment_id IS NOT NULL;

-- =============================================
-- VERIFICATION COMMENTS
-- =============================================
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'coupon_usages'
-- AND column_name IN ('status', 'reserved_expires_at', 'consumed_at', 'cancelled_at');
