/**
 * Seed data for the platform-management areas the SkillGro documentation
 * covers: blog, badges, payouts, appearance, localisation and settings.
 */

import { art, COURSES, INSTRUCTORS } from "./seed";

/* ------------------------------------------------------------------ blog */

export const BLOG_CATEGORIES = [
  { id: "bcat-1", name: "Exam strategy", slug: "exam-strategy", postCount: 3, isActive: true, displayOrder: 1 },
  { id: "bcat-2", name: "Career", slug: "career", postCount: 2, isActive: true, displayOrder: 2 },
  { id: "bcat-3", name: "Product updates", slug: "product-updates", postCount: 1, isActive: true, displayOrder: 3 },
  { id: "bcat-4", name: "Study skills", slug: "study-skills", postCount: 2, isActive: false, displayOrder: 4 },
];

export const BLOG_POSTS = [
  { id: "post-1", title: "How to build a revision cycle you will actually finish", slug: "revision-cycle", categoryId: "bcat-1", categoryName: "Exam strategy", excerpt: "Most plans fail because they are built around motivation. Here is a schedule built around forgetting curves instead.", content: "Most revision plans fail in week three...", coverImage: art("post-1"), authorName: "Anand Krishnan", status: "PUBLISHED", views: 4820, publishedAt: "2026-07-22T09:00:00.000Z", createdAt: "2026-07-20T09:00:00.000Z" },
  { id: "post-2", title: "Reading the question before you read the options", slug: "reading-the-question", categoryId: "bcat-1", categoryName: "Exam strategy", excerpt: "A habit that adds four or five marks in prelims without any extra study.", content: "In a negative-marking paper...", coverImage: art("post-2"), authorName: "Anand Krishnan", status: "PUBLISHED", views: 3110, publishedAt: "2026-06-14T09:00:00.000Z", createdAt: "2026-06-11T09:00:00.000Z" },
  { id: "post-3", title: "What a hiring manager looks for in an analytics portfolio", slug: "analytics-portfolio", categoryId: "bcat-2", categoryName: "Career", excerpt: "Three dashboards done properly beat twelve half-finished notebooks.", content: "Every portfolio review starts the same way...", coverImage: art("post-3"), authorName: "Rahul Deshpande", status: "PUBLISHED", views: 6740, publishedAt: "2026-05-30T09:00:00.000Z", createdAt: "2026-05-28T09:00:00.000Z" },
  { id: "post-4", title: "Timed sets: why speed is a separate skill", slug: "timed-sets", categoryId: "bcat-1", categoryName: "Exam strategy", excerpt: "You can know every method and still run out of time. Practise the clock separately.", content: "Accuracy and speed improve on different curves...", coverImage: art("post-4"), authorName: "Meera Subramanian", status: "DRAFT", views: 0, publishedAt: null, createdAt: "2026-08-09T09:00:00.000Z" },
  { id: "post-5", title: "Switching careers at thirty-two", slug: "switching-at-32", categoryId: "bcat-2", categoryName: "Career", excerpt: "A learner's account of moving from operations into data, part-time, over eleven months.", content: "I kept my job the whole way through...", coverImage: art("post-5"), authorName: "Fatima Sheikh", status: "PUBLISHED", views: 9120, publishedAt: "2026-04-18T09:00:00.000Z", createdAt: "2026-04-15T09:00:00.000Z" },
  { id: "post-6", title: "Certificates now issue automatically", slug: "auto-certificates", categoryId: "bcat-3", categoryName: "Product updates", excerpt: "Finish the final assessment and the certificate lands in your dashboard within a minute.", content: "Previously certificates were issued weekly...", coverImage: art("post-6"), authorName: "Platform Admin", status: "PUBLISHED", views: 1240, publishedAt: "2026-08-01T09:00:00.000Z", createdAt: "2026-07-31T09:00:00.000Z" },
];

/* ---------------------------------------------------------------- badges */

