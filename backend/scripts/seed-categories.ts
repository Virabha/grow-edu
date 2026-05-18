import { config } from "dotenv";
import { resolve } from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import { categories } from "../src/database/schema";
import { eq, isNull } from "drizzle-orm";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const postgres = require("postgres");

config({ path: resolve(process.cwd(), ".env") });

const DATABASE_URL = process.env.DATABASE_URL;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

type CategoryRow = {
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
  parentSlug: string | null;
};

const ACADEMICS: CategoryRow[] = [
  { name: "Academics", slug: "academics", description: "School and academic courses", displayOrder: 0, parentSlug: null },
  { name: "School and Academics", slug: "school-and-academics", description: null, displayOrder: 1, parentSlug: "academics" },
  { name: "ICSE", slug: "icse", description: null, displayOrder: 2, parentSlug: "school-and-academics" },
  { name: "State Boards - Telangana and AP", slug: "state-boards-telangana-and-ap", description: null, displayOrder: 3, parentSlug: "school-and-academics" },
];

const LANGUAGE: CategoryRow[] = [
  { name: "Language", slug: "language", description: "Language and overseas exam courses", displayOrder: 0, parentSlug: null },
  { name: "Language Course", slug: "language-course", description: null, displayOrder: 1, parentSlug: "language" },
  { name: "English", slug: "english-language", description: null, displayOrder: 2, parentSlug: "language-course" },
  { name: "French", slug: "french-language", description: null, displayOrder: 3, parentSlug: "language-course" },
  { name: "Spanish", slug: "spanish-language", description: null, displayOrder: 4, parentSlug: "language-course" },
  { name: "German", slug: "german-language", description: null, displayOrder: 5, parentSlug: "language-course" },
  { name: "Overseas Exams", slug: "overseas-exams", description: null, displayOrder: 6, parentSlug: "language" },
  { name: "IELTS", slug: "ielts", description: null, displayOrder: 7, parentSlug: "overseas-exams" },
  { name: "TOEFL", slug: "toefl", description: null, displayOrder: 8, parentSlug: "overseas-exams" },
  { name: "PTE", slug: "pte", description: null, displayOrder: 9, parentSlug: "overseas-exams" },
  { name: "Duolingo", slug: "duolingo", description: null, displayOrder: 10, parentSlug: "overseas-exams" },
];

