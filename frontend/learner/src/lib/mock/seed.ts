/**
 * Deterministic seed data for the demo build.
 *
 * Every value here is a literal — no Date.now(), no Math.random() — so the
 * server render and the client hydration agree. Dates are fixed ISO strings
 * for the same reason; they read as a realistic recent history without
 * drifting between renders.
 */

export interface MockCourse {
  courseId: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  thumbnail: string;
  price: string;
  compareAtPrice: string | null;
  currency: string;
  level: string;
  language: string;
  categoryId: string;
  instructorId: string;
  instructorName: string;
  status: string;
  totalLessons: number;
  totalDuration: number;
  rating: number;
  ratingCount: number;
  enrolledCount: number;
  learningOutcomes: string[];
  requirements: string[];
}

export interface MockEnrollment {
  enrollmentId: string;
  userId: string;
  courseId: string;
  status: "ACTIVE" | "COMPLETED" | "REVOKED";
  accessType: "COURSE" | "SECTION";
  enrolledAt: string;
  progressPercent: number;
  lessonsCompleted: number;
  lastAccessedAt: string | null;
  accessedSections?: { sectionId: string; title: string }[];
}

export interface MockOrderItem {
  itemId: string;
  courseId: string;
  title: string;
  thumbnail: string;
  itemType: "COURSE" | "SECTION" | "BOOK";
  unitPrice: number;
}

export interface MockOrder {
  orderId: string;
  invoiceNo: string;
  userId: string;
  items: MockOrderItem[];
  subtotal: number;
  discount: number;
  couponCode: string | null;
  tax: number;
  total: number;
  currency: string;
  gateway: "RAZORPAY" | "MANUAL_QR" | "FREE";
  status: "COMPLETED" | "PENDING" | "PROOF_UPLOADED" | "FAILED" | "REFUNDED";
  refundStatus: "NONE" | "REQUESTED" | "APPROVED" | "DECLINED";
  refundReason: string | null;
  transactionId: string | null;
  placedAt: string;
  billingName: string;
  billingEmail: string;
}

export interface MockReview {
  reviewId: string;
  userId: string;
  courseId: string;
  courseTitle: string;
  courseThumbnail: string;
  rating: number;
  title: string;
  body: string;
  status: "PUBLISHED" | "PENDING";
  createdAt: string;
  updatedAt: string | null;
  instructorReply: string | null;
}

export interface MockQuizAnswer {
  questionId: string;
  question: string;
  options: string[];
  correctIndex: number;
  chosenIndex: number | null;
  explanation: string;
}

export interface MockQuizAttempt {
  attemptId: string;
  userId: string;
  quizId: string;
  quizTitle: string;
  courseId: string;
  courseTitle: string;
  lessonTitle: string;
  totalQuestions: number;
  correctCount: number;
  scorePercent: number;
  passMark: number;
  passed: boolean;
  durationSeconds: number;
  attemptNo: number;
  submittedAt: string;
  answers: MockQuizAnswer[];
}

export interface MockDevice {
  deviceId: string;
  browser: string;
  os: string;
  deviceType: "desktop" | "mobile" | "tablet";
  location: string;
  ipAddress: string;
  lastActiveAt: string;
  current: boolean;
}

export interface MockProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImage: string | null;
  headline: string;
  bio: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  social: {
    website: string;
    linkedin: string;
    twitter: string;
    github: string;
  };
}

/**
 * Course artwork, drawn rather than fetched.
 *
 * Stock photography would tie the demo to a third-party host that can be slow,
 * blocked, or rate-limited — and a grid of broken images is worse than no
 * images. These are inline SVGs built from the platform's own slate-and-brass
 * palette, with the composition varying deterministically per course so the
 * catalogue reads as a set rather than a repeated tile.
 */
const PAPER = "#efe7d9";
const SLATE = "#241f1a";
const SLATE_2 = "#332c24";
const BRASS = "#a56d2d";
const BRASS_LIGHT = "#cf9350";

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