export const BADGES = [
  { id: "bdg-1", name: "Top Rated", description: "Holds a 4.8+ average across at least 500 ratings.", icon: "star", colour: "#c98c46", criteriaType: "RATING", criteriaValue: 4.8, awardedCount: 2, isActive: true },
  { id: "bdg-2", name: "Bestseller", description: "More than 10,000 learners enrolled across all courses.", icon: "trending-up", colour: "#3f6f9c", criteriaType: "ENROLMENTS", criteriaValue: 10000, awardedCount: 3, isActive: true },
  { id: "bdg-3", name: "Rising Talent", description: "Joined in the last year with a 4.5+ average.", icon: "sparkles", colour: "#5c8a5e", criteriaType: "RATING", criteriaValue: 4.5, awardedCount: 1, isActive: true },
  { id: "bdg-4", name: "Verified Expert", description: "Credentials checked by the platform team.", icon: "badge-check", colour: "#7a5ea8", criteriaType: "MANUAL", criteriaValue: 0, awardedCount: 5, isActive: false },
];

/* -------------------------------------------------------------- payouts */

export const WITHDRAW_METHODS = [
  { id: "wm-1", name: "Bank transfer (NEFT/IMPS)", description: "Direct to an Indian bank account.", minAmount: 1000, maxAmount: 500000, processingDays: 3, feePercent: 0, isActive: true, fields: ["Account holder", "Account number", "IFSC"] },
  { id: "wm-2", name: "UPI", description: "Instant transfer to a UPI id.", minAmount: 500, maxAmount: 100000, processingDays: 1, feePercent: 0, isActive: true, fields: ["UPI id"] },
  { id: "wm-3", name: "PayPal", description: "For instructors billing from outside India.", minAmount: 5000, maxAmount: 800000, processingDays: 5, feePercent: 3.5, isActive: false, fields: ["PayPal email"] },
];

export const PAYOUT_REQUESTS = [
  { id: "pr-1", instructorId: "ins-anand", instructorName: "Anand Krishnan", methodId: "wm-1", methodName: "Bank transfer (NEFT/IMPS)", amount: 184500, fee: 0, netAmount: 184500, status: "PENDING", requestedAt: "2026-08-11T10:20:00.000Z", processedAt: null, note: null, reference: null },
  { id: "pr-2", instructorId: "ins-rahul", instructorName: "Rahul Deshpande", methodId: "wm-2", methodName: "UPI", amount: 96200, fee: 0, netAmount: 96200, status: "APPROVED", requestedAt: "2026-08-02T11:00:00.000Z", processedAt: "2026-08-03T09:15:00.000Z", note: null, reference: "UTR3391027744" },
  { id: "pr-3", instructorId: "ins-fatima", instructorName: "Fatima Sheikh", methodId: "wm-1", methodName: "Bank transfer (NEFT/IMPS)", amount: 142800, fee: 0, netAmount: 142800, status: "APPROVED", requestedAt: "2026-07-14T08:40:00.000Z", processedAt: "2026-07-16T12:05:00.000Z", note: null, reference: "UTR3374881920" },
  { id: "pr-4", instructorId: "ins-vikram", instructorName: "Vikram Nair", methodId: "wm-3", methodName: "PayPal", amount: 61000, fee: 2135, netAmount: 58865, status: "REJECTED", requestedAt: "2026-06-28T15:30:00.000Z", processedAt: "2026-06-29T10:00:00.000Z", note: "PayPal payouts are paused. Please resubmit as a bank transfer.", reference: null },
  { id: "pr-5", instructorId: "ins-meera", instructorName: "Meera Subramanian", methodId: "wm-1", methodName: "Bank transfer (NEFT/IMPS)", amount: 118400, fee: 0, netAmount: 118400, status: "PENDING", requestedAt: "2026-08-13T09:05:00.000Z", processedAt: null, note: null, reference: null },
];

/* --------------------------------------------------------- localisation */

export const COURSE_LANGUAGES = [
  { id: "lang-en", name: "English", code: "en", courseCount: 12, isActive: true, displayOrder: 1 },
  { id: "lang-hi", name: "Hindi", code: "hi", courseCount: 4, isActive: true, displayOrder: 2 },
  { id: "lang-te", name: "Telugu", code: "te", courseCount: 2, isActive: true, displayOrder: 3 },
  { id: "lang-ta", name: "Tamil", code: "ta", courseCount: 1, isActive: false, displayOrder: 4 },
];

export const SITE_LANGUAGES = [
  { id: "sl-en", name: "English", code: "en", direction: "ltr", isDefault: true, isActive: true, translatedKeys: 1284, totalKeys: 1284 },
  { id: "sl-hi", name: "हिन्दी", code: "hi", direction: "ltr", isDefault: false, isActive: true, translatedKeys: 1102, totalKeys: 1284 },
  { id: "sl-ar", name: "العربية", code: "ar", direction: "rtl", isDefault: false, isActive: false, translatedKeys: 418, totalKeys: 1284 },
];

