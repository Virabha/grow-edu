// ── Brand constants ──────────────────────────────────────────────
export const BRAND = {
  name: "Loshi Edu",
  tagline: "Transform Your Learning Journey",
  description:
    "India's leading online education platform — redefining the future of learning by bridging the gap between aspiration and achievement.",
  website: "https://loshiedu.com",
  email: "contact@loshiedu.com",
  phone: "+91-6309046611",
  address:
    "Unit # 1801, Vasavi Sky City, Gachibowli X Road, Hyderabad, Telangana",
  social: {
    facebook: "https://www.facebook.com/loshiedu",
    linkedin: "https://www.linkedin.com/company/loshiedu",
    youtube: "https://www.youtube.com/@loshiedu",
    instagram: "https://www.instagram.com/loshiedu",
  },
} as const;

// ── Navigation ───────────────────────────────────────────────────
export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/courses", label: "Courses" },
  // { href: "/books", label: "Books" },
  { href: "/about-us", label: "About Us" },
  { href: "/services", label: "Services" },
  { href: "/contact", label: "Contact" },
] as const;

// ── External LoshiEdu URLs ───────────────────────────────────────
export const LOSHI_URLS = {
  home: "https://loshiedu.com",
  courses: "https://loshiedu.com/courses",
  register: "https://loshiedu.com/register",
  login: "https://loshiedu.com/login",
  contact: "https://loshiedu.com/contact-us",
  instructorDetails: (id: string, slug: string) =>
    `https://loshiedu.com/instructor-details/${id}/${slug}`,
  course: (slug: string) => `https://loshiedu.com/course/${slug}`,
  category: (id: number) => `https://loshiedu.com/courses?category=${id}`,
} as const;

// ── Stats ────────────────────────────────────────────────────────
export const HERO_STATS = [
  { value: "50,000+", label: "Active Students" },
  { value: "500+", label: "Expert Courses" },
  { value: "100+", label: "Expert Tutors" },
  { value: "95%", label: "Success Rate" },
] as const;
