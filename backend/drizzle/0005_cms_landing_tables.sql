-- =============================================
-- Migration: CMS / Landing Page Tables
-- Description: Adds banners, faqs, why_choose_us, testimonials,
-- site_settings, services, teacher_applications, instructor_profiles
-- =============================================

-- =============================================
-- STEP 1: Create teacher_application_status enum
-- =============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'teacher_application_status' AND n.nspname = current_schema()
    ) THEN
        CREATE TYPE teacher_application_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    END IF;
END $$;

-- =============================================
-- STEP 2: Create banners table
-- =============================================
CREATE TABLE IF NOT EXISTS banners (
    banner_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    cta_text TEXT,
    cta_link TEXT,
    badge_text TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS banners_display_order_idx ON banners (display_order);
CREATE INDEX IF NOT EXISTS banners_is_active_idx ON banners (is_active);

-- =============================================
-- STEP 3: Create faqs table
-- =============================================
CREATE TABLE IF NOT EXISTS faqs (
    faq_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS faqs_display_order_idx ON faqs (display_order);
CREATE INDEX IF NOT EXISTS faqs_is_active_idx ON faqs (is_active);

-- =============================================
-- STEP 4: Create why_choose_us table
-- =============================================
CREATE TABLE IF NOT EXISTS why_choose_us (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    icon_name TEXT NOT NULL,
    icon_color TEXT,
    icon_bg TEXT,
    title TEXT NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS why_choose_us_display_order_idx ON why_choose_us (display_order);
CREATE INDEX IF NOT EXISTS why_choose_us_is_active_idx ON why_choose_us (is_active);

-- =============================================
-- STEP 5: Create testimonials table
-- =============================================
CREATE TABLE IF NOT EXISTS testimonials (
    testimonial_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    role TEXT,
    company TEXT,
    rating INTEGER NOT NULL DEFAULT 5,
    text TEXT NOT NULL,
    course TEXT,
    avatar_url TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS testimonials_display_order_idx ON testimonials (display_order);
CREATE INDEX IF NOT EXISTS testimonials_is_active_idx ON testimonials (is_active);

-- =============================================
-- STEP 6: Create site_settings table
-- =============================================
CREATE TABLE IF NOT EXISTS site_settings (
    setting_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS site_settings_key_idx ON site_settings (key);

-- =============================================
-- STEP 7: Create services table
-- =============================================
CREATE TABLE IF NOT EXISTS services (
    service_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    icon_name TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS services_slug_idx ON services (slug);
CREATE INDEX IF NOT EXISTS services_display_order_idx ON services (display_order);
CREATE INDEX IF NOT EXISTS services_is_active_idx ON services (is_active);

-- =============================================
-- STEP 8: Create teacher_applications table
-- =============================================
CREATE TABLE IF NOT EXISTS teacher_applications (
    application_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    experience_years INTEGER,
    skills JSONB,
    categories JSONB,
    cv_url TEXT,
    why_join TEXT,
    status teacher_application_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS teacher_applications_status_idx ON teacher_applications (status);
CREATE INDEX IF NOT EXISTS teacher_applications_email_idx ON teacher_applications (email);
CREATE INDEX IF NOT EXISTS teacher_applications_created_at_idx ON teacher_applications (created_at);

-- =============================================
-- STEP 9: Create instructor_profiles table
-- =============================================
CREATE TABLE IF NOT EXISTS instructor_profiles (
    profile_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    bio TEXT,
    expertise JSONB,
    experience TEXT,
    education TEXT,
    avatar_url TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS instructor_profiles_user_id_idx ON instructor_profiles (user_id);
CREATE INDEX IF NOT EXISTS instructor_profiles_display_order_idx ON instructor_profiles (display_order);
CREATE INDEX IF NOT EXISTS instructor_profiles_is_active_idx ON instructor_profiles (is_active);