export const COUNTRIES = [
  { id: "ctry-in", name: "India", code: "IN", dialCode: "+91", currency: "INR", isActive: true, learnerCount: 41280 },
  { id: "ctry-ae", name: "United Arab Emirates", code: "AE", dialCode: "+971", currency: "AED", isActive: true, learnerCount: 2140 },
  { id: "ctry-sg", name: "Singapore", code: "SG", dialCode: "+65", currency: "SGD", isActive: true, learnerCount: 890 },
  { id: "ctry-us", name: "United States", code: "US", dialCode: "+1", currency: "USD", isActive: true, learnerCount: 1620 },
  { id: "ctry-gb", name: "United Kingdom", code: "GB", dialCode: "+44", currency: "GBP", isActive: false, learnerCount: 740 },
];

export const CURRENCIES = [
  { id: "cur-inr", name: "Indian Rupee", code: "INR", symbol: "₹", rate: 1, isDefault: true, isActive: true, position: "before" },
  { id: "cur-usd", name: "US Dollar", code: "USD", symbol: "$", rate: 0.012, isDefault: false, isActive: true, position: "before" },
  { id: "cur-aed", name: "UAE Dirham", code: "AED", symbol: "د.إ", rate: 0.044, isDefault: false, isActive: true, position: "before" },
  { id: "cur-gbp", name: "Pound Sterling", code: "GBP", symbol: "£", rate: 0.0094, isDefault: false, isActive: false, position: "before" },
];

/* ---------------------------------------------------------- engagement */

export const SUBSCRIBERS = Array.from({ length: 18 }, (_, i) => ({
  id: `sub-${i + 1}`,
  email: `subscriber${i + 1}@example.com`,
  source: i % 3 === 0 ? "Footer form" : i % 3 === 1 ? "Course page" : "Blog",
  isActive: i % 7 !== 0,
  subscribedAt: `2026-0${1 + (i % 8)}-${String(1 + (i % 27)).padStart(2, "0")}T10:00:00.000Z`,
  lastEmailAt: i % 4 === 0 ? null : `2026-08-0${1 + (i % 8)}T09:00:00.000Z`,
}));

export const CONTACT_MESSAGES = [
  { id: "msg-1", name: "Rahul Menon", email: "rahul.menon@example.com", phone: "+91 98450 11223", subject: "Bulk enrolment for 40 employees", message: "We would like to enrol 40 people on the analytics track. Can you share corporate pricing and an invoice format?", status: "NEW", createdAt: "2026-08-13T11:20:00.000Z" },
  { id: "msg-2", name: "Sneha Kulkarni", email: "sneha.k@example.com", phone: "+91 99870 44521", subject: "Certificate not issued", message: "I finished the final assessment on Monday but the certificate has not appeared in my dashboard.", status: "NEW", createdAt: "2026-08-12T16:05:00.000Z" },
  { id: "msg-3", name: "Imran Qureshi", email: "imran.q@example.com", phone: "+91 90123 77654", subject: "Instructor application follow-up", message: "I submitted an application three weeks ago for the Finance category and have not heard back.", status: "READ", createdAt: "2026-08-08T09:45:00.000Z" },
  { id: "msg-4", name: "Divya Reddy", email: "divya.r@example.com", phone: "+91 91234 55678", subject: "Refund status", message: "My refund was approved on 2 August but has not reached my account yet.", status: "REPLIED", createdAt: "2026-08-05T14:12:00.000Z" },
  { id: "msg-5", name: "Karthik Iyer", email: "karthik.i@example.com", phone: "+91 93456 12398", subject: "Hindi subtitles", message: "Do you plan to add Hindi subtitles to the JEE Physics course?", status: "REPLIED", createdAt: "2026-07-29T10:30:00.000Z" },
];

