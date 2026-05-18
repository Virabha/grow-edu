-- Add parent_category_id for hierarchy (main category -> sub category)
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "parent_category_id" text;

-- Drop unique constraint on name so sub-categories under different parents can share names (e.g. "Management")
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_name_unique";
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_name_key";

-- Add index and foreign key (only if constraint does not exist)
CREATE INDEX IF NOT EXISTS "categories_parent_idx" ON "categories" ("parent_category_id");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_parent_fk') THEN
    ALTER TABLE "categories"
      ADD CONSTRAINT "categories_parent_fk"
      FOREIGN KEY ("parent_category_id") REFERENCES "categories"("category_id") ON DELETE SET NULL;
  END IF;
END $$;