const thumb = (seed: string): string => {
  const h = hash(seed);
  const variant = h % 4;
  const angle = 8 + (h % 5) * 9;
  const cx = 96 + (h % 7) * 22;

  const shapes = [
    // Concentric arcs — the "syllabus rings" motif.
    `<g fill="none" stroke-linecap="round">
       <circle cx="${cx}" cy="150" r="132" stroke="${BRASS}" stroke-width="14" opacity="0.9"/>
       <circle cx="${cx}" cy="150" r="94" stroke="${BRASS_LIGHT}" stroke-width="8" opacity="0.65"/>
       <circle cx="${cx}" cy="150" r="56" stroke="${PAPER}" stroke-width="3" opacity="0.35"/>
     </g>`,
    // Rising bars.
    `<g>
       <rect x="${cx - 90}" y="150" width="34" height="110" rx="6" fill="${BRASS}" opacity="0.9"/>
       <rect x="${cx - 44}" y="104" width="34" height="156" rx="6" fill="${BRASS_LIGHT}" opacity="0.85"/>
       <rect x="${cx + 2}" y="62" width="34" height="198" rx="6" fill="${PAPER}" opacity="0.3"/>
       <rect x="${cx + 48}" y="128" width="34" height="132" rx="6" fill="${BRASS}" opacity="0.55"/>
     </g>`,
    // Folded sheet.
    `<g>
       <path d="M ${cx - 110} 250 L ${cx - 30} 60 L ${cx + 60} 250 Z" fill="${BRASS}" opacity="0.9"/>
       <path d="M ${cx - 20} 250 L ${cx + 60} 96 L ${cx + 150} 250 Z" fill="${BRASS_LIGHT}" opacity="0.7"/>
       <path d="M ${cx - 150} 250 L ${cx - 96} 148 L ${cx - 42} 250 Z" fill="${PAPER}" opacity="0.22"/>
     </g>`,
    // Grid of study blocks.
    `<g opacity="0.92">
       <rect x="${cx - 96}" y="70" width="72" height="72" rx="10" fill="${BRASS}"/>
       <rect x="${cx - 12}" y="70" width="72" height="72" rx="10" fill="${PAPER}" opacity="0.26"/>
       <rect x="${cx - 96}" y="154" width="72" height="72" rx="10" fill="${BRASS_LIGHT}" opacity="0.75"/>
       <rect x="${cx - 12}" y="154" width="72" height="72" rx="10" fill="${BRASS}" opacity="0.45"/>
     </g>`,
  ];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${SLATE_2}"/>
      <stop offset="100%" stop-color="${SLATE}"/>
    </linearGradient>
    <clipPath id="c"><rect width="640" height="360"/></clipPath>
  </defs>
  <rect width="640" height="360" fill="url(#g)"/>
  <g clip-path="url(#c)" transform="rotate(${angle} 320 180)">
    ${shapes[variant]}
  </g>
  <rect width="640" height="360" fill="none" stroke="${PAPER}" stroke-opacity="0.08" stroke-width="2"/>
</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, " "))}`;
};

export const CATEGORIES = [
  { categoryId: "cat-exams", name: "Competitive Exams", slug: "competitive-exams", isActive: true, displayOrder: 1 },
  { categoryId: "cat-skills", name: "Professional Skills", slug: "professional-skills", isActive: true, displayOrder: 2 },
  { categoryId: "cat-tech", name: "Technology", slug: "technology", isActive: true, displayOrder: 3 },
  { categoryId: "cat-academics", name: "Academics", slug: "academics", isActive: true, displayOrder: 4 },
  { categoryId: "cat-finance", name: "Finance & Accounting", slug: "finance-accounting", isActive: true, displayOrder: 5 },
];

export const COURSES: MockCourse[] = [
  {
    courseId: "crs-upsc-prelims",
    title: "UPSC Prelims: Complete General Studies",
    slug: "upsc-prelims-general-studies",
    shortDescription: "Full GS Paper I coverage with 40 sectional tests and 6 full-length mocks.",
    description:
      "A structured 9-month programme covering Polity, History, Geography, Economy, Environment and Current Affairs for UPSC Civil Services Prelims. Each module closes with a sectional test and a recorded discussion of every question.",
    thumbnail: thumb("1523240795612-9a054b0db644"),
    price: "14999.00",
    compareAtPrice: "24999.00",
    currency: "INR",
    level: "ALL_LEVELS",
    language: "English",
    categoryId: "cat-exams",
    instructorId: "ins-anand",
    instructorName: "Anand Krishnan",
    status: "PUBLISHED",
    totalLessons: 184,
    totalDuration: 47_400,
    rating: 4.8,
    ratingCount: 1284,
    enrolledCount: 9420,
    learningOutcomes: [
      "Cover the entire GS Paper I syllabus in a fixed weekly rhythm",
      "Solve 4,000+ prelims-standard MCQs with reasoning for every option",
      "Build a current-affairs note system you can revise in 3 days",
    ],
    requirements: ["No prior preparation needed", "8–10 study hours a week"],
  },
  {
    courseId: "crs-jee-physics",
    title: "JEE Advanced Physics: Mechanics to Modern",
    slug: "jee-advanced-physics",
    shortDescription: "Concept-first physics with 1,200 solved problems at JEE Advanced difficulty.",
    description:
      "Physics for JEE Advanced taught the way examiners think. Every chapter opens with the physical picture, then derives the tools, then applies them to past-paper problems ordered by difficulty.",
    thumbnail: thumb("1636466497217-26a8cbeaf0aa"),
    price: "11999.00",
    compareAtPrice: "17999.00",
    currency: "INR",
    level: "ADVANCED",
    language: "English",
    categoryId: "cat-exams",
    instructorId: "ins-meera",
    instructorName: "Meera Subramanian",
    status: "PUBLISHED",
    totalLessons: 142,
    totalDuration: 39_600,
    rating: 4.9,
    ratingCount: 862,
    enrolledCount: 5310,
    learningOutcomes: [
      "Derive every standard result rather than memorising it",
      "Attack multi-concept problems with a repeatable method",
      "Finish a full JEE Advanced paper inside the time limit",
    ],
    requirements: ["Class 11 physics and calculus basics"],
  },
  {
    courseId: "crs-data-analytics",
    title: "Data Analytics with Python and SQL",
    slug: "data-analytics-python-sql",
    shortDescription: "From spreadsheets to production dashboards in twelve weeks.",
    description:
      "A working analyst's toolkit: SQL for extraction, pandas for shaping, and a final capstone where you build and present a dashboard on a real retail dataset.",
    thumbnail: thumb("1551288049-bebda4e38f71"),
    price: "8999.00",
    compareAtPrice: "13999.00",
    currency: "INR",
    level: "BEGINNER",
    language: "English",
    categoryId: "cat-tech",
    instructorId: "ins-rahul",
    instructorName: "Rahul Deshpande",
    status: "PUBLISHED",
    totalLessons: 96,
    totalDuration: 28_800,
    rating: 4.7,
    ratingCount: 2140,
    enrolledCount: 14_780,
    learningOutcomes: [
      "Write window functions and CTEs without reaching for a reference",
      "Clean and reshape messy data in pandas",
      "Ship a dashboard a stakeholder can actually read",
    ],
    requirements: ["Comfort with spreadsheets", "No programming experience needed"],
  },
  {
    courseId: "crs-spoken-english",
    title: "Spoken English for the Workplace",
    slug: "spoken-english-workplace",
    shortDescription: "Meetings, email and interviews — fluency built through daily speaking drills.",
    description:
      "Sixty short lessons, each ending in a two-minute speaking task. Focused on the situations that actually come up at work: standups, client calls, written follow-ups and interviews.",
    thumbnail: thumb("1524178232363-1fb2b075b655"),
    price: "3499.00",
    compareAtPrice: "5999.00",
    currency: "INR",
    level: "BEGINNER",
    language: "English",
    categoryId: "cat-skills",
    instructorId: "ins-fatima",
    instructorName: "Fatima Sheikh",
    status: "PUBLISHED",
    totalLessons: 60,
    totalDuration: 14_400,
    rating: 4.6,
    ratingCount: 3420,
    enrolledCount: 22_140,
    learningOutcomes: [
      "Run a meeting in English without rehearsing every sentence",
      "Write email that gets a reply",
      "Handle the twelve most common interview questions",
    ],
    requirements: ["Basic reading ability in English"],
  },
  {
    courseId: "crs-financial-modelling",
    title: "Financial Modelling and Valuation",
    slug: "financial-modelling-valuation",
    shortDescription: "Build a three-statement model and a DCF from a blank sheet.",
    description:
      "Model a listed Indian company end to end: revenue build, three linked statements, working capital, debt schedule, and a DCF with sensitivity tables. Every session is built live in Excel.",
    thumbnail: thumb("1454165804606-c3d57bc86b40"),
    price: "12499.00",
    compareAtPrice: null,
    currency: "INR",
    level: "INTERMEDIATE",
    language: "English",
    categoryId: "cat-finance",
    instructorId: "ins-vikram",
    instructorName: "Vikram Nair",
    status: "PUBLISHED",
    totalLessons: 78,
    totalDuration: 25_200,
    rating: 4.8,
    ratingCount: 640,
    enrolledCount: 3890,
    learningOutcomes: [
      "Link three statements so the balance sheet always balances",
      "Build a defensible DCF and explain every assumption",
      "Run sensitivity and scenario analysis",
    ],
    requirements: ["Basic accounting", "Excel familiarity"],
  },
  {
    courseId: "crs-react-production",
    title: "React in Production",
    slug: "react-in-production",
    shortDescription: "State, data fetching, performance and testing for real applications.",
    description:
      "Past the tutorials: component boundaries, server state, rendering performance, error handling and a testing strategy that survives a refactor.",
    thumbnail: thumb("1633356122544-f134324a6cee"),
    price: "9499.00",
    compareAtPrice: "14999.00",
    currency: "INR",
    level: "INTERMEDIATE",
    language: "English",
    categoryId: "cat-tech",
    instructorId: "ins-rahul",
    instructorName: "Rahul Deshpande",
    status: "PUBLISHED",
    totalLessons: 88,
    totalDuration: 26_400,
    rating: 4.7,
    ratingCount: 1180,
    enrolledCount: 7620,
    learningOutcomes: [
      "Choose the right state location every time",
      "Cut re-renders with measurement, not guesswork",
      "Write tests that fail only when behaviour breaks",
    ],
    requirements: ["Working JavaScript", "Some React experience"],
  },
  {
    courseId: "crs-class12-maths",
    title: "Class 12 Mathematics — CBSE Board Complete",
    slug: "class-12-mathematics-cbse",
    shortDescription: "Every chapter, every NCERT exercise, plus 15 years of board papers.",
    description:
      "Chapter-by-chapter coverage aligned to the CBSE syllabus, with all NCERT exercises solved and a board-paper drill at the end of each unit.",
    thumbnail: thumb("1509228468518-180dd4864904"),
    price: "4999.00",
    compareAtPrice: "7999.00",
    currency: "INR",
    level: "INTERMEDIATE",
    language: "English",
    categoryId: "cat-academics",
    instructorId: "ins-meera",
    instructorName: "Meera Subramanian",
    status: "PUBLISHED",
    totalLessons: 124,
    totalDuration: 32_400,
    rating: 4.5,
    ratingCount: 980,
    enrolledCount: 11_240,
    learningOutcomes: [
      "Finish the full CBSE syllabus with time left for revision",
      "Solve every NCERT exercise with worked reasoning",
      "Recognise the recurring board question patterns",
    ],
    requirements: ["Class 11 mathematics"],
  },
  {
    courseId: "crs-product-management",
    title: "Product Management Foundations",
    slug: "product-management-foundations",
    shortDescription: "Discovery, prioritisation and shipping — with the artefacts to show for it.",
    description:
      "Learn the craft through the documents PMs actually produce: a problem brief, a prioritised backlog, a PRD and a launch plan. You finish with a portfolio, not just notes.",
    thumbnail: thumb("1531482615713-2afd69097998"),
    price: "10999.00",
    compareAtPrice: "16999.00",
    currency: "INR",
    level: "BEGINNER",
    language: "English",
    categoryId: "cat-skills",
    instructorId: "ins-fatima",
    instructorName: "Fatima Sheikh",
    status: "PUBLISHED",
    totalLessons: 72,
    totalDuration: 21_600,
    rating: 4.6,
    ratingCount: 745,
    enrolledCount: 6180,
    learningOutcomes: [
      "Run a discovery interview that surfaces real problems",
      "Prioritise with a method you can defend to leadership",
      "Write a PRD engineers do not have to decode",
    ],
    requirements: ["No prior product experience"],
  },
  {
    courseId: "crs-banking-po",
    title: "Banking PO: Quantitative Aptitude",
    slug: "banking-po-quantitative-aptitude",
    shortDescription: "Speed maths for IBPS and SBI PO, built on 3,000 timed questions.",
    description:
      "Arithmetic, data interpretation and number series drilled to exam speed. Every topic ends with a timed set so you learn to pace, not just to solve.",
    thumbnail: thumb("1579621970563-ebec7560ff3e"),
    price: "5999.00",
    compareAtPrice: "8999.00",
    currency: "INR",
    level: "INTERMEDIATE",
    language: "English",
    categoryId: "cat-exams",
    instructorId: "ins-anand",
    instructorName: "Anand Krishnan",
    status: "PUBLISHED",
    totalLessons: 110,
    totalDuration: 23_400,
    rating: 4.4,
    ratingCount: 1520,
    enrolledCount: 13_050,
    learningOutcomes: [
      "Cut solving time on DI sets by half",
      "Recognise question types on sight",
      "Hold accuracy above 90% under time pressure",
    ],
    requirements: ["Class 10 mathematics"],
  },
  {
    courseId: "crs-digital-marketing",
    title: "Digital Marketing: Search, Social and Analytics",
    slug: "digital-marketing-complete",
    shortDescription: "Run campaigns end to end and prove what they returned.",
    description:
      "SEO, paid search, social and measurement, taught around one running case study so every channel connects back to the same funnel and the same numbers.",
    thumbnail: thumb("1460925895917-afdab827c52f"),
    price: "7499.00",
    compareAtPrice: "11999.00",
    currency: "INR",
    level: "BEGINNER",
    language: "English",
    categoryId: "cat-skills",
    instructorId: "ins-vikram",
    instructorName: "Vikram Nair",
    status: "PUBLISHED",
    totalLessons: 84,
    totalDuration: 19_800,
    rating: 4.5,
    ratingCount: 1890,
    enrolledCount: 16_400,
    learningOutcomes: [
      "Plan a keyword strategy from search intent",
      "Structure a paid campaign that does not waste budget",
      "Attribute revenue to the channel that earned it",
    ],
    requirements: ["No marketing background needed"],
  },
];

export const DEMO_USER: MockProfile = {
  id: "usr-demo-learner",
  email: "learner1@example.com",
  firstName: "Ananya",
  lastName: "Rao",
  profileImage: null,
  headline: "Preparing for UPSC CSE 2027",
  bio: "Engineering graduate from Pune, now two years into civil services preparation. Studying analytics on the side to keep a fallback open.",
  phone: "+91 98765 43210",
  addressLine: "14, Lakshmi Residency, Kothrud",
  city: "Pune",
  state: "Maharashtra",
  country: "India",
  postalCode: "411038",
  social: {
    website: "",
    linkedin: "https://www.linkedin.com/in/ananya-rao",
    twitter: "",
    github: "",
  },
};

export const ENROLLMENTS: MockEnrollment[] = [
  {
    enrollmentId: "enr-001",
    userId: DEMO_USER.id,
    courseId: "crs-upsc-prelims",
    status: "ACTIVE",
    accessType: "COURSE",
    enrolledAt: "2026-02-11T09:20:00.000Z",
    progressPercent: 62,
    lessonsCompleted: 114,
    lastAccessedAt: "2026-08-12T18:40:00.000Z",
  },
  {
    enrollmentId: "enr-002",
    userId: DEMO_USER.id,
    courseId: "crs-data-analytics",
    status: "ACTIVE",
    accessType: "COURSE",
    enrolledAt: "2026-04-02T14:05:00.000Z",
    progressPercent: 38,
    lessonsCompleted: 36,
    lastAccessedAt: "2026-08-13T07:15:00.000Z",
  },
  {
    enrollmentId: "enr-003",
    userId: DEMO_USER.id,
    courseId: "crs-spoken-english",
    status: "COMPLETED",
    accessType: "COURSE",
    enrolledAt: "2025-11-20T11:00:00.000Z",
    progressPercent: 100,
    lessonsCompleted: 60,
    lastAccessedAt: "2026-03-04T20:10:00.000Z",
  },
  {
    enrollmentId: "enr-004",
    userId: DEMO_USER.id,
    courseId: "crs-banking-po",
    status: "ACTIVE",
    accessType: "SECTION",
    enrolledAt: "2026-06-18T08:45:00.000Z",
    progressPercent: 21,
    lessonsCompleted: 12,
    lastAccessedAt: "2026-08-09T16:25:00.000Z",
    accessedSections: [
      { sectionId: "sec-di", title: "Data Interpretation" },
      { sectionId: "sec-series", title: "Number Series" },
    ],
  },
  {
    enrollmentId: "enr-005",
    userId: DEMO_USER.id,
    courseId: "crs-financial-modelling",
    status: "ACTIVE",
    accessType: "COURSE",
    enrolledAt: "2026-07-30T10:30:00.000Z",
    progressPercent: 7,
    lessonsCompleted: 5,
    lastAccessedAt: "2026-08-05T21:00:00.000Z",
  },
  {
    enrollmentId: "enr-006",
    userId: DEMO_USER.id,
    courseId: "crs-product-management",
    status: "COMPLETED",
    accessType: "COURSE",
    enrolledAt: "2025-09-08T13:15:00.000Z",
    progressPercent: 100,
    lessonsCompleted: 72,
    lastAccessedAt: "2026-01-22T19:05:00.000Z",
  },
];

export const ORDERS: MockOrder[] = [
  {
    orderId: "ord-2026-0188",
    invoiceNo: "GT-2026-0188",
    userId: DEMO_USER.id,
    items: [
      {
        itemId: "oi-1",
        courseId: "crs-financial-modelling",
        title: "Financial Modelling and Valuation",
        thumbnail: thumb("1454165804606-c3d57bc86b40"),
        itemType: "COURSE",
        unitPrice: 12499,
      },
    ],
    subtotal: 12499,
    discount: 0,
    couponCode: null,
    tax: 2249.82,
    total: 14748.82,
    currency: "INR",
    gateway: "RAZORPAY",
    status: "COMPLETED",
    refundStatus: "NONE",
    refundReason: null,
    transactionId: "pay_Qk29ThMzXr41Bd",
    placedAt: "2026-07-30T10:28:00.000Z",
    billingName: "Ananya Rao",
    billingEmail: "learner1@example.com",
  },
  {
    orderId: "ord-2026-0154",
    invoiceNo: "GT-2026-0154",
    userId: DEMO_USER.id,
    items: [
      {
        itemId: "oi-2",
        courseId: "crs-banking-po",
        title: "Banking PO: Quantitative Aptitude — 2 sections",
        thumbnail: thumb("1579621970563-ebec7560ff3e"),
        itemType: "SECTION",
        unitPrice: 2400,
      },
    ],
    subtotal: 2400,
    discount: 240,
    couponCode: "MONSOON10",
    tax: 388.8,
    total: 2548.8,
    currency: "INR",
    gateway: "RAZORPAY",
    status: "COMPLETED",
    refundStatus: "NONE",
    refundReason: null,
    transactionId: "pay_QJ88vLdpWq02Aa",
    placedAt: "2026-06-18T08:42:00.000Z",
    billingName: "Ananya Rao",
    billingEmail: "learner1@example.com",
  },
  {
    orderId: "ord-2026-0121",
    invoiceNo: "GT-2026-0121",
    userId: DEMO_USER.id,
    items: [
      {
        itemId: "oi-3",
        courseId: "crs-data-analytics",
        title: "Data Analytics with Python and SQL",
        thumbnail: thumb("1551288049-bebda4e38f71"),
        itemType: "COURSE",
        unitPrice: 8999,
      },
    ],
    subtotal: 8999,
    discount: 1349.85,
    couponCode: "EARLYBIRD15",
    tax: 1376.84,
    total: 9025.99,
    currency: "INR",
    gateway: "RAZORPAY",
    status: "COMPLETED",
    refundStatus: "DECLINED",
    refundReason: "Requested after 42% of the course was completed.",
    transactionId: "pay_QF01mNbxTt77Zc",
    placedAt: "2026-04-02T14:02:00.000Z",
    billingName: "Ananya Rao",
    billingEmail: "learner1@example.com",
  },
  {
    orderId: "ord-2026-0077",
    invoiceNo: "GT-2026-0077",
    userId: DEMO_USER.id,
    items: [
      {
        itemId: "oi-4",
        courseId: "crs-upsc-prelims",
        title: "UPSC Prelims: Complete General Studies",
        thumbnail: thumb("1523240795612-9a054b0db644"),
        itemType: "COURSE",
        unitPrice: 14999,
      },
    ],
    subtotal: 14999,
    discount: 0,
    couponCode: null,
    tax: 2699.82,
    total: 17698.82,
    currency: "INR",
    gateway: "MANUAL_QR",
    status: "COMPLETED",
    refundStatus: "NONE",
    refundReason: null,
    transactionId: "UPI/402831774521",
    placedAt: "2026-02-11T09:14:00.000Z",
    billingName: "Ananya Rao",
    billingEmail: "learner1@example.com",
  },
  {
    orderId: "ord-2026-0203",
    invoiceNo: "GT-2026-0203",
    userId: DEMO_USER.id,
    items: [
      {
        itemId: "oi-5",
        courseId: "crs-react-production",
        title: "React in Production",
        thumbnail: thumb("1633356122544-f134324a6cee"),
        itemType: "COURSE",
        unitPrice: 9499,
      },
    ],
    subtotal: 9499,
    discount: 0,
    couponCode: null,
    tax: 1709.82,
    total: 11208.82,
    currency: "INR",
    gateway: "MANUAL_QR",
    status: "PROOF_UPLOADED",
    refundStatus: "NONE",
    refundReason: null,
    transactionId: "UPI/408192043377",
    placedAt: "2026-08-11T17:55:00.000Z",
    billingName: "Ananya Rao",
    billingEmail: "learner1@example.com",
  },
  {
    orderId: "ord-2025-0912",
    invoiceNo: "GT-2025-0912",
    userId: DEMO_USER.id,
    items: [
      {
        itemId: "oi-6",
        courseId: "crs-product-management",
        title: "Product Management Foundations",
        thumbnail: thumb("1531482615713-2afd69097998"),
        itemType: "COURSE",
        unitPrice: 10999,
      },
      {
        itemId: "oi-7",
        courseId: "crs-spoken-english",
        title: "Spoken English for the Workplace",
        thumbnail: thumb("1524178232363-1fb2b075b655"),
        itemType: "COURSE",
        unitPrice: 3499,
      },
    ],
    subtotal: 14498,
    discount: 2899.6,
    couponCode: "BUNDLE20",
    tax: 2087.71,
    total: 13686.11,
    currency: "INR",
    gateway: "RAZORPAY",
    status: "COMPLETED",
    refundStatus: "NONE",
    refundReason: null,
    transactionId: "pay_PZ44kRcyUu18Nn",
    placedAt: "2025-09-08T13:09:00.000Z",
    billingName: "Ananya Rao",
    billingEmail: "learner1@example.com",
  },
  {
    orderId: "ord-2025-0640",
    invoiceNo: "GT-2025-0640",
    userId: DEMO_USER.id,
    items: [
      {
        itemId: "oi-8",
        courseId: "crs-digital-marketing",
        title: "Digital Marketing: Search, Social and Analytics",
        thumbnail: thumb("1460925895917-afdab827c52f"),
        itemType: "COURSE",
        unitPrice: 7499,
      },
    ],
    subtotal: 7499,
    discount: 0,
    couponCode: null,
    tax: 1349.82,
    total: 8848.82,
    currency: "INR",
    gateway: "RAZORPAY",
    status: "FAILED",
    refundStatus: "NONE",
    refundReason: null,
    transactionId: null,
    placedAt: "2025-06-14T12:31:00.000Z",
    billingName: "Ananya Rao",
    billingEmail: "learner1@example.com",
  },
];

export const REVIEWS: MockReview[] = [
  {
    reviewId: "rev-001",
    userId: DEMO_USER.id,
    courseId: "crs-spoken-english",
    courseTitle: "Spoken English for the Workplace",
    courseThumbnail: thumb("1524178232363-1fb2b075b655"),
    rating: 5,
    title: "The speaking tasks are what made it work",
    body:
      "I had done two English courses before this and forgotten both. The difference here is that every lesson ends with you actually talking for two minutes. Six weeks in, I ran my first client call without writing a script first.",
    status: "PUBLISHED",
    createdAt: "2026-03-05T09:12:00.000Z",
    updatedAt: null,
    instructorReply:
      "This is exactly what the daily tasks are for — glad it carried over to real calls. Keep going.",
  },
  {
    reviewId: "rev-002",
    userId: DEMO_USER.id,
    courseId: "crs-product-management",
    courseTitle: "Product Management Foundations",
    courseThumbnail: thumb("1531482615713-2afd69097998"),
    rating: 4,
    title: "Strong on artefacts, lighter on stakeholder work",
    body:
      "Finishing with a real PRD and a prioritised backlog is worth the fee on its own. I would have liked more on handling disagreement with engineering leads — that section is only two lessons.",
    status: "PUBLISHED",
    createdAt: "2026-01-24T16:48:00.000Z",
    updatedAt: "2026-01-26T10:02:00.000Z",
    instructorReply: null,
  },
  {
    reviewId: "rev-003",
    userId: DEMO_USER.id,
    courseId: "crs-data-analytics",
    courseTitle: "Data Analytics with Python and SQL",
    courseThumbnail: thumb("1551288049-bebda4e38f71"),
    rating: 4,
    title: "SQL half is excellent, pandas half moves fast",
    body:
      "Window functions finally clicked. The pandas chapters assume you picked up more Python than the intro actually teaches, so I had to slow down and fill gaps elsewhere.",
    status: "PENDING",
    createdAt: "2026-08-10T20:30:00.000Z",
    updatedAt: null,
    instructorReply: null,
  },
];

export const QUIZ_ATTEMPTS: MockQuizAttempt[] = [
  {
    attemptId: "att-001",
    userId: DEMO_USER.id,
    quizId: "qz-polity-3",
    quizTitle: "Polity — Fundamental Rights",
    courseId: "crs-upsc-prelims",
    courseTitle: "UPSC Prelims: Complete General Studies",
    lessonTitle: "Module 4 · Sectional Test",
    totalQuestions: 5,
    correctCount: 4,
    scorePercent: 80,
    passMark: 60,
    passed: true,
    durationSeconds: 412,
    attemptNo: 2,
    submittedAt: "2026-08-12T18:36:00.000Z",
    answers: [
      {
        questionId: "q1",
        question: "Which article of the Constitution abolishes untouchability?",
        options: ["Article 15", "Article 16", "Article 17", "Article 18"],
        correctIndex: 2,
        chosenIndex: 2,
        explanation:
          "Article 17 abolishes untouchability and forbids its practice in any form.",
      },
      {
        questionId: "q2",
        question: "The Right to Property was removed from Fundamental Rights by which amendment?",
        options: ["42nd", "44th", "52nd", "61st"],
        correctIndex: 1,
        chosenIndex: 1,
        explanation:
          "The 44th Amendment (1978) moved the Right to Property to Article 300A as a legal right.",
      },
      {
        questionId: "q3",
        question: "Which writ is issued to release a person detained unlawfully?",
        options: ["Mandamus", "Certiorari", "Habeas Corpus", "Quo Warranto"],
        correctIndex: 2,
        chosenIndex: 2,
        explanation:
          "Habeas Corpus literally means 'to have the body' and secures release from unlawful detention.",
      },
      {
        questionId: "q4",
        question: "Fundamental Rights are enforceable against which of the following?",
        options: [
          "The State only",
          "Private individuals only",
          "The State, and private individuals in specific articles",
          "Neither",
        ],
        correctIndex: 2,
        chosenIndex: 0,
        explanation:
          "Most rights bind the State, but Articles 15(2), 17, 23 and 24 also bind private individuals.",
      },
      {
        questionId: "q5",
        question: "Which article permits the suspension of Fundamental Rights during a national emergency?",
        options: ["Article 352", "Article 356", "Article 358", "Article 360"],
        correctIndex: 2,
        chosenIndex: 2,
        explanation:
          "Article 358 suspends Article 19 automatically when a national emergency is proclaimed on grounds of war or external aggression.",
      },
    ],
  },
  {
    attemptId: "att-002",
    userId: DEMO_USER.id,
    quizId: "qz-polity-3",
    quizTitle: "Polity — Fundamental Rights",
    courseId: "crs-upsc-prelims",
    courseTitle: "UPSC Prelims: Complete General Studies",
    lessonTitle: "Module 4 · Sectional Test",
    totalQuestions: 5,
    correctCount: 2,
    scorePercent: 40,
    passMark: 60,
    passed: false,
    durationSeconds: 268,
    attemptNo: 1,
    submittedAt: "2026-08-04T11:20:00.000Z",
    answers: [
      {
        questionId: "q1",
        question: "Which article of the Constitution abolishes untouchability?",
        options: ["Article 15", "Article 16", "Article 17", "Article 18"],
        correctIndex: 2,
        chosenIndex: 0,
        explanation:
          "Article 17 abolishes untouchability and forbids its practice in any form.",
      },
      {
        questionId: "q2",
        question: "The Right to Property was removed from Fundamental Rights by which amendment?",
        options: ["42nd", "44th", "52nd", "61st"],
        correctIndex: 1,
        chosenIndex: 0,
        explanation:
          "The 44th Amendment (1978) moved the Right to Property to Article 300A as a legal right.",
      },
      {
        questionId: "q3",
        question: "Which writ is issued to release a person detained unlawfully?",
        options: ["Mandamus", "Certiorari", "Habeas Corpus", "Quo Warranto"],
        correctIndex: 2,
        chosenIndex: 2,
        explanation:
          "Habeas Corpus literally means 'to have the body' and secures release from unlawful detention.",
      },
      {
        questionId: "q4",
        question: "Fundamental Rights are enforceable against which of the following?",
        options: [
          "The State only",
          "Private individuals only",
          "The State, and private individuals in specific articles",
          "Neither",
        ],
        correctIndex: 2,
        chosenIndex: 1,
        explanation:
          "Most rights bind the State, but Articles 15(2), 17, 23 and 24 also bind private individuals.",
      },
      {
        questionId: "q5",
        question: "Which article permits the suspension of Fundamental Rights during a national emergency?",
        options: ["Article 352", "Article 356", "Article 358", "Article 360"],
        correctIndex: 2,
        chosenIndex: 2,
        explanation:
          "Article 358 suspends Article 19 automatically when a national emergency is proclaimed on grounds of war or external aggression.",
      },
    ],
  },
  {
    attemptId: "att-003",
    userId: DEMO_USER.id,
    quizId: "qz-sql-joins",
    quizTitle: "SQL — Joins and Aggregation",
    courseId: "crs-data-analytics",
    courseTitle: "Data Analytics with Python and SQL",
    lessonTitle: "Week 3 · Checkpoint",
    totalQuestions: 4,
    correctCount: 4,
    scorePercent: 100,
    passMark: 70,
    passed: true,
    durationSeconds: 305,
    attemptNo: 1,
    submittedAt: "2026-08-13T07:10:00.000Z",
    answers: [
      {
        questionId: "s1",
        question: "Which join returns every row from the left table regardless of a match?",
        options: ["INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "CROSS JOIN"],
        correctIndex: 1,
        chosenIndex: 1,
        explanation:
          "LEFT JOIN keeps all left-table rows, filling unmatched right-table columns with NULL.",
      },
      {
        questionId: "s2",
        question: "Which clause filters rows after aggregation?",
        options: ["WHERE", "HAVING", "QUALIFY", "FILTER"],
        correctIndex: 1,
        chosenIndex: 1,
        explanation: "WHERE filters before grouping; HAVING filters the grouped result.",
      },
      {
        questionId: "s3",
        question: "COUNT(column) differs from COUNT(*) because it —",
        options: [
          "Runs faster on every engine",
          "Skips NULL values in that column",
          "Counts distinct values",
          "Requires an index",
        ],
        correctIndex: 1,
        chosenIndex: 1,
        explanation: "COUNT(column) ignores NULLs; COUNT(*) counts every row.",
      },
      {
        questionId: "s4",
        question: "Which window function assigns no gaps in ranking after ties?",
        options: ["ROW_NUMBER()", "RANK()", "DENSE_RANK()", "NTILE()"],
        correctIndex: 2,
        chosenIndex: 2,
        explanation:
          "DENSE_RANK() gives tied rows the same rank and continues without skipping the next value.",
      },
    ],
  },
  {
    attemptId: "att-004",
    userId: DEMO_USER.id,
    quizId: "qz-di-set-2",
    quizTitle: "Data Interpretation — Tables and Pie Charts",
    courseId: "crs-banking-po",
    courseTitle: "Banking PO: Quantitative Aptitude",
    lessonTitle: "Timed Set 2",
    totalQuestions: 4,
    correctCount: 3,
    scorePercent: 75,
    passMark: 70,
    passed: true,
    durationSeconds: 540,
    attemptNo: 1,
    submittedAt: "2026-08-09T16:18:00.000Z",
    answers: [
      {
        questionId: "d1",
        question: "A pie chart sector measures 72°. What share of the total does it represent?",
        options: ["15%", "20%", "25%", "30%"],
        correctIndex: 1,
        chosenIndex: 1,
        explanation: "72 ÷ 360 = 0.2, so the sector is 20% of the total.",
      },
      {
        questionId: "d2",
        question: "Sales rose from ₹4,500 to ₹5,400. What is the percentage increase?",
        options: ["16.7%", "18%", "20%", "22.5%"],
        correctIndex: 2,
        chosenIndex: 2,
        explanation: "(5400 − 4500) ÷ 4500 = 0.2, a 20% increase.",
      },
      {
        questionId: "d3",
        question: "If A:B = 3:4 and B:C = 6:5, what is A:C?",
        options: ["9:10", "18:20", "3:5", "9:8"],
        correctIndex: 0,
        chosenIndex: 3,
        explanation:
          "Align B: A:B = 9:12 and B:C = 12:10, so A:C = 9:10.",
      },
      {
        questionId: "d4",
        question: "The average of five numbers is 42. Four of them sum to 170. What is the fifth?",
        options: ["36", "40", "44", "48"],
        correctIndex: 1,
        chosenIndex: 1,
        explanation: "Total = 42 × 5 = 210. Fifth = 210 − 170 = 40.",
      },
    ],
  },
];

export const DEVICES: MockDevice[] = [
  {
    deviceId: "dev-current",
    browser: "Chrome 141",
    os: "macOS 15",
    deviceType: "desktop",
    location: "Pune, Maharashtra",
    ipAddress: "49.36.182.14",
    lastActiveAt: "2026-08-14T05:32:00.000Z",
    current: true,
  },
  {
    deviceId: "dev-phone",
    browser: "Chrome Mobile 140",
    os: "Android 16",
    deviceType: "mobile",
    location: "Pune, Maharashtra",
    ipAddress: "49.36.182.14",
    lastActiveAt: "2026-08-13T21:04:00.000Z",
    current: false,
  },
  {
    deviceId: "dev-tablet",
    browser: "Safari 19",
    os: "iPadOS 19",
    deviceType: "tablet",
    location: "Mumbai, Maharashtra",
    ipAddress: "103.72.44.201",
    lastActiveAt: "2026-07-28T09:47:00.000Z",
    current: false,
  },
];

/** Weekly study minutes for the dashboard activity chart. */
export const STUDY_ACTIVITY = [
  { day: "Mon", minutes: 45 },
  { day: "Tue", minutes: 80 },
  { day: "Wed", minutes: 30 },
  { day: "Thu", minutes: 95 },
  { day: "Fri", minutes: 60 },
  { day: "Sat", minutes: 140 },
  { day: "Sun", minutes: 110 },
];