export const TEACHER_APPLICATIONS = [
  { applicationId: "ta-1", fullName: "Suresh Babu", firstName: "Suresh", lastName: "Babu", email: "suresh.babu@example.com", phone: "+91 98111 22334", expertise: "Chemistry — JEE and NEET", experienceYears: 9, qualification: "MSc Chemistry, IIT Madras", bio: "Nine years coaching JEE chemistry, currently head of department at a Chennai institute.", cvUrl: null, status: "PENDING", createdAt: "2026-08-10T08:20:00.000Z" },
  { applicationId: "ta-2", fullName: "Lakshmi Narayanan", firstName: "Lakshmi", lastName: "Narayanan", email: "lakshmi.n@example.com", phone: "+91 96222 88771", expertise: "Corporate communication", experienceYears: 12, qualification: "MA English, JNU", bio: "Runs communication training for three IT services firms.", cvUrl: null, status: "PENDING", createdAt: "2026-08-07T13:00:00.000Z" },
  { applicationId: "ta-3", fullName: "Ajay Bhatt", firstName: "Ajay", lastName: "Bhatt", email: "ajay.bhatt@example.com", phone: "+91 97333 44556", expertise: "Cloud architecture", experienceYears: 7, qualification: "BE Computer Science", bio: "AWS solutions architect, teaches weekend cohorts.", cvUrl: null, status: "APPROVED", createdAt: "2026-07-12T09:15:00.000Z" },
  { applicationId: "ta-4", fullName: "Preeti Sinha", firstName: "Preeti", lastName: "Sinha", email: "preeti.s@example.com", phone: "+91 95444 33221", expertise: "Graphic design", experienceYears: 4, qualification: "BDes, NID", bio: "Freelance designer moving into teaching.", cvUrl: null, status: "REJECTED", createdAt: "2026-06-20T11:40:00.000Z" },
];

export const COURSE_REVIEWS = [
  { id: "rev-1", courseId: "crs-upsc-prelims", courseTitle: "UPSC Prelims: Complete General Studies", userName: "Ananya Rao", userEmail: "ananya.rao1@example.com", rating: 5, title: "The sectional tests are the whole value", body: "Forty tests with reasoning for every option. I stopped guessing by month three.", status: "PUBLISHED", createdAt: "2026-07-30T10:00:00.000Z" },
  { id: "rev-2", courseId: "crs-data-analytics", courseTitle: "Data Analytics with Python and SQL", userName: "Rohit Sharma", userEmail: "rohit.sharma2@example.com", rating: 4, title: "SQL half is excellent", body: "Window functions finally clicked. The pandas chapters move faster than the intro suggests.", status: "PENDING", createdAt: "2026-08-11T18:20:00.000Z" },
  { id: "rev-3", courseId: "crs-spoken-english", courseTitle: "Spoken English for the Workplace", userName: "Priya Nair", userEmail: "priya.nair3@example.com", rating: 5, title: "Daily speaking tasks made the difference", body: "Six weeks in I ran a client call without a script.", status: "PUBLISHED", createdAt: "2026-06-18T09:30:00.000Z" },
  { id: "rev-4", courseId: "crs-banking-po", courseTitle: "Banking PO: Quantitative Aptitude", userName: "Karthik Iyer", userEmail: "karthik.iyer4@example.com", rating: 2, title: "Too fast for a beginner", body: "The DI sets assume you already recognise the patterns. I needed a slower on-ramp.", status: "PENDING", createdAt: "2026-08-09T15:45:00.000Z" },
  { id: "rev-5", courseId: "crs-react-production", courseTitle: "React in Production", userName: "Sneha Gupta", userEmail: "sneha.gupta5@example.com", rating: 5, title: "Finally past the tutorial ceiling", body: "The testing and performance chapters are what every other course skips.", status: "PUBLISHED", createdAt: "2026-05-24T12:00:00.000Z" },
  { id: "rev-6", courseId: "crs-digital-marketing", courseTitle: "Digital Marketing: Search, Social and Analytics", userName: "Arjun Reddy", userEmail: "arjun.reddy6@example.com", rating: 1, title: "Buy my other course spam", body: "Half the lessons end with a plug for something else.", status: "REJECTED", createdAt: "2026-04-11T08:10:00.000Z" },
];

/* --------------------------------------------------------- appearance */

