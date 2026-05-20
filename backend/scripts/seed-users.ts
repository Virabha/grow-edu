/**
 * Seed a baseline set of users covering every role.
 *
 *   pnpm seed:users
 *
 * Re-runnable: skips users that already exist by email. Use `--reset` to
 * wipe & recreate the entire seed set (deletes users with the seed emails
 * and their dependent rows; will fail if they have foreign-key relations
 * you care about — only safe on a dev/staging DB).
 *
 * Default password for every account: Password123!
 */
import { config } from "dotenv";
import { resolve } from "path";
import { drizzle } from "drizzle-orm/postgres-js";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const postgres = require("postgres");
import { eq, inArray } from "drizzle-orm";
import * as bcrypt from "bcrypt";
import {
  users,
  companies,
  instructorProfiles,
} from "../src/database/schema";

config({ path: resolve(process.cwd(), ".env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const reset = process.argv.includes("--reset");
const DEFAULT_PASSWORD = "Password123!";

type SeedUser = {
  email: string;
  firstName: string;
  lastName: string;
  role: "LEARNER" | "INSTRUCTOR" | "CORPORATE_ADMIN" | "PLATFORM_ADMIN";
  emailVerified?: boolean;
  instructorProfile?: {
    bio: string;
    expertise: string[];
    experience: string;
    education: string;
    avatarUrl?: string;
  };
};

const SEED_COMPANY_NAME = "grotutor Demo Corp";

const SEED_USERS: SeedUser[] = [
  // ── Platform admins ──
  {
    email: "admin@grotutor.com",
    firstName: "Platform",
    lastName: "Admin",
    role: "PLATFORM_ADMIN",
    emailVerified: true,
  },
  {
    email: "superadmin@grotutor.com",
    firstName: "Super",
    lastName: "Admin",
    role: "PLATFORM_ADMIN",
    emailVerified: true,
  },

  // ── Corporate admin ──
  {
    email: "corporate@grotutor.com",
    firstName: "Corporate",
    lastName: "Admin",
    role: "CORPORATE_ADMIN",
    emailVerified: true,
  },

  // ── Instructors (with profiles) ──
  {
    email: "instructor1@grotutor.com",
    firstName: "Anita",
    lastName: "Iyengar",
    role: "INSTRUCTOR",
    emailVerified: true,
    instructorProfile: {
      bio: "Cloud architect with 12 years building distributed systems at scale. Teaches AWS, Kubernetes, and platform engineering.",
      expertise: ["Cloud Architecture", "Kubernetes", "AWS", "System Design"],
      experience: "12+ years · Ex-AWS, Razorpay",
      education: "M.S. Computer Science, IIT Bombay",
      avatarUrl:
        "https://images.unsplash.com/photo-1573497019418-b400bb3ab074?auto=format&fit=crop&w=600&h=600&q=80",
    },
  },
  {
    email: "instructor2@grotutor.com",
    firstName: "Vikram",
    lastName: "Reddy",
    role: "INSTRUCTOR",
    emailVerified: true,
    instructorProfile: {
      bio: "IIT-JEE mentor for a decade. Trained 5,000+ students into top engineering colleges across India.",
      expertise: ["Physics", "Mathematics", "JEE Advanced", "Olympiads"],
      experience: "10+ years · 5,000+ students mentored",
      education: "B.Tech, IIT Madras",
      avatarUrl:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&h=600&q=80",
    },
  },
  {
    email: "instructor3@grotutor.com",
    firstName: "Meera",
    lastName: "Kapoor",
    role: "INSTRUCTOR",
    emailVerified: true,
    instructorProfile: {
      bio: "IELTS examiner & language coach. Specialises in academic writing and speaking for international students.",
      expertise: ["IELTS", "TOEFL", "Academic Writing", "Speaking"],
      experience: "8 years · Former Cambridge examiner",
      education: "M.A. Linguistics, JNU",
      avatarUrl:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&h=600&q=80",
    },
  },

  // ── Learners ──
  {
    email: "learner1@example.com",
    firstName: "Rohan",
    lastName: "Sharma",
    role: "LEARNER",
    emailVerified: true,
  },
  {
    email: "learner2@example.com",
    firstName: "Priya",
    lastName: "Patel",
    role: "LEARNER",
    emailVerified: true,
  },
  {
    email: "learner3@example.com",
    firstName: "Arjun",
    lastName: "Menon",
    role: "LEARNER",
    emailVerified: false,
  },
];

async function main() {
  const client = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(client);

  if (reset) {
    const emails = SEED_USERS.map((u) => u.email);
    console.log(`Resetting: removing ${emails.length} seed users by email…`);
    const existing = await db
      .select({ userId: users.userId })
      .from(users)
      .where(inArray(users.email, emails));
    const ids = existing.map((r) => r.userId);
    if (ids.length) {
      await db
        .delete(instructorProfiles)
        .where(inArray(instructorProfiles.userId, ids));
      await db.delete(users).where(inArray(users.userId, ids));
      console.log(`  Removed ${ids.length} user(s) and their profiles.`);
    } else {
      console.log("  Nothing to remove.");
    }
  }

  // Ensure demo company exists for the corporate admin.
  let demoCompanyId: string | null = null;
  const existingCompany = await db
    .select({ companyId: companies.companyId })
    .from(companies)
    .where(eq(companies.name, SEED_COMPANY_NAME))
    .limit(1);

  if (existingCompany.length > 0) {
    demoCompanyId = existingCompany[0].companyId;
  } else {
    const [row] = await db
      .insert(companies)
      .values({
        name: SEED_COMPANY_NAME,
        email: "corporate@grotutor.com",
        phone: "+91-1800-000-000",
        address: "Hyderabad, India",
      })
      .returning({ companyId: companies.companyId });
    demoCompanyId = row.companyId;
    console.log(`Created demo company: ${SEED_COMPANY_NAME}`);
  }

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  let created = 0;
  let skipped = 0;
  let profilesCreated = 0;

  for (const u of SEED_USERS) {
    const existing = await db
      .select({ userId: users.userId, role: users.role })
      .from(users)
      .where(eq(users.email, u.email))
      .limit(1);

    let userId: string;
    if (existing.length > 0) {
      userId = existing[0].userId;
      console.log(`  skip  ${u.email}  (already exists)`);
      skipped++;
    } else {
      const [row] = await db
        .insert(users)
        .values({
          email: u.email,
          password: hashedPassword,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          emailVerified: u.emailVerified ?? true,
          companyId: u.role === "CORPORATE_ADMIN" ? demoCompanyId : null,
        })
        .returning({ userId: users.userId });
      userId = row.userId;
      console.log(`  +     ${u.email}  ·  ${u.role}`);
      created++;
    }

    // Ensure instructor profile if applicable.
    if (u.instructorProfile) {
      const existingProfile = await db
        .select({ profileId: instructorProfiles.profileId })
        .from(instructorProfiles)
        .where(eq(instructorProfiles.userId, userId))
        .limit(1);

      if (existingProfile.length === 0) {
        await db.insert(instructorProfiles).values({
          userId,
          bio: u.instructorProfile.bio,
          expertise: u.instructorProfile.expertise,
          experience: u.instructorProfile.experience,
          education: u.instructorProfile.education,
          avatarUrl: u.instructorProfile.avatarUrl,
          isActive: true,
        });
        profilesCreated++;
      }
    }
  }

  await client.end();

  console.log("");
  console.log(
    `Done. ${created} user(s) created, ${skipped} skipped, ${profilesCreated} instructor profile(s) created.`,
  );
  console.log(`Default password for every seed account: ${DEFAULT_PASSWORD}`);
  console.log("");
}

main().catch((err) => {
  console.error("\nSeed failed:", err);
  process.exit(1);
});
