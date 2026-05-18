import { config } from "dotenv";
import { resolve } from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import {
  faqs,
  whyChooseUs,
  testimonials,
  services,
  siteSettings,
} from "../src/database/schema";
import { eq } from "drizzle-orm";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const postgres = require("postgres");

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

async function downloadAndUploadToBunny(
  url: string,
  key: string
): Promise<string> {
  if (!useBunny || !BUNNY_ZONE || !BUNNY_API_KEY || !BUNNY_CDN) return url;
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    const buffer = Buffer.from(new Uint8Array(await res.arrayBuffer()));
    const uploadUrl = `${getBunnyStorageBaseUrl()}/${BUNNY_ZONE}/${key}`;
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        AccessKey: BUNNY_API_KEY,
        "Content-Type": "image/jpeg",
      },
      body: new Uint8Array(buffer),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Bunny upload failed (${response.status}): ${body}`);
    }
    return `https://${BUNNY_CDN}/${key}`;
  } catch (e) {
    console.warn(`Bunny upload failed for ${key}:`, (e as Error).message);
    return url;
  }
}

const FAQ_DATA = [
  {
    question: "What types of courses does grotutor offer?",
    answer:
      "We offer a wide range of courses across technology, business, design, personal development, and more. Our courses include video lectures, hands-on projects, quizzes, and certificates of completion.",
  },
  {
    question: "How do I enroll in a course?",
    answer:
      "Simply browse our course catalog, select the course you're interested in, and click 'Enroll'. You can pay securely using credit/debit cards or other supported payment methods.",
  },
  {
    question: "Can I access courses on mobile devices?",
    answer:
      "Yes! Our platform is fully responsive and works on smartphones, tablets, and desktops. Learn anytime, anywhere at your own pace.",
  },
  {
    question: "Do you offer certificates upon completion?",
    answer:
      "Yes, upon completing a course, you'll receive a digital certificate that you can share on LinkedIn, add to your resume, or download as a PDF.",
  },
  {
    question: "What is the refund policy?",
    answer:
      "We offer a 30-day money-back guarantee on all courses. If you're not satisfied with a course, you can request a full refund within 30 days of purchase.",
  },
  {
    question: "Can I become an instructor on grotutor?",
    answer:
      "Absolutely! We welcome experienced professionals to share their knowledge. Visit our 'Become an Instructor' page to submit your application and start creating courses.",
  },
  {
    question: "Are courses self-paced or scheduled?",
    answer:
      "Most of our courses are self-paced, meaning you can start and finish whenever you like. Some specialized workshops may have scheduled live sessions.",
  },
  {
    question: "How can I contact support?",
    answer:
      "You can reach our support team via the Contact page, email at support@grotutor.com, or through our live chat available during business hours.",
  },
];

const WHY_CHOOSE_US_DATA = [
  {
    iconName: "GraduationCap",
    iconColor: "#3b82f6",
    iconBg: "#eef2ff",
    title: "Expert Instructors",
    description:
      "Learn from industry professionals with years of real-world experience in their fields.",
  },
  {
    iconName: "Clock",
    iconColor: "#10b981",
    iconBg: "#ecfdf5",
    title: "Flexible Learning",
    description:
      "Study at your own pace with lifetime access to course content and materials.",
  },
  {
    iconName: "Award",
    iconColor: "#f59e0b",
    iconBg: "#fffbeb",
    title: "Recognized Certificates",
    description:
      "Earn certificates valued by employers worldwide to boost your career prospects.",
  },
  {
    iconName: "Users",
    iconColor: "#ec4899",
    iconBg: "#fdf2f8",
    title: "Community Support",
    description:
      "Join a vibrant learning community with peer discussions and instructor support.",
  },
  {
    iconName: "ShieldCheck",
    iconColor: "#8b5cf6",
    iconBg: "#f5f3ff",
    title: "Money-Back Guarantee",
    description:
      "30-day refund policy. If you're not satisfied, get your money back — no questions asked.",
  },
  {
    iconName: "Laptop",
    iconColor: "#06b6d4",
    iconBg: "#ecfeff",
    title: "Hands-On Projects",
    description:
      "Apply what you learn through practical, real-world projects that build your portfolio.",
  },
];