export const MENU_ITEMS = [
  { id: "mi-1", menu: "header", label: "Home", url: "/", parentId: null, displayOrder: 1, isActive: true, openInNewTab: false },
  { id: "mi-2", menu: "header", label: "Courses", url: "/courses", parentId: null, displayOrder: 2, isActive: true, openInNewTab: false },
  { id: "mi-3", menu: "header", label: "Instructors", url: "/instructors", parentId: null, displayOrder: 3, isActive: true, openInNewTab: false },
  { id: "mi-4", menu: "header", label: "Blog", url: "/blog", parentId: null, displayOrder: 4, isActive: true, openInNewTab: false },
  { id: "mi-5", menu: "header", label: "Teach with us", url: "/become-teacher", parentId: null, displayOrder: 5, isActive: true, openInNewTab: false },
  { id: "mi-6", menu: "footer-1", label: "About us", url: "/about", parentId: null, displayOrder: 1, isActive: true, openInNewTab: false },
  { id: "mi-7", menu: "footer-1", label: "Contact", url: "/contact", parentId: null, displayOrder: 2, isActive: true, openInNewTab: false },
  { id: "mi-8", menu: "footer-2", label: "Terms", url: "/terms", parentId: null, displayOrder: 1, isActive: true, openInNewTab: false },
  { id: "mi-9", menu: "footer-2", label: "Privacy policy", url: "/privacy-policy", parentId: null, displayOrder: 2, isActive: true, openInNewTab: false },
  { id: "mi-10", menu: "footer-3", label: "Help centre", url: "/help", parentId: null, displayOrder: 1, isActive: true, openInNewTab: false },
];

export const PAGES = [
  { id: "pg-1", title: "About us", slug: "about", status: "PUBLISHED", sections: 6, updatedAt: "2026-07-02T10:00:00.000Z" },
  { id: "pg-2", title: "Contact", slug: "contact", status: "PUBLISHED", sections: 3, updatedAt: "2026-06-19T10:00:00.000Z" },
  { id: "pg-3", title: "Terms of service", slug: "terms", status: "PUBLISHED", sections: 1, updatedAt: "2026-02-11T10:00:00.000Z" },
  { id: "pg-4", title: "Privacy policy", slug: "privacy-policy", status: "PUBLISHED", sections: 1, updatedAt: "2026-02-11T10:00:00.000Z" },
  { id: "pg-5", title: "Corporate training", slug: "corporate", status: "DRAFT", sections: 4, updatedAt: "2026-08-09T10:00:00.000Z" },
];

export const PAGE_SECTION_LIBRARY = [
  { id: "sec-hero-1", group: "Hero", name: "Headline with search", description: "Large headline, subtitle and a course search field." },
  { id: "sec-hero-2", group: "Hero", name: "Split hero with image", description: "Copy on the left, illustration on the right." },
  { id: "sec-courses-1", group: "Courses", name: "Featured course grid", description: "Three or four course cards with rating and price." },
  { id: "sec-courses-2", group: "Courses", name: "Category carousel", description: "Horizontally scrolling category tiles." },
  { id: "sec-social-1", group: "Social proof", name: "Testimonial row", description: "Three learner quotes with photo and outcome." },
  { id: "sec-social-2", group: "Social proof", name: "Stats strip", description: "Four headline numbers on a banded background." },
  { id: "sec-cta-1", group: "Call to action", name: "Centred CTA", description: "Headline, supporting line and one button." },
  { id: "sec-cta-2", group: "Call to action", name: "Newsletter capture", description: "Email field with consent copy." },
  { id: "sec-faq-1", group: "Content", name: "FAQ accordion", description: "Collapsible question list." },
  { id: "sec-content-1", group: "Content", name: "Rich text block", description: "Formatted long-form copy." },
  { id: "sec-team-1", group: "Content", name: "Instructor grid", description: "Instructor photos with headline and course count." },
  { id: "sec-logo-1", group: "Content", name: "Brand logo strip", description: "Partner or employer logos in a row." },
];

export const BRANDS = [
  { id: "br-1", name: "TechCorp", logoUrl: art("brand-1"), websiteUrl: "https://techcorp.in", displayOrder: 1, isActive: true },
  { id: "br-2", name: "Global Innovations", logoUrl: art("brand-2"), websiteUrl: "https://globalinnov.com", displayOrder: 2, isActive: true },
  { id: "br-3", name: "Digital Dynamics", logoUrl: art("brand-3"), websiteUrl: "https://digitaldynamics.io", displayOrder: 3, isActive: true },
  { id: "br-4", name: "Northwind Bank", logoUrl: art("brand-4"), websiteUrl: "https://northwind.example", displayOrder: 4, isActive: false },
];

