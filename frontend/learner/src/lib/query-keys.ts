import type { CoursesParams } from "@/lib/api/services/courses";
import type { BooksParams } from "@/lib/api/services/books";

export const queryKeys = {
  cms: {
    banners: () => ["cms", "banners"] as const,
    faqs: () => ["cms", "faqs"] as const,
    whyChooseUs: () => ["cms", "whyChooseUs"] as const,
    testimonials: () => ["cms", "testimonials"] as const,
    services: () => ["cms", "services"] as const,
    serviceBySlug: (slug: string) => ["cms", "services", slug] as const,
    instructors: () => ["cms", "instructors"] as const,
    siteSettings: () => ["cms", "siteSettings"] as const,
    siteSetting: (key: string) => ["cms", "siteSettings", key] as const,
  },
  categories: {
    all: () => ["categories"] as const,
    bySlug: (slug: string) => ["categories", "slug", slug] as const,
  },
  courses: {
    list: (params?: CoursesParams) => ["courses", "list", params] as const,
    byId: (id: string) => ["courses", "detail", id] as const,
    bySlug: (slug: string) => ["courses", "slug", slug] as const,
  },
  enrollments: {
    list: (params?: Record<string, unknown>) =>
      ["enrollments", params] as const,
  },
  profile: {
    me: () => ["profile"] as const,
  },
  payments: {
    create: () => ["payments", "create"] as const,
  },
  books: {
    list: (params?: BooksParams) => ["books", "list", params] as const,
    byId: (id: string) => ["books", "detail", id] as const,
    bySlug: (slug: string) => ["books", "slug", slug] as const,
    purchases: () => ["books", "purchases"] as const,
  },
} as const;
