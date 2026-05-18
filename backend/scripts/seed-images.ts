import { config } from "dotenv";
import { resolve } from "path";
import { drizzle } from "drizzle-orm/postgres-js";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const postgres = require("postgres");
import { banners } from "../src/database/schema";
import { eq } from "drizzle-orm";

config({ path: resolve(process.cwd(), ".env") });

const DATABASE_URL = process.env.DATABASE_URL;
const BUNNY_ZONE = process.env.BUNNY_STORAGE_ZONE_NAME;
const BUNNY_API_KEY = process.env.BUNNY_STORAGE_API_KEY;
const BUNNY_CDN = process.env.BUNNY_CDN_HOSTNAME;
const BUNNY_REGION = process.env.BUNNY_STORAGE_REGION;

const useBunny = !!(BUNNY_ZONE && BUNNY_API_KEY && BUNNY_CDN);

function getBunnyStorageBaseUrl(): string {
  const regionPrefix = BUNNY_REGION ? `${BUNNY_REGION.toLowerCase()}.` : "";
  return `https://${regionPrefix}storage.bunnycdn.com`;
}

async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${url}`);
  return Buffer.from(new Uint8Array(await res.arrayBuffer()));
}

async function uploadToBunny(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  if (!useBunny || !BUNNY_ZONE || !BUNNY_API_KEY || !BUNNY_CDN) {
    throw new Error("Bunny Storage env vars required for upload");
  }
  const url = `${getBunnyStorageBaseUrl()}/${BUNNY_ZONE}/${key}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      AccessKey: BUNNY_API_KEY,
      "Content-Type": contentType,
    },
    body: new Uint8Array(buffer),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Bunny Storage upload failed (${response.status}): ${body}`);
  }
  return `https://${BUNNY_CDN}/${key}`;
}

const UNSPLASH_PARAMS = "?w=1920&h=800&fit=crop&q=80";

const FREE_BANNER_IMAGES = [
  {
    url: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b" + UNSPLASH_PARAMS,
    title: "Transform Your Future with Expert-Led Courses",
    subtitle: "Learn from industry professionals and build real-world skills",
    description:
      "Join thousands of learners who have advanced their careers through our comprehensive online courses.",
    ctaText: "Explore Courses",
    ctaLink: "/courses",
    secondaryCtaText: "Become an Instructor",
    secondaryCtaLink: "/become-teacher",
    badgeText: "New Courses Available",
    badgeColor: "#3b82f6",
    textAlign: "left",
  },
  {
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d" + UNSPLASH_PARAMS,
    title: "Master In-Demand Skills at Your Own Pace",
    subtitle: "Flexible learning designed for modern professionals",
    description:
      "Access world-class education anytime, anywhere. Our platform adapts to your schedule.",
    ctaText: "Start Learning",
    ctaLink: "/courses",
    secondaryCtaText: "View Categories",
    secondaryCtaLink: "/courses#categories",
    badgeText: "500+ Courses",
    badgeColor: "#10b981",
    textAlign: "center",
  },
  {
    url: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac" + UNSPLASH_PARAMS,
    title: "Learn Together, Grow Together",
    subtitle: "Collaborative learning experiences that make a difference",
    description:
      "Connect with peers, engage with instructors, and build a network that lasts a lifetime.",
    ctaText: "Join Now",
    ctaLink: "/register",
    secondaryCtaText: "Learn More",
    secondaryCtaLink: "/about-us",
    badgeText: "Community Driven",
    badgeColor: "#f59e0b",
    textAlign: "left",
  },
  {
    url: "https://images.unsplash.com/photo-1588075592446-265fd1e6e76f" + UNSPLASH_PARAMS,
    title: "Industry-Recognized Certifications",
    subtitle: "Boost your resume with certificates that employers value",
    description:
      "Complete courses and earn certificates recognized by top companies worldwide.",
    ctaText: "Browse Certifications",
    ctaLink: "/courses",
    secondaryCtaText: null as string | null,
    secondaryCtaLink: null as string | null,
    badgeText: "Certified Programs",
    badgeColor: "#8b5cf6",
    textAlign: "center",
  },
  {
    url: "https://images.unsplash.com/photo-1552664730-d307ca884978" + UNSPLASH_PARAMS,
    title: "Empowering the Next Generation of Leaders",
    subtitle: "Corporate training solutions for teams of all sizes",
    description:
      "Upskill your workforce with customized training programs designed for enterprise success.",
    ctaText: "Contact Us",
    ctaLink: "/contact",
    secondaryCtaText: "For Teams",
    secondaryCtaLink: "/contact",
    badgeText: "Enterprise Solutions",
    badgeColor: "#ec4899",
    textAlign: "right",
  },
];

async function seedBanners() {
  if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

  if (useBunny) {
    console.log("Bunny Storage configured — uploading banner images to Bunny.");
  } else {
    console.log("Bunny not configured — using Unsplash URLs directly.");
  }

  const sql = postgres(DATABASE_URL);
  const db = drizzle(sql);

  const existing = await db.select({ bannerId: banners.bannerId }).from(banners);
  if (existing.length > 0) {
    console.log(
      `Clearing ${existing.length} existing banners before re-seeding...`
    );
    for (const b of existing) {
      await db.delete(banners).where(eq(banners.bannerId, b.bannerId));
    }
  }

  for (let i = 0; i < FREE_BANNER_IMAGES.length; i++) {
    const banner = FREE_BANNER_IMAGES[i];
    let imageUrl = banner.url;
    if (useBunny) {
      try {
        console.log(`Downloading and uploading banner ${i + 1} to Bunny...`);
        const buffer = await downloadImage(banner.url);
        const key = `seed/banners/banner-${Date.now()}-${i}.jpg`;
        imageUrl = await uploadToBunny(buffer, key, "image/jpeg");
        console.log(`Uploaded to Bunny: ${key}`);
      } catch (e) {
        console.warn(
          `Bunny upload failed for banner ${i + 1}, using Unsplash URL:`,
          (e as Error).message
        );
      }
    } else {
      console.log(`Using Unsplash URL for banner ${i + 1}: ${banner.title}`);
    }
    await db.insert(banners).values({
      title: banner.title,
      subtitle: banner.subtitle,
      description: banner.description,
      imageUrl,
      overlayColor: "rgba(0,0,0,0.4)",
      overlayOpacity: 40,
      textColor: "#ffffff",
      textAlign: banner.textAlign ?? "left",
      ctaText: banner.ctaText,
      ctaLink: banner.ctaLink,
      ctaStyle: "primary",
      secondaryCtaText: banner.secondaryCtaText ?? null,
      secondaryCtaLink: banner.secondaryCtaLink ?? null,
      badgeText: banner.badgeText,
      badgeColor: banner.badgeColor ?? null,
      displayOrder: i,
      isActive: true,
    });
    console.log(`Inserted banner ${i + 1}: "${banner.title}"`);
  }

  await sql.end();
  console.log(`\nSeeded ${FREE_BANNER_IMAGES.length} banners successfully.`);
}

seedBanners().catch((err) => {
  console.error(err);
  process.exit(1);
});