export const SOCIAL_LINKS = [
  { id: "so-1", platform: "Facebook", url: "https://www.facebook.com/grotutor", icon: "facebook", displayOrder: 1, isActive: true },
  { id: "so-2", platform: "LinkedIn", url: "https://www.linkedin.com/company/grotutor", icon: "linkedin", displayOrder: 2, isActive: true },
  { id: "so-3", platform: "YouTube", url: "https://www.youtube.com/@grotutor", icon: "youtube", displayOrder: 3, isActive: true },
  { id: "so-4", platform: "Instagram", url: "https://www.instagram.com/grotutor", icon: "instagram", displayOrder: 4, isActive: true },
  { id: "so-5", platform: "X", url: "", icon: "twitter", displayOrder: 5, isActive: false },
];

export const HOME_SECTIONS = [
  { id: "hs-1", key: "hero", name: "Hero banner", isVisible: true, displayOrder: 1 },
  { id: "hs-2", key: "categories", name: "Category tiles", isVisible: true, displayOrder: 2 },
  { id: "hs-3", key: "featured", name: "Featured courses", isVisible: true, displayOrder: 3 },
  { id: "hs-4", key: "why", name: "Why choose us", isVisible: true, displayOrder: 4 },
  { id: "hs-5", key: "instructors", name: "Instructor spotlight", isVisible: true, displayOrder: 5 },
  { id: "hs-6", key: "testimonials", name: "Testimonials", isVisible: true, displayOrder: 6 },
  { id: "hs-7", key: "brands", name: "Brand strip", isVisible: false, displayOrder: 7 },
  { id: "hs-8", key: "faq", name: "FAQ", isVisible: true, displayOrder: 8 },
  { id: "hs-9", key: "newsletter", name: "Newsletter", isVisible: true, displayOrder: 9 },
];

export const THEMES = [
  { id: "th-1", name: "Classic", description: "The original grotutor layout with a banded hero.", preview: art("theme-1"), isActive: true },
  { id: "th-2", name: "Editorial", description: "Type-led layout with a full-width feature strip.", preview: art("theme-2"), isActive: false },
  { id: "th-3", name: "Compact", description: "Denser grid tuned for large catalogues.", preview: art("theme-3"), isActive: false },
];

/* ------------------------------------------------------------- accounts */

export const ADMIN_ROLES = [
  { id: "role-1", name: "Super Admin", description: "Full access to everything, including other admins.", memberCount: 1, isSystem: true, permissions: ["*"] },
  { id: "role-2", name: "Content Manager", description: "Courses, categories, blog and appearance.", memberCount: 2, isSystem: false, permissions: ["course:read", "course:write", "category:write", "blog:write", "appearance:write"] },
  { id: "role-3", name: "Support", description: "Read-only access plus contact messages and refunds.", memberCount: 3, isSystem: false, permissions: ["course:read", "user:read", "order:read", "message:write"] },
  { id: "role-4", name: "Finance", description: "Orders, payouts and commission.", memberCount: 1, isSystem: false, permissions: ["order:read", "order:write", "payout:write", "commission:write"] },
];

export const ADMIN_USERS = [
  { id: "adm-1", name: "Platform Admin", email: "admin@grotutor.com", roleId: "role-1", roleName: "Super Admin", isActive: true, lastLoginAt: "2026-08-14T05:10:00.000Z" },
  { id: "adm-2", name: "Nikhil Bose", email: "nikhil.bose@grotutor.com", roleId: "role-2", roleName: "Content Manager", isActive: true, lastLoginAt: "2026-08-13T16:40:00.000Z" },
  { id: "adm-3", name: "Ritu Das", email: "ritu.das@grotutor.com", roleId: "role-3", roleName: "Support", isActive: true, lastLoginAt: "2026-08-14T04:02:00.000Z" },
  { id: "adm-4", name: "Manish Verma", email: "manish.verma@grotutor.com", roleId: "role-4", roleName: "Finance", isActive: false, lastLoginAt: "2026-06-30T11:20:00.000Z" },
];

export const ALL_PERMISSIONS = [
  { group: "Courses", items: ["course:read", "course:write", "course:approve", "category:write"] },
  { group: "People", items: ["user:read", "user:write", "user:ban", "instructor:approve"] },
  { group: "Commerce", items: ["order:read", "order:write", "coupon:write", "payout:write", "commission:write"] },
  { group: "Content", items: ["blog:write", "appearance:write", "page:write", "message:write"] },
  { group: "Platform", items: ["settings:write", "role:write", "language:write"] },
];

/* ----------------------------------------------------- live & announce */

