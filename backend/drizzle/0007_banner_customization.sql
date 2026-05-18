-- Add banner customization columns
ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "subtitle" text;
ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "overlay_color" text DEFAULT 'rgba(0,0,0,0.4)';
ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "overlay_opacity" integer DEFAULT 40;
ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "text_color" text DEFAULT '#ffffff';
ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "text_align" text DEFAULT 'left';
ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "cta_style" text DEFAULT 'primary';
ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "secondary_cta_text" text;
ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "secondary_cta_link" text;
ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "badge_color" text;