const EXECUTIVE: CategoryRow[] = [
  { name: "Executive and Certificate Program", slug: "executive-and-certificate-program", description: "Executive and certificate programs", displayOrder: 0, parentSlug: null },
  { name: "Executive and Certificate Programs", slug: "executive-and-certificate-programs", description: null, displayOrder: 1, parentSlug: "executive-and-certificate-program" },
  { name: "Management", slug: "management-executive", description: null, displayOrder: 2, parentSlug: "executive-and-certificate-programs" },
  { name: "Digital & AI Skills", slug: "digital-and-ai-skills", description: null, displayOrder: 3, parentSlug: "executive-and-certificate-programs" },
  { name: "Leadership & Mgmt", slug: "leadership-and-mgmt", description: null, displayOrder: 4, parentSlug: "executive-and-certificate-programs" },
  { name: "Skill Dev Basics", slug: "skill-dev-basics", description: null, displayOrder: 5, parentSlug: "executive-and-certificate-programs" },
  { name: "IT", slug: "it-executive", description: null, displayOrder: 6, parentSlug: "executive-and-certificate-programs" },
  { name: "Electronics", slug: "electronics-executive", description: null, displayOrder: 7, parentSlug: "executive-and-certificate-programs" },
  { name: "CIVIL", slug: "civil-executive", description: null, displayOrder: 8, parentSlug: "executive-and-certificate-programs" },
  { name: "Strategic Sales Management", slug: "strategic-sales-management", description: null, displayOrder: 9, parentSlug: "executive-and-certificate-programs" },
  { name: "Digital Marketing with AI - Executive", slug: "digital-marketing-with-ai-executive", description: null, displayOrder: 10, parentSlug: "executive-and-certificate-programs" },
  { name: "General Management & Leadership", slug: "general-management-and-leadership", description: null, displayOrder: 11, parentSlug: "executive-and-certificate-programs" },
  { name: "Business English & Entrepreneurship", slug: "business-english-and-entrepreneurship", description: null, displayOrder: 12, parentSlug: "executive-and-certificate-programs" },
  { name: "Future Tech Leaders - AI & Industry 5.0", slug: "future-tech-leaders-ai-industry-5", description: null, displayOrder: 13, parentSlug: "executive-and-certificate-programs" },
  { name: "Executive in Semiconductor Manufacturing", slug: "executive-in-semiconductor-manufacturing", description: null, displayOrder: 14, parentSlug: "executive-and-certificate-programs" },
  { name: "Executive PGP in Advanced Construction Mgmt", slug: "executive-pgp-advanced-construction-mgmt", description: null, displayOrder: 15, parentSlug: "executive-and-certificate-programs" },
  { name: "Sales & Marketing Leadership", slug: "sales-and-marketing-leadership", description: null, displayOrder: 16, parentSlug: "executive-and-certificate-programs" },
  { name: "Executive Programme in AI", slug: "executive-programme-in-ai", description: null, displayOrder: 17, parentSlug: "executive-and-certificate-programs" },
  { name: "Executive on EV Designing & Analysis", slug: "executive-on-ev-designing-and-analysis", description: null, displayOrder: 18, parentSlug: "executive-and-certificate-programs" },
  { name: "Executive PGP in Advanced Project Mgmt", slug: "executive-pgp-advanced-project-mgmt", description: null, displayOrder: 19, parentSlug: "executive-and-certificate-programs" },
  { name: "Executive Programme in Business Management", slug: "executive-programme-business-management", description: null, displayOrder: 20, parentSlug: "executive-and-certificate-programs" },
  { name: "Cybersecurity - AI & Cyber Security Executive", slug: "cybersecurity-ai-cyber-security-executive", description: null, displayOrder: 21, parentSlug: "executive-and-certificate-programs" },
  { name: "Executive on VLSI", slug: "executive-on-vlsi", description: null, displayOrder: 22, parentSlug: "executive-and-certificate-programs" },
  { name: "Leadership and Managerial Development", slug: "leadership-and-managerial-development", description: null, displayOrder: 23, parentSlug: "executive-and-certificate-programs" },
  { name: "Data Science & Big Data Analytics", slug: "data-science-big-data-analytics-executive", description: null, displayOrder: 24, parentSlug: "executive-and-certificate-programs" },
  { name: "Automation in Manufacturing", slug: "automation-in-manufacturing", description: null, displayOrder: 25, parentSlug: "executive-and-certificate-programs" },
  { name: "Leadership and Change Management", slug: "leadership-and-change-management", description: null, displayOrder: 26, parentSlug: "executive-and-certificate-programs" },
  { name: "Quantum Computing Fundamentals", slug: "quantum-computing-fundamentals", description: null, displayOrder: 27, parentSlug: "executive-and-certificate-programs" },
  { name: "Certificate in Entrepreneurship & Startups", slug: "certificate-in-entrepreneurship-and-startups", description: null, displayOrder: 28, parentSlug: "executive-and-certificate-programs" },
];

const ALL_ROWS: CategoryRow[] = [...ACADEMICS, ...LANGUAGE, ...EXECUTIVE];

async function seedCategories() {
  if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

  const sql = postgres(DATABASE_URL);
  const db = drizzle(sql);

  const existing = await db.select().from(categories);
  if (existing.length > 0) {
    console.log(`Clearing ${existing.length} existing categories...`);
    for (const c of existing) {
      await db.delete(categories).where(eq(categories.categoryId, c.categoryId));
    }
  }

  const slugToId = new Map<string, string>();

  for (const row of ALL_ROWS) {
    const slug = slugify(row.slug) || row.slug;
    const parentId = row.parentSlug ? slugToId.get(row.parentSlug) ?? null : null;

    const [inserted] = await db
      .insert(categories)
      .values({
        name: row.name,
        slug,
        description: row.description,
        displayOrder: row.displayOrder,
        parentCategoryId: parentId,
        isActive: true,
        isDeleted: false,
      })
      .returning({ categoryId: categories.categoryId });

    if (inserted) slugToId.set(slug, inserted.categoryId);
    console.log(`  ${parentId ? "  sub: " : "main:"} ${row.name} (${slug})`);
  }

  await sql.end();
  const mainCount = ALL_ROWS.filter((r) => r.parentSlug === null).length;
  const subCount = ALL_ROWS.length - mainCount;
  console.log(`\nDone. ${mainCount} main categories, ${subCount} sub-categories.`);
}

seedCategories().catch((err) => {
  console.error(err);
  process.exit(1);
});