const TESTIMONIAL_DATA = [
  {
    name: "Priya Sharma",
    role: "Software Developer",
    company: "TCS",
    rating: 5,
    text: "The web development bootcamp was transformative. I went from basic HTML knowledge to building full-stack applications in just 3 months. Highly recommended!",
    course: "Full-Stack Web Development",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&q=80",
  },
  {
    name: "Rahul Mehta",
    role: "Data Analyst",
    company: "Infosys",
    rating: 5,
    text: "The Python for Data Science course gave me the skills I needed to transition into data analytics. The instructor was incredibly knowledgeable and responsive.",
    course: "Python for Data Science",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&q=80",
  },
  {
    name: "Ananya Patel",
    role: "UX Designer",
    company: "Flipkart",
    rating: 5,
    text: "I loved the UI/UX Design masterclass. The practical projects helped me build a strong portfolio that landed me my dream job.",
    course: "UI/UX Design Masterclass",
    avatarUrl:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop&q=80",
  },
  {
    name: "Arjun Reddy",
    role: "Product Manager",
    company: "Zoho",
    rating: 4,
    text: "The digital marketing course was comprehensive and practical. I was able to apply what I learned immediately to improve our company's online presence.",
    course: "Digital Marketing Fundamentals",
    avatarUrl:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&q=80",
  },
  {
    name: "Kavitha Krishnan",
    role: "Cloud Engineer",
    company: "Amazon",
    rating: 5,
    text: "The AWS certification prep course was exactly what I needed. Clear explanations, great labs, and I passed my exam on the first attempt!",
    course: "AWS Cloud Practitioner",
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&q=80",
  },
  {
    name: "Vikram Singh",
    role: "Freelance Developer",
    company: "Self-Employed",
    rating: 5,
    text: "grotutor changed my career trajectory. The React course gave me the confidence to start freelancing, and now I earn more than ever.",
    course: "React.js Advanced Patterns",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&q=80",
  },
];

const SERVICES_DATA = [
  {
    title: "Professional Courses",
    slug: "professional-courses",
    description:
      "Industry-aligned courses designed to accelerate your career. From programming to business management, find the skills you need.",
    iconName: "BookOpen",
    imageUrl:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=500&fit=crop&q=80",
  },
  {
    title: "Corporate Training",
    slug: "corporate-training",
    description:
      "Customized training programs for organizations. Upskill your team with enterprise solutions tailored to your industry needs.",
    iconName: "Building2",
    imageUrl:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=500&fit=crop&q=80",
  },
  {
    title: "Certification Programs",
    slug: "certification-programs",
    description:
      "Earn recognized certificates in cloud computing, cybersecurity, project management, and more to validate your expertise.",
    iconName: "Award",
    imageUrl:
      "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&h=500&fit=crop&q=80",
  },
  {
    title: "Workshops & Bootcamps",
    slug: "workshops-bootcamps",
    description:
      "Intensive, hands-on workshops and bootcamps for rapid skill acquisition. Perfect for career changers and ambitious professionals.",
    iconName: "Rocket",
    imageUrl:
      "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&h=500&fit=crop&q=80",
  },
  {
    title: "Mentorship Programs",
    slug: "mentorship-programs",
    description:
      "One-on-one mentorship from industry experts. Get personalized guidance, career advice, and portfolio reviews.",
    iconName: "HeartHandshake",
    imageUrl:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=500&fit=crop&q=80",
  },
];

