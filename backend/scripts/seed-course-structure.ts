/**
 * Seeds Software_Development and Data_And_AI parent categories,
 * their sub-categories, and placeholder batches under each sub-category.
 *
 *   pnpm seed:course-structure
 *
 * Re-runnable: skips categories and batches that already exist by slug.
 * Use --reset to wipe and recreate all seeded categories and batches.
 */
import { config } from "dotenv";
import { resolve } from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, inArray } from "drizzle-orm";
import { categories, batches, users } from "../src/database/schema";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const postgres = require("postgres");

config({ path: resolve(process.cwd(), ".env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const reset = process.argv.includes("--reset");

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[\/&]+/g, "and")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

type CategoryDef = {
  name: string;
  slug: string;
  description: string;
  parentSlug: string | null;
  displayOrder: number;
};

type BatchDef = {
  title: string;
  categorySlug: string;
};

const CATEGORY_DEFS: CategoryDef[] = [
  // ── Parent categories ──
  {
    name: "Software Development",
    slug: "software-development",
    description: "Full stack and frontend software development courses",
    parentSlug: null,
    displayOrder: 10,
  },
  {
    name: "Data & AI",
    slug: "data-and-ai",
    description: "Data science, machine learning, and business analytics",
    parentSlug: null,
    displayOrder: 11,
  },

  // ── Software Development sub-categories ──
  {
    name: "Python Full Stack",
    slug: "python-full-stack",
    description: "End-to-end Python web development",
    parentSlug: "software-development",
    displayOrder: 1,
  },
  {
    name: "Java Full Stack",
    slug: "java-full-stack",
    description: "End-to-end Java web development",
    parentSlug: "software-development",
    displayOrder: 2,
  },
  {
    name: "MERN Stack",
    slug: "mern-stack",
    description: "MongoDB, Express, React and Node.js",
    parentSlug: "software-development",
    displayOrder: 3,
  },
  {
    name: "Frontend Development",
    slug: "frontend-development",
    description: "Modern UI and frontend development",
    parentSlug: "software-development",
    displayOrder: 4,
  },

  // ── Data & AI sub-categories ──
  {
    name: "Data Science",
    slug: "data-science",
    description: "Data analysis and statistical modeling",
    parentSlug: "data-and-ai",
    displayOrder: 1,
  },
  {
    name: "AI & Machine Learning",
    slug: "ai-and-ml",
    description: "Artificial intelligence and ML techniques",
    parentSlug: "data-and-ai",
    displayOrder: 2,
  },
  {
    name: "Business Analytics",
    slug: "business-analytics",
    description: "BI tools and data-driven decision making",
    parentSlug: "data-and-ai",
    displayOrder: 3,
  },
];

const BATCH_DEFS: BatchDef[] = [
  // Python Full Stack
  { title: "Beginner Batch", categorySlug: "python-full-stack" },
  { title: "Intermediate Batch", categorySlug: "python-full-stack" },
  { title: "Advanced Batch", categorySlug: "python-full-stack" },
  { title: "Placement Batch", categorySlug: "python-full-stack" },

  // Java Full Stack
  { title: "Foundation Batch", categorySlug: "java-full-stack" },
  { title: "Advanced Batch", categorySlug: "java-full-stack" },
  { title: "Corporate Batch", categorySlug: "java-full-stack" },

  // MERN Stack
  { title: "Beginner Batch", categorySlug: "mern-stack" },
  { title: "Advanced Batch", categorySlug: "mern-stack" },
  { title: "Placement Batch", categorySlug: "mern-stack" },

  // Frontend Development
  { title: "ReactJS Batch", categorySlug: "frontend-development" },
  { title: "Angular Batch", categorySlug: "frontend-development" },
  { title: "UI/UX Batch", categorySlug: "frontend-development" },

  // Data Science
  { title: "Beginner Batch", categorySlug: "data-science" },
  { title: "Intermediate Batch", categorySlug: "data-science" },
  { title: "Advanced Batch", categorySlug: "data-science" },

  // AI & ML
  { title: "ML Foundation", categorySlug: "ai-and-ml" },
  { title: "Deep Learning", categorySlug: "ai-and-ml" },
  { title: "AI Project Batch", categorySlug: "ai-and-ml" },

  // Business Analytics
  { title: "Excel Analytics", categorySlug: "business-analytics" },
  { title: "PowerBI Batch", categorySlug: "business-analytics" },
  { title: "Tableau Batch", categorySlug: "business-analytics" },
];

const SEEDED_CATEGORY_SLUGS = CATEGORY_DEFS.map((c) => c.slug);
const SEEDED_BATCH_SLUG_PREFIX = [
  "python-full-stack",
  "java-full-stack",
  "mern-stack",
  "frontend-development",
  "data-science",
  "ai-and-ml",
  "business-analytics",
];

async function main() {
  const client = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(client);

  // ── Lookup admin user for createdBy ──────────────────────────────────────
  const adminRows = await db
    .select({ userId: users.userId })
    .from(users)
    .where(eq(users.role, "PLATFORM_ADMIN"))
    .limit(1);

  if (adminRows.length === 0) {
    console.error(
      "No PLATFORM_ADMIN user found. Run `pnpm seed:users` first.",
    );
    await client.end();
    process.exit(1);
  }
  const adminId = adminRows[0].userId;

  // ── Reset if requested ───────────────────────────────────────────────────
  if (reset) {
    console.log("Resetting seeded batches and categories...");

    // Delete batches whose slug starts with a known category slug
    const allBatches = await db
      .select({ batchId: batches.batchId, slug: batches.slug })
      .from(batches);
    const batchIdsToDelete = allBatches
      .filter((b) =>
        SEEDED_BATCH_SLUG_PREFIX.some((prefix) => b.slug.startsWith(prefix)),
      )
      .map((b) => b.batchId);

    if (batchIdsToDelete.length > 0) {
      await db
        .delete(batches)
        .where(inArray(batches.batchId, batchIdsToDelete));
      console.log(`  Deleted ${batchIdsToDelete.length} batch(es).`);
    }

    // Delete seeded categories
    const existingCats = await db
      .select({ categoryId: categories.categoryId })
      .from(categories)
      .where(inArray(categories.slug, SEEDED_CATEGORY_SLUGS));
    if (existingCats.length > 0) {
      await db
        .delete(categories)
        .where(
          inArray(
            categories.categoryId,
            existingCats.map((c) => c.categoryId),
          ),
        );
      console.log(`  Deleted ${existingCats.length} category(ies).`);
    }
  }

  // ── Seed categories ──────────────────────────────────────────────────────
  const slugToId = new Map<string, string>();

  // Pre-load existing categories so we can reuse their IDs
  const existingCats = await db
    .select({ categoryId: categories.categoryId, slug: categories.slug })
    .from(categories)
    .where(inArray(categories.slug, SEEDED_CATEGORY_SLUGS));
  for (const c of existingCats) slugToId.set(c.slug, c.categoryId);

  let catsCreated = 0;
  let catsSkipped = 0;

  for (const def of CATEGORY_DEFS) {
    if (slugToId.has(def.slug)) {
      console.log(
        `  skip  category: ${def.name} (${def.slug}) — already exists`,
      );
      catsSkipped++;
      continue;
    }

    const parentId = def.parentSlug ? (slugToId.get(def.parentSlug) ?? null) : null;

    const [inserted] = await db
      .insert(categories)
      .values({
        name: def.name,
        slug: def.slug,
        description: def.description,
        displayOrder: def.displayOrder,
        parentCategoryId: parentId,
        isActive: true,
        isDeleted: false,
      })
      .returning({ categoryId: categories.categoryId });

    slugToId.set(def.slug, inserted.categoryId);
    console.log(
      `  +     category: ${def.name} (${def.slug})${parentId ? " [sub]" : ""}`,
    );
    catsCreated++;
  }

  // ── Seed batches ─────────────────────────────────────────────────────────
  const startDate = new Date("2026-07-01");
  const endDate = new Date("2026-12-31");

  // Pre-load existing batch slugs
  const existingBatchSlugs = new Set(
    (
      await db.select({ slug: batches.slug }).from(batches)
    ).map((b) => b.slug),
  );

  let batchesCreated = 0;
  let batchesSkipped = 0;

  for (const def of BATCH_DEFS) {
    const categoryId = slugToId.get(def.categorySlug);
    if (!categoryId) {
      console.warn(`  WARN: category "${def.categorySlug}" not found — skipping batch "${def.title}"`);
      continue;
    }

    const batchSlug = `${def.categorySlug}-${slugify(def.title)}`;

    if (existingBatchSlugs.has(batchSlug)) {
      console.log(`  skip  batch: ${def.title} / ${def.categorySlug} — already exists`);
      batchesSkipped++;
      continue;
    }

    await db.insert(batches).values({
      title: def.title,
      slug: batchSlug,
      description: `${def.title} for ${def.categorySlug.replace(/-/g, " ")} students.`,
      categoryId,
      startDate,
      endDate,
      teacherIds: [],
      createdBy: adminId,
      status: "UPCOMING",
      price: "0",
      currency: "INR",
    });

    console.log(`  +     batch: ${def.title} → ${def.categorySlug}`);
    batchesCreated++;
  }

  await client.end();

  console.log("");
  console.log(
    `Done. Categories: ${catsCreated} created, ${catsSkipped} skipped. Batches: ${batchesCreated} created, ${batchesSkipped} skipped.`,
  );
}

main().catch((err) => {
  console.error("\nSeed failed:", err);
  process.exit(1);
});
