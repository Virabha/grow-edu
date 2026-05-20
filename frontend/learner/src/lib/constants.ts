// ── Brand constants ──────────────────────────────────────────────
export const BRAND = {
  name: "grotutor",
  tagline: "Online Learning Platform",
  description:
    "India's leading online education platform — redefining the future of learning by bridging the gap between aspiration and achievement.",
  website: "https://grotutor.com",
  email: "contact@grotutor.com",
  phone: "+91-6309046611",
  address:
    "Unit # 1801, Vasavi Sky City, Gachibowli X Road, Hyderabad, Telangana",
  social: {
    facebook: "https://www.facebook.com/grotutor",
    linkedin: "https://www.linkedin.com/company/grotutor",
    youtube: "https://www.youtube.com/@grotutor",
    instagram: "https://www.instagram.com/grotutor",
  },
} as const;

// ── Navigation ───────────────────────────────────────────────────
export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/courses", label: "Courses" },
  { href: "/instructors", label: "Instructors" },
  { href: "/services", label: "Services" },
] as const;

// ── External URLs ────────────────────────────────────────────────
export const SITE_URLS = {
  home: "https://grotutor.com",
  courses: "https://grotutor.com/courses",
  register: "https://grotutor.com/register",
  login: "https://grotutor.com/login",
  instructorDetails: (id: string, slug: string) =>
    `https://grotutor.com/instructor-details/${id}/${slug}`,
  course: (slug: string) => `https://grotutor.com/course/${slug}`,
  category: (id: number) => `https://grotutor.com/courses?category=${id}`,
} as const;

// ── Stats ────────────────────────────────────────────────────────
export const HERO_STATS = [
  { value: "50,000+", label: "Active Students" },
  { value: "500+", label: "Expert Courses" },
  { value: "100+", label: "Expert Tutors" },
  { value: "95%", label: "Success Rate" },
] as const;