export const LIVE_SESSIONS = [
  { id: "ls-1", title: "Polity doubt-clearing — Fundamental Rights", courseId: "crs-upsc-prelims", courseTitle: "UPSC Prelims: Complete General Studies", provider: "ZOOM", startsAt: "2026-08-16T13:30:00.000Z", durationMinutes: 90, joinUrl: "https://zoom.us/j/98765432101", status: "SCHEDULED", registeredCount: 214 },
  { id: "ls-2", title: "Weekly problem clinic", courseId: "crs-jee-physics", courseTitle: "JEE Advanced Physics: Mechanics to Modern", provider: "JITSI", startsAt: "2026-08-15T11:00:00.000Z", durationMinutes: 60, joinUrl: "https://meet.jit.si/grotutor-jee-clinic", status: "SCHEDULED", registeredCount: 138 },
  { id: "ls-3", title: "Portfolio review session", courseId: "crs-data-analytics", courseTitle: "Data Analytics with Python and SQL", provider: "GOOGLE_MEET", startsAt: "2026-08-09T14:00:00.000Z", durationMinutes: 75, joinUrl: "https://meet.google.com/abc-defg-hij", status: "COMPLETED", registeredCount: 302 },
  { id: "ls-4", title: "Mock interview practice", courseId: "crs-spoken-english", courseTitle: "Spoken English for the Workplace", provider: "ZOOM", startsAt: "2026-08-02T10:00:00.000Z", durationMinutes: 120, joinUrl: "https://zoom.us/j/11223344556", status: "COMPLETED", registeredCount: 176 },
];

export const ANNOUNCEMENTS = [
  { id: "an-1", courseId: "crs-upsc-prelims", courseTitle: "UPSC Prelims: Complete General Studies", title: "Module 7 is live", body: "Environment and Ecology is now available, along with its sectional test. The next live doubt session covers it on Saturday.", sentTo: 9420, createdAt: "2026-08-06T06:15:00.000Z" },
  { id: "an-2", courseId: "crs-data-analytics", courseTitle: "Data Analytics with Python and SQL", title: "New capstone dataset", body: "The retail dataset has been refreshed with two more years of transactions. Re-download it before starting week 10.", sentTo: 14780, createdAt: "2026-07-28T09:30:00.000Z" },
  { id: "an-3", courseId: "crs-jee-physics", courseTitle: "JEE Advanced Physics: Mechanics to Modern", title: "Revised test schedule", body: "Full-length test 4 moves to 24 August so it does not clash with the board practicals.", sentTo: 5310, createdAt: "2026-07-19T15:00:00.000Z" },
];

/* --------------------------------------------------- instructor sales */

export const INSTRUCTOR_SALES = COURSES.slice(0, 6).map((course, i) => ({
  id: `sale-${i + 1}`,
  courseId: course.courseId,
  courseTitle: course.title,
  unitsSold: 40 + i * 23,
  grossRevenue: Number(course.price) * (40 + i * 23),
  commissionRate: 30,
  netEarnings: Math.round(Number(course.price) * (40 + i * 23) * 0.7),
  period: "2026-08",
}));

export const CERTIFICATE_TEMPLATE = {
  backgroundUrl: art("cert-bg"),
  signatureUrl: art("cert-sign"),
  signatoryName: "Dr. Anand Krishnan",
  signatoryTitle: "Academic Director",
  bodyText:
    "This is to certify that {{learner_name}} has successfully completed {{course_title}} on {{completion_date}}.",
  showQrCode: true,
  showCertificateId: true,
  accentColour: "#a56d2d",
};

export const INSTRUCTOR_PROFILE = {
  userId: "ins-anand",
  firstName: "Anand",
  lastName: "Krishnan",
  email: "instructor1@grotutor.com",
  headline: "Ex-IAS · 11 years teaching Polity and Governance",
  bio: "Cleared CSE in 2011 and served six years before moving into teaching full time. I focus on making Polity answerable rather than memorable.",
  avatarUrl: null,
  phone: "+91 98111 20034",
  city: "New Delhi",
  country: "India",
  social: { website: "", linkedin: "https://www.linkedin.com/in/anandkrishnan", twitter: "", youtube: "" },
  education: [
    { id: "ed-1", degree: "MA Political Science", institution: "University of Delhi", year: "2008" },
    { id: "ed-2", degree: "BA History (Hons)", institution: "St. Stephen's College", year: "2006" },
  ],
  experience: [
    { id: "ex-1", role: "Academic Director", organisation: "grotutor", from: "2021", to: "Present" },
    { id: "ex-2", role: "Senior Faculty — Polity", organisation: "Vision Academy", from: "2017", to: "2021" },
  ],
  payout: { methodId: "wm-1", accountHolder: "Anand Krishnan", accountNumber: "•••• •••• 4471", ifsc: "HDFC0000123", upiId: "" },
  kyc: { status: "VERIFIED", panLast4: "8821", submittedAt: "2025-03-04T10:00:00.000Z", verifiedAt: "2025-03-07T09:00:00.000Z" },
};

