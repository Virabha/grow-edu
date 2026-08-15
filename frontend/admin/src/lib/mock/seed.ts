/**
 * Seed data for the admin demo build.
 *
 * Deterministic literals only — no Date.now(), no Math.random() — so a server
 * render and the client hydration agree.
 */

/* --------------------------------------------------------------- artwork */

const PAPER = "#eef2f6";
const INK = "#1d2733";
const INK_2 = "#2b3949";
const ACCENT = "#3f6f9c";
const ACCENT_2 = "#6aa0cc";

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

/** Drawn thumbnails — no third-party image host to fail mid-demo. */
export function art(seed: string): string {
  const h = hash(seed);
  const variant = h % 4;
  const cx = 110 + (h % 6) * 24;
  const angle = 6 + (h % 5) * 8;

  const shapes = [
    `<g fill="none"><circle cx="${cx}" cy="150" r="124" stroke="${ACCENT}" stroke-width="14"/><circle cx="${cx}" cy="150" r="86" stroke="${ACCENT_2}" stroke-width="8" opacity="0.7"/></g>`,
    `<g><rect x="${cx - 88}" y="140" width="34" height="120" rx="6" fill="${ACCENT}"/><rect x="${cx - 42}" y="96" width="34" height="164" rx="6" fill="${ACCENT_2}"/><rect x="${cx + 4}" y="58" width="34" height="202" rx="6" fill="${PAPER}" opacity="0.3"/></g>`,
    `<g><path d="M ${cx - 104} 250 L ${cx - 24} 62 L ${cx + 62} 250 Z" fill="${ACCENT}"/><path d="M ${cx - 14} 250 L ${cx + 64} 100 L ${cx + 148} 250 Z" fill="${ACCENT_2}" opacity="0.75"/></g>`,
    `<g opacity="0.9"><rect x="${cx - 92}" y="72" width="70" height="70" rx="10" fill="${ACCENT}"/><rect x="${cx - 10}" y="72" width="70" height="70" rx="10" fill="${PAPER}" opacity="0.28"/><rect x="${cx - 92}" y="154" width="70" height="70" rx="10" fill="${ACCENT_2}"/></g>`,
  ];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${INK_2}"/><stop offset="100%" stop-color="${INK}"/></linearGradient><clipPath id="c"><rect width="640" height="360"/></clipPath></defs><rect width="640" height="360" fill="url(#g)"/><g clip-path="url(#c)" transform="rotate(${angle} 320 180)">${shapes[variant]}</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, " "))}`;
}

/* ------------------------------------------------------------ catalogue */

export const CATEGORIES = [
  { categoryId: "cat-exams", parentCategoryId: null, name: "Competitive Exams", slug: "competitive-exams", description: "UPSC, JEE, NEET, banking and state services.", imageUrl: art("cat-exams"), isActive: true, displayOrder: 1, courseCount: 3, createdAt: "2025-01-12T09:00:00.000Z" },
  { categoryId: "cat-exams-upsc", parentCategoryId: "cat-exams", name: "UPSC", slug: "upsc", description: "Civil services preliminary and mains.", imageUrl: art("cat-upsc"), isActive: true, displayOrder: 1, courseCount: 1, createdAt: "2025-01-12T09:05:00.000Z" },
  { categoryId: "cat-exams-jee", parentCategoryId: "cat-exams", name: "JEE", slug: "jee", description: "Engineering entrance.", imageUrl: art("cat-jee"), isActive: true, displayOrder: 2, courseCount: 1, createdAt: "2025-01-12T09:06:00.000Z" },
  { categoryId: "cat-skills", parentCategoryId: null, name: "Professional Skills", slug: "professional-skills", description: "Communication, product and marketing.", imageUrl: art("cat-skills"), isActive: true, displayOrder: 2, courseCount: 3, createdAt: "2025-01-12T09:10:00.000Z" },
  { categoryId: "cat-tech", parentCategoryId: null, name: "Technology", slug: "technology", description: "Engineering and data.", imageUrl: art("cat-tech"), isActive: true, displayOrder: 3, courseCount: 2, createdAt: "2025-01-12T09:12:00.000Z" },
  { categoryId: "cat-academics", parentCategoryId: null, name: "Academics", slug: "academics", description: "School and board syllabus.", imageUrl: art("cat-academics"), isActive: true, displayOrder: 4, courseCount: 1, createdAt: "2025-01-12T09:14:00.000Z" },
  { categoryId: "cat-finance", parentCategoryId: null, name: "Finance & Accounting", slug: "finance-accounting", description: "Modelling, valuation and analysis.", imageUrl: art("cat-finance"), isActive: false, displayOrder: 5, courseCount: 1, createdAt: "2025-01-12T09:16:00.000Z" },
];

export const INSTRUCTORS = [
  { userId: "ins-anand", firstName: "Anand", lastName: "Krishnan", email: "instructor1@grotutor.com" },
  { userId: "ins-meera", firstName: "Meera", lastName: "Subramanian", email: "instructor2@grotutor.com" },
  { userId: "ins-rahul", firstName: "Rahul", lastName: "Deshpande", email: "instructor3@grotutor.com" },
  { userId: "ins-fatima", firstName: "Fatima", lastName: "Sheikh", email: "instructor4@grotutor.com" },
  { userId: "ins-vikram", firstName: "Vikram", lastName: "Nair", email: "instructor5@grotutor.com" },
];

const COURSE_ROWS: [string, string, string, string, string, number, number, string, string, number, number, number][] = [
  ["crs-upsc-prelims", "UPSC Prelims: Complete General Studies", "upsc-prelims-general-studies", "cat-exams-upsc", "ins-anand", 14999, 24999, "PUBLISHED", "APPROVED", 184, 9420, 48],
  ["crs-jee-physics", "JEE Advanced Physics: Mechanics to Modern", "jee-advanced-physics", "cat-exams-jee", "ins-meera", 11999, 17999, "PUBLISHED", "APPROVED", 142, 5310, 44],
  ["crs-data-analytics", "Data Analytics with Python and SQL", "data-analytics-python-sql", "cat-tech", "ins-rahul", 8999, 13999, "PUBLISHED", "APPROVED", 96, 14780, 32],
  ["crs-spoken-english", "Spoken English for the Workplace", "spoken-english-workplace", "cat-skills", "ins-fatima", 3499, 5999, "PUBLISHED", "APPROVED", 60, 22140, 16],
  ["crs-financial-modelling", "Financial Modelling and Valuation", "financial-modelling-valuation", "cat-finance", "ins-vikram", 12499, 0, "PUBLISHED", "APPROVED", 78, 3890, 28],
  ["crs-react-production", "React in Production", "react-in-production", "cat-tech", "ins-rahul", 9499, 14999, "PUBLISHED", "APPROVED", 88, 7620, 29],
  ["crs-class12-maths", "Class 12 Mathematics — CBSE Board Complete", "class-12-mathematics-cbse", "cat-academics", "ins-meera", 4999, 7999, "PUBLISHED", "APPROVED", 124, 11240, 36],
  ["crs-product-management", "Product Management Foundations", "product-management-foundations", "cat-skills", "ins-fatima", 10999, 16999, "PUBLISHED", "APPROVED", 72, 6180, 24],
  ["crs-banking-po", "Banking PO: Quantitative Aptitude", "banking-po-quantitative-aptitude", "cat-exams", "ins-anand", 5999, 8999, "PUBLISHED", "APPROVED", 110, 13050, 26],
  ["crs-digital-marketing", "Digital Marketing: Search, Social and Analytics", "digital-marketing-complete", "cat-skills", "ins-vikram", 7499, 11999, "PUBLISHED", "APPROVED", 84, 16400, 22],
  ["crs-gate-cs", "GATE Computer Science: Algorithms", "gate-cs-algorithms", "cat-exams", "ins-rahul", 9999, 0, "DRAFT", "PENDING_REVIEW", 64, 0, 20],
  ["crs-ielts", "IELTS Band 8: Writing and Speaking", "ielts-band-8", "cat-skills", "ins-fatima", 6499, 9999, "DRAFT", "CHANGES_REQUESTED", 48, 0, 14],
];

export const COURSES = COURSE_ROWS.map(
  ([courseId, title, slug, categoryId, instructorId, price, compareAt, status, reviewStatus, totalLessons, enrolledCount, hours]) => {
    const instructor = INSTRUCTORS.find((i) => i.userId === instructorId);
    return {
      courseId,
      title,
      slug,
      shortDescription: `${title} — structured, assessed and taught to a fixed weekly rhythm.`,
      description: `${title}. Every module closes with an assessment and a worked discussion of each question, so progress is measured rather than assumed.`,
      thumbnail: art(courseId),
      price: String(price),
      compareAtPrice: compareAt ? String(compareAt) : null,
      currency: "INR",
      status,
      reviewStatus,
      reviewNotes: reviewStatus === "CHANGES_REQUESTED" ? "Add learning outcomes and at least one free preview lesson." : null,
      categoryId,
      instructorId,
      instructorName: instructor ? `${instructor.firstName} ${instructor.lastName}` : "Unknown",
      level: "ALL_LEVELS",
      language: "English",
      totalLessons,
      totalDurationHours: hours,
      enrolledCount,
      enrollmentCount: enrolledCount,
      rating: 4.4 + ((hash(courseId) % 6) / 10),
      ratingCount: 120 + (hash(courseId) % 1400),
      revenue: price * Math.round(enrolledCount * 0.12),
      learningOutcomes: ["Work to a fixed weekly schedule", "Practise under exam conditions", "Review every answer with reasoning"],
      requirements: ["No prior preparation needed"],
      createdAt: "2025-06-02T10:00:00.000Z",
      updatedAt: "2026-07-18T12:00:00.000Z",
      publishedAt: status === "PUBLISHED" ? "2025-07-01T10:00:00.000Z" : null,
      submittedAt: reviewStatus === "PENDING_REVIEW" ? "2026-08-06T09:00:00.000Z" : null,
    };
  },
);

/* ---------------------------------------------------------------- users */

const FIRST = ["Ananya", "Rohit", "Priya", "Karthik", "Sneha", "Arjun", "Divya", "Imran", "Neha", "Sanjay", "Kavya", "Tarun", "Ritu", "Manish", "Pooja", "Aditya"];
const LAST = ["Rao", "Sharma", "Nair", "Iyer", "Gupta", "Reddy", "Khan", "Patel", "Bose", "Mehta", "Joshi", "Kulkarni", "Das", "Menon", "Chopra", "Verma"];

export const USERS = [
  { id: "usr-admin", email: "admin@grotutor.com", firstName: "Platform", lastName: "Admin", role: "PLATFORM_ADMIN", emailVerified: true, companyId: null, isBanned: false, profileImage: null, createdAt: "2025-01-02T08:00:00.000Z", lastLoginAt: "2026-08-14T05:10:00.000Z", enrolledCount: 0, totalSpend: 0 },
  { id: "usr-super", email: "superadmin@grotutor.com", firstName: "Super", lastName: "Admin", role: "PLATFORM_ADMIN", emailVerified: true, companyId: null, isBanned: false, profileImage: null, createdAt: "2025-01-02T08:05:00.000Z", lastLoginAt: "2026-08-13T19:22:00.000Z", enrolledCount: 0, totalSpend: 0 },
  { id: "usr-corp", email: "corporate@grotutor.com", firstName: "Corporate", lastName: "Manager", role: "CORPORATE_ADMIN", emailVerified: true, companyId: "cmp-techcorp", isBanned: false, profileImage: null, createdAt: "2025-02-14T11:00:00.000Z", lastLoginAt: "2026-08-12T10:41:00.000Z", enrolledCount: 0, totalSpend: 0 },
  ...INSTRUCTORS.map((i, idx) => ({
    id: i.userId,
    email: i.email,
    firstName: i.firstName,
    lastName: i.lastName,
    role: "INSTRUCTOR" as const,
    emailVerified: true,
    companyId: null,
    isBanned: false,
    profileImage: null,
    createdAt: `2025-0${3 + (idx % 5)}-0${1 + idx}T09:00:00.000Z`,
    lastLoginAt: `2026-08-${10 + idx}T08:30:00.000Z`,
    enrolledCount: 0,
    totalSpend: 0,
  })),
  ...Array.from({ length: 22 }, (_, i) => {
    const first = FIRST[i % FIRST.length] ?? "Learner";
    const last = LAST[(i * 7) % LAST.length] ?? "User";
    return {
      id: `usr-l${String(i + 1).padStart(2, "0")}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${i + 1}@example.com`,
      firstName: first,
      lastName: last,
      role: "LEARNER" as const,
      emailVerified: i % 6 !== 0,
      companyId: i % 5 === 0 ? "cmp-techcorp" : null,
      isBanned: i === 13,
      profileImage: null,
      createdAt: `2025-${String(1 + (i % 12)).padStart(2, "0")}-${String(1 + (i % 27)).padStart(2, "0")}T10:00:00.000Z`,
      lastLoginAt: `2026-08-${String(1 + (i % 14)).padStart(2, "0")}T14:00:00.000Z`,
      enrolledCount: 1 + (i % 6),
      totalSpend: 3499 * (1 + (i % 6)),
    };
  }),
];

export const COMPANIES = [
  { companyId: "cmp-techcorp", name: "TechCorp Solutions", email: "learning@techcorp.in", phone: "+91 80 4123 7788", address: "Prestige Tech Park, Bengaluru", seatsPurchased: 120, seatsUsed: 86, createdAt: "2025-02-10T09:00:00.000Z" },
  { companyId: "cmp-global", name: "Global Innovations Ltd", email: "hr@globalinnov.com", phone: "+91 22 6677 1200", address: "Bandra Kurla Complex, Mumbai", seatsPurchased: 60, seatsUsed: 41, createdAt: "2025-05-22T09:00:00.000Z" },
  { companyId: "cmp-digital", name: "Digital Dynamics Inc", email: "people@digitaldynamics.io", phone: "+91 40 2355 9080", address: "Hitec City, Hyderabad", seatsPurchased: 35, seatsUsed: 12, createdAt: "2026-01-08T09:00:00.000Z" },
];

/* ---------------------------------------------------- orders & payments */

const GATEWAYS = ["RAZORPAY", "MANUAL_QR", "RAZORPAY", "FREE"] as const;
const PAY_STATUS = ["COMPLETED", "COMPLETED", "COMPLETED", "PROOF_UPLOADED", "PENDING", "FAILED", "REFUNDED"] as const;

export const PAYMENTS = Array.from({ length: 28 }, (_, i) => {
  const course = COURSES[i % COURSES.length];
  const learner = USERS.filter((u) => u.role === "LEARNER")[i % 22];
  const amount = Number(course?.price ?? 0);
  const status = PAY_STATUS[i % PAY_STATUS.length] ?? "COMPLETED";
  return {
    paymentId: `pay-${String(2001 + i)}`,
    invoiceNo: `GT-2026-${String(1000 + i)}`,
    userId: learner?.id ?? "usr-l01",
    userName: `${learner?.firstName ?? ""} ${learner?.lastName ?? ""}`.trim(),
    userEmail: learner?.email ?? "",
    courseId: course?.courseId ?? "",
    courseTitle: course?.title ?? "",
    amount,
    discount: i % 4 === 0 ? Math.round(amount * 0.1) : 0,
    couponCode: i % 4 === 0 ? "MONSOON10" : null,
    tax: Math.round(amount * 0.18),
    total: Math.round(amount * 1.18) - (i % 4 === 0 ? Math.round(amount * 0.1) : 0),
    currency: "INR",
    gateway: GATEWAYS[i % GATEWAYS.length] ?? "RAZORPAY",
    status,
    transactionId: status === "FAILED" ? null : `pay_Q${String(hash(String(i))).slice(0, 12)}`,
    proofUrl: status === "PROOF_UPLOADED" ? art(`proof-${i}`) : null,
    createdAt: `2026-0${1 + (i % 8)}-${String(1 + (i % 27)).padStart(2, "0")}T${String(8 + (i % 12)).padStart(2, "0")}:15:00.000Z`,
  };
});

export const ENROLLMENTS = Array.from({ length: 34 }, (_, i) => {
  const course = COURSES[i % COURSES.length];
  const learner = USERS.filter((u) => u.role === "LEARNER")[i % 22];
  return {
    enrollmentId: `enr-${String(3001 + i)}`,
    userId: learner?.id ?? "usr-l01",
    userName: `${learner?.firstName ?? ""} ${learner?.lastName ?? ""}`.trim(),
    userEmail: learner?.email ?? "",
    courseId: course?.courseId ?? "",
    courseTitle: course?.title ?? "",
    status: i % 7 === 0 ? "COMPLETED" : i % 11 === 0 ? "REVOKED" : "ACTIVE",
    source: i % 5 === 0 ? "ADMIN_GRANT" : "COURSE_PURCHASE",
    progressPercent: (i * 13) % 101,
    enrolledAt: `2026-0${1 + (i % 8)}-${String(1 + (i % 27)).padStart(2, "0")}T09:00:00.000Z`,
  };
});

export const COUPONS = [
  { couponId: "cpn-1", code: "MONSOON10", description: "Monsoon campaign", discountType: "PERCENTAGE", discountValue: 10, maxUses: 500, usedCount: 213, minPurchase: 2000, startsAt: "2026-06-01T00:00:00.000Z", expiresAt: "2026-09-30T00:00:00.000Z", isActive: true, createdAt: "2026-05-20T09:00:00.000Z" },
  { couponId: "cpn-2", code: "EARLYBIRD15", description: "Early enrolment", discountType: "PERCENTAGE", discountValue: 15, maxUses: 200, usedCount: 200, minPurchase: 5000, startsAt: "2026-01-01T00:00:00.000Z", expiresAt: "2026-03-31T00:00:00.000Z", isActive: false, createdAt: "2025-12-14T09:00:00.000Z" },
  { couponId: "cpn-3", code: "BUNDLE20", description: "Two or more courses", discountType: "PERCENTAGE", discountValue: 20, maxUses: 1000, usedCount: 428, minPurchase: 10000, startsAt: "2025-08-01T00:00:00.000Z", expiresAt: "2026-12-31T00:00:00.000Z", isActive: true, createdAt: "2025-07-24T09:00:00.000Z" },
  { couponId: "cpn-4", code: "FLAT500", description: "Flat Rs 500 off", discountType: "FIXED_AMOUNT", discountValue: 500, maxUses: 300, usedCount: 87, minPurchase: 3000, startsAt: "2026-07-01T00:00:00.000Z", expiresAt: "2026-10-31T00:00:00.000Z", isActive: true, createdAt: "2026-06-18T09:00:00.000Z" },
];