async function seedCms() {
  if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

  if (useBunny) {
    console.log("Bunny Storage configured — uploading CMS images to Bunny.");
  }

  const sql = postgres(DATABASE_URL);
  const db = drizzle(sql);
  const ts = Date.now();

  // --- FAQs ---
  console.log("\n--- Seeding FAQs ---");
  const existingFaqs = await db.select().from(faqs);
  if (existingFaqs.length > 0) {
    for (const f of existingFaqs) {
      await db.delete(faqs).where(eq(faqs.faqId, f.faqId));
    }
    console.log(`Cleared ${existingFaqs.length} existing FAQs`);
  }
  for (let i = 0; i < FAQ_DATA.length; i++) {
    await db.insert(faqs).values({
      question: FAQ_DATA[i].question,
      answer: FAQ_DATA[i].answer,
      displayOrder: i,
      isActive: true,
    });
  }
  console.log(`Inserted ${FAQ_DATA.length} FAQs`);

  // --- Why Choose Us ---
  console.log("\n--- Seeding Why Choose Us ---");
  const existingWhy = await db.select().from(whyChooseUs);
  if (existingWhy.length > 0) {
    for (const w of existingWhy) {
      await db.delete(whyChooseUs).where(eq(whyChooseUs.id, w.id));
    }
    console.log(`Cleared ${existingWhy.length} existing entries`);
  }
  for (let i = 0; i < WHY_CHOOSE_US_DATA.length; i++) {
    const item = WHY_CHOOSE_US_DATA[i];
    await db.insert(whyChooseUs).values({
      iconName: item.iconName,
      iconColor: item.iconColor,
      iconBg: item.iconBg,
      title: item.title,
      description: item.description,
      displayOrder: i,
      isActive: true,
    });
  }
  console.log(`Inserted ${WHY_CHOOSE_US_DATA.length} Why Choose Us entries`);

  // --- Testimonials ---
  console.log("\n--- Seeding Testimonials ---");
  const existingTestimonials = await db.select().from(testimonials);
  if (existingTestimonials.length > 0) {
    for (const t of existingTestimonials) {
      await db
        .delete(testimonials)
        .where(eq(testimonials.testimonialId, t.testimonialId));
    }
    console.log(`Cleared ${existingTestimonials.length} existing testimonials`);
  }
  for (let i = 0; i < TESTIMONIAL_DATA.length; i++) {
    const t = TESTIMONIAL_DATA[i];
    let avatarUrl = t.avatarUrl;
    if (useBunny && avatarUrl) {
      avatarUrl = await downloadAndUploadToBunny(
        avatarUrl,
        `seed/testimonials/avatar-${ts}-${i}.jpg`
      );
      console.log(`Uploaded avatar for ${t.name}`);
    }
    await db.insert(testimonials).values({
      name: t.name,
      role: t.role,
      company: t.company,
      rating: t.rating,
      text: t.text,
      course: t.course,
      avatarUrl,
      displayOrder: i,
      isActive: true,
    });
  }
  console.log(`Inserted ${TESTIMONIAL_DATA.length} testimonials`);

  // --- Services ---
  console.log("\n--- Seeding Services ---");
  const existingServices = await db.select().from(services);
  if (existingServices.length > 0) {
    for (const s of existingServices) {
      await db.delete(services).where(eq(services.serviceId, s.serviceId));
    }
    console.log(`Cleared ${existingServices.length} existing services`);
  }
  for (let i = 0; i < SERVICES_DATA.length; i++) {
    const s = SERVICES_DATA[i];
    let imageUrl = s.imageUrl;
    if (useBunny) {
      imageUrl = await downloadAndUploadToBunny(
        imageUrl,
        `seed/services/service-${ts}-${i}.jpg`
      );
      console.log(`Uploaded image for ${s.title}`);
    }
    await db.insert(services).values({
      title: s.title,
      slug: s.slug,
      description: s.description,
      imageUrl,
      iconName: s.iconName,
      displayOrder: i,
      isActive: true,
    });
  }
  console.log(`Inserted ${SERVICES_DATA.length} services`);

  // --- Site Settings ---
  console.log("\n--- Seeding Site Settings ---");
  const aboutSettings = {
    heroTitle: "Transforming Education, Empowering Futures",
    heroDescription:
      "grotutor is a leading online learning platform dedicated to making quality education accessible to everyone, everywhere.",
    mission:
      "To democratize education by providing affordable, high-quality online courses that empower learners to achieve their professional and personal goals.",
    vision:
      "To become the world's most trusted and impactful online learning platform, shaping the future of education through technology and innovation.",
    stats: [
      { label: "Active Learners", value: "50,000+" },
      { label: "Expert Instructors", value: "200+" },
      { label: "Courses Available", value: "500+" },
      { label: "Countries Reached", value: "45+" },
    ],
    values: [
      {
        title: "Quality First",
        description: "Every course is reviewed by experts to meet high standards.",
        icon: "Star",
      },
      {
        title: "Accessible Learning",
        description: "Education should be available to everyone, everywhere.",
        icon: "Globe",
      },
      {
        title: "Innovation",
        description: "We leverage technology to create better learning experiences.",
        icon: "Lightbulb",
      },
      {
        title: "Community",
        description: "We foster a supportive community of learners and educators.",
        icon: "Heart",
      },
    ],
  };

  const existing = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, "about"));
  if (existing.length > 0) {
    await db
      .update(siteSettings)
      .set({ value: aboutSettings, updatedAt: new Date() })
      .where(eq(siteSettings.key, "about"));
    console.log("Updated 'about' site settings");
  } else {
    await db.insert(siteSettings).values({
      key: "about",
      value: aboutSettings,
    });
    console.log("Inserted 'about' site settings");
  }

  await sql.end();
  console.log("\nCMS seeding complete!");
}

seedCms().catch((err) => {
  console.error(err);
  process.exit(1);
});