export { INSTRUCTORS };


/* --------------------------------------------------------- assignments */

export const ASSIGNMENTS = [
  { id: "asg-1", courseId: "crs-upsc-prelims", courseTitle: "UPSC Prelims: Complete General Studies", title: "Answer writing — Fundamental Rights", instructions: "Answer the three questions in 250 words each. Cite the relevant article for every claim.", submissionType: "FILE", maxMarks: 30, passMarks: 15, dueAt: "2026-08-25T18:30:00.000Z", allowResubmission: true, submissions: 214, graded: 168, isPublished: true },
  { id: "asg-2", courseId: "crs-data-analytics", courseTitle: "Data Analytics with Python and SQL", title: "Retail dashboard capstone", instructions: "Build a dashboard on the retail dataset and submit the published link.", submissionType: "LINK", maxMarks: 100, passMarks: 60, dueAt: "2026-09-05T18:30:00.000Z", allowResubmission: true, submissions: 96, graded: 41, isPublished: true },
  { id: "asg-3", courseId: "crs-spoken-english", courseTitle: "Spoken English for the Workplace", title: "Two-minute self introduction", instructions: "Record and upload a two-minute introduction as you would give it in an interview.", submissionType: "FILE", maxMarks: 20, passMarks: 10, dueAt: "2026-08-19T18:30:00.000Z", allowResubmission: false, submissions: 418, graded: 400, isPublished: true },
  { id: "asg-4", courseId: "crs-jee-physics", courseTitle: "JEE Advanced Physics: Mechanics to Modern", title: "Rotational dynamics problem set", instructions: "Solve all twelve problems, showing full working.", submissionType: "TEXT", maxMarks: 60, passMarks: 36, dueAt: "2026-09-12T18:30:00.000Z", allowResubmission: true, submissions: 0, graded: 0, isPublished: false },
];

export const ASSIGNMENT_SUBMISSIONS = [
  { id: "sub-1", assignmentId: "asg-1", assignmentTitle: "Answer writing — Fundamental Rights", learnerName: "Ananya Rao", learnerEmail: "ananya.rao1@example.com", submittedAt: "2026-08-12T09:20:00.000Z", status: "SUBMITTED", marks: null, feedback: null, attempt: 1 },
  { id: "sub-2", assignmentId: "asg-1", assignmentTitle: "Answer writing — Fundamental Rights", learnerName: "Rohit Sharma", learnerEmail: "rohit.sharma2@example.com", submittedAt: "2026-08-11T17:05:00.000Z", status: "GRADED", marks: 24, feedback: "Strong on Article 17. Cite the amendment number next time.", attempt: 1 },
  { id: "sub-3", assignmentId: "asg-2", assignmentTitle: "Retail dashboard capstone", learnerName: "Priya Nair", learnerEmail: "priya.nair3@example.com", submittedAt: "2026-08-10T11:40:00.000Z", status: "GRADED", marks: 88, feedback: "Clear layout. Add a period-over-period comparison.", attempt: 2 },
  { id: "sub-4", assignmentId: "asg-2", assignmentTitle: "Retail dashboard capstone", learnerName: "Karthik Iyer", learnerEmail: "karthik.iyer4@example.com", submittedAt: "2026-08-13T08:15:00.000Z", status: "SUBMITTED", marks: null, feedback: null, attempt: 1 },
  { id: "sub-5", assignmentId: "asg-3", assignmentTitle: "Two-minute self introduction", learnerName: "Sneha Gupta", learnerEmail: "sneha.gupta5@example.com", submittedAt: "2026-08-09T14:00:00.000Z", status: "RESUBMIT", marks: 8, feedback: "Audio cuts out at 40 seconds. Please record again.", attempt: 1 },
];
