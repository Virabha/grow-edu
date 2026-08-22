-- =============================================
-- Migration: Add Coupon System and Enhance Categories
-- Description: Adds coupon management tables and enhances categories
-- with is_active, is_deleted, display_order columns
-- This migration is ADDITIVE ONLY and backward-compatible
-- =============================================

-- =============================================
-- STEP 1: Create discount_type enum
-- =============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'discount_type' AND n.nspname = current_schema()
    ) THEN
        CREATE TYPE discount_type AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');
    END IF;
END $$;

-- =============================================
-- STEP 2: Enhance categories table (ADDITIVE)
-- =============================================
ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

-- Index for filtering active categories
CREATE INDEX IF NOT EXISTS categories_is_active_idx
    ON categories (is_active)
    WHERE is_deleted = false;

-- =============================================
-- STEP 3: Create coupons table
-- =============================================
CREATE TABLE IF NOT EXISTS coupons (
    coupon_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    coupon_code TEXT NOT NULL,
    discount_type discount_type NOT NULL DEFAULT 'PERCENTAGE',
    discount_value DECIMAL(10, 2) NOT NULL,
    max_discount_amount DECIMAL(10, 2),
    min_purchase_amount DECIMAL(10, 2),
    valid_from TIMESTAMP NOT NULL DEFAULT NOW(),
    valid_till TIMESTAMP NOT NULL,
    usage_limit INTEGER,
    usage_limit_per_user INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Case-insensitive unique index for coupon codes (only non-deleted)
CREATE UNIQUE INDEX IF NOT EXISTS coupons_code_unique_idx
    ON coupons (LOWER(coupon_code))
    WHERE is_deleted = false;

-- Composite index for coupon lookup
CREATE INDEX IF NOT EXISTS coupons_code_lookup_idx
    ON coupons (coupon_code, is_active, is_deleted);

-- Index for active coupons
CREATE INDEX IF NOT EXISTS coupons_is_active_idx
    ON coupons (is_active)
    WHERE is_deleted = false;

-- Index for expiry-based queries
CREATE INDEX IF NOT EXISTS coupons_valid_till_idx
    ON coupons (valid_till)
    WHERE is_deleted = false;

-- =============================================
-- STEP 4: Create coupon_categories junction table
-- =============================================
CREATE TABLE IF NOT EXISTS coupon_categories (
    coupon_category_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    coupon_id TEXT NOT NULL REFERENCES coupons(coupon_id) ON DELETE CASCADE,
    category_id TEXT NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Unique constraint on coupon-category pair
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'coupon_categories_unique'
    ) THEN
        ALTER TABLE coupon_categories
            ADD CONSTRAINT coupon_categories_unique UNIQUE(coupon_id, category_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS coupon_categories_coupon_idx
    ON coupon_categories (coupon_id);

CREATE INDEX IF NOT EXISTS coupon_categories_category_idx
    ON coupon_categories (category_id);

-- =============================================
-- STEP 5: Create coupon_courses junction table
-- =============================================
CREATE TABLE IF NOT EXISTS coupon_courses (
    coupon_course_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    coupon_id TEXT NOT NULL REFERENCES coupons(coupon_id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Unique constraint on coupon-course pair
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'coupon_courses_unique'
    ) THEN
        ALTER TABLE coupon_courses
            ADD CONSTRAINT coupon_courses_unique UNIQUE(coupon_id, course_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS coupon_courses_coupon_idx
    ON coupon_courses (coupon_id);

CREATE INDEX IF NOT EXISTS coupon_courses_course_idx
    ON coupon_courses (course_id);

-- =============================================
-- STEP 6: Create coupon_usages tracking table
-- =============================================
CREATE TABLE IF NOT EXISTS coupon_usages (
    usage_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    coupon_id TEXT NOT NULL REFERENCES coupons(coupon_id) ON DELETE RESTRICT,
    user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    payment_id TEXT REFERENCES payments(payment_id) ON DELETE SET NULL,
    course_id TEXT REFERENCES courses(course_id) ON DELETE SET NULL,
    discount_applied DECIMAL(10, 2) NOT NULL,
    original_amount DECIMAL(10, 2) NOT NULL,
    final_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS coupon_usages_coupon_idx
    ON coupon_usages (coupon_id);

CREATE INDEX IF NOT EXISTS coupon_usages_user_idx
    ON coupon_usages (user_id);

CREATE INDEX IF NOT EXISTS coupon_usages_coupon_user_idx
    ON coupon_usages (coupon_id, user_id);

CREATE INDEX IF NOT EXISTS coupon_usages_payment_idx
    ON coupon_usages (payment_id);

-- =============================================
-- STEP 7: Enhance payments table (ADDITIVE)
-- =============================================
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS coupon_id TEXT REFERENCES coupons(coupon_id);

ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0;

ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS original_amount DECIMAL(10, 2);

CREATE INDEX IF NOT EXISTS payments_coupon_idx
    ON payments (coupon_id);

-- =============================================
-- VERIFICATION COMMENTS
-- =============================================
-- To verify migration success, run:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_name IN ('coupons', 'coupon_categories', 'coupon_courses', 'coupon_usages');
--
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'categories' AND column_name IN ('is_active', 'is_deleted', 'display_order');
--
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'payments' AND column_name IN ('coupon_id', 'discount_amount', 'original_amount');
