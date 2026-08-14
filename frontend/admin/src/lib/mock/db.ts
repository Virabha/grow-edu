/**
 * In-memory store for the admin demo build.
 *
 * Almost every admin screen is a list + create + edit + delete over one
 * collection, so collections are declared once here and the handler table
 * generates their CRUD routes. Anything genuinely bespoke (analytics,
 * dashboards, approvals) gets its own handler.
 */

import {
  COMPANIES,
  COUPONS,
  COURSES,
  CATEGORIES,
  ENROLLMENTS,
  PAYMENTS,
  USERS,
} from "./seed";
import {
  ADMIN_ROLES,
  ADMIN_USERS,
  ANNOUNCEMENTS,
  ASSIGNMENTS,
  ASSIGNMENT_SUBMISSIONS,
  BADGES,
  BLOG_CATEGORIES,
  BLOG_POSTS,
  BRANDS,
  CERTIFICATE_TEMPLATE,
  CONTACT_MESSAGES,
  COUNTRIES,
  COURSE_LANGUAGES,
  COURSE_REVIEWS,
  CURRENCIES,
  HOME_SECTIONS,
  INSTRUCTOR_PROFILE,
  INSTRUCTOR_SALES,
  LIVE_SESSIONS,
  MENU_ITEMS,
  PAGES,
  PAYOUT_REQUESTS,
  SITE_LANGUAGES,
  SOCIAL_LINKS,
  SUBSCRIBERS,
  TEACHER_APPLICATIONS,
  THEMES,
  WITHDRAW_METHODS,
} from "./seed-platform";
import { DEFAULT_SETTINGS, type SettingsGroup, type SettingsValue } from "./settings";

export type Row = Record<string, unknown>;

const STORAGE_KEY = "grotutor-admin-mock-db";
const STORAGE_VERSION = 1;

export interface MockDb {
  version: number;
  collections: Record<string, Row[]>;
  settings: Record<string, Record<string, SettingsValue>>;
  singletons: Record<string, Row>;
}

/**
 * `path` is the REST segment the app calls; `idKey` is whichever id field the
 * existing API already uses, so responses match what the hooks expect.
 */
export interface ResourceDef {
  name: string;
  path: string;
  idKey: string;
  /** Fields a `?search=` query matches against. */
  searchFields: string[];
  seed: () => Row[];
}

export const RESOURCES: ResourceDef[] = [
  { name: "courses", path: "courses", idKey: "courseId", searchFields: ["title", "slug", "instructorName"], seed: () => COURSES },
  { name: "categories", path: "categories", idKey: "categoryId", searchFields: ["name", "slug"], seed: () => CATEGORIES },
  { name: "users", path: "users", idKey: "userId", searchFields: ["firstName", "lastName", "email"], seed: () => USERS },
  { name: "companies", path: "companies", idKey: "companyId", searchFields: ["name", "email"], seed: () => COMPANIES },
  { name: "enrollments", path: "enrollments", idKey: "enrollmentId", searchFields: ["userName", "userEmail", "courseTitle"], seed: () => ENROLLMENTS },
  { name: "payments", path: "payments", idKey: "paymentId", searchFields: ["invoiceNo", "userName", "userEmail", "courseTitle"], seed: () => PAYMENTS },
  { name: "coupons", path: "coupons", idKey: "couponId", searchFields: ["code", "description"], seed: () => COUPONS },
  { name: "blogCategories", path: "blog/categories", idKey: "id", searchFields: ["name", "slug"], seed: () => BLOG_CATEGORIES },
  { name: "blogPosts", path: "blog/posts", idKey: "id", searchFields: ["title", "slug", "authorName"], seed: () => BLOG_POSTS },
  { name: "badges", path: "badges", idKey: "id", searchFields: ["name", "description"], seed: () => BADGES },
  { name: "withdrawMethods", path: "withdraw-methods", idKey: "id", searchFields: ["name"], seed: () => WITHDRAW_METHODS },
  { name: "payoutRequests", path: "payouts", idKey: "id", searchFields: ["instructorName", "methodName", "reference"], seed: () => PAYOUT_REQUESTS },
  { name: "courseLanguages", path: "course-languages", idKey: "id", searchFields: ["name", "code"], seed: () => COURSE_LANGUAGES },
  { name: "siteLanguages", path: "languages", idKey: "id", searchFields: ["name", "code"], seed: () => SITE_LANGUAGES },
  { name: "countries", path: "locations", idKey: "id", searchFields: ["name", "code"], seed: () => COUNTRIES },
  { name: "currencies", path: "currencies", idKey: "id", searchFields: ["name", "code"], seed: () => CURRENCIES },
  { name: "subscribers", path: "subscribers", idKey: "id", searchFields: ["email", "source"], seed: () => SUBSCRIBERS },
  { name: "contactMessages", path: "contact-messages", idKey: "id", searchFields: ["name", "email", "subject"], seed: () => CONTACT_MESSAGES },
  { name: "teacherApplications", path: "teacher-applications", idKey: "applicationId", searchFields: ["fullName", "email", "expertise"], seed: () => TEACHER_APPLICATIONS },
  { name: "courseReviews", path: "course-reviews", idKey: "id", searchFields: ["userName", "courseTitle", "title"], seed: () => COURSE_REVIEWS },
  { name: "menuItems", path: "menu-items", idKey: "id", searchFields: ["label", "url"], seed: () => MENU_ITEMS },
  { name: "pages", path: "pages", idKey: "id", searchFields: ["title", "slug"], seed: () => PAGES },
  { name: "brands", path: "brands", idKey: "id", searchFields: ["name"], seed: () => BRANDS },
  { name: "socialLinks", path: "social-links", idKey: "id", searchFields: ["platform", "url"], seed: () => SOCIAL_LINKS },
  { name: "homeSections", path: "home-sections", idKey: "id", searchFields: ["name", "key"], seed: () => HOME_SECTIONS },
  { name: "themes", path: "themes", idKey: "id", searchFields: ["name"], seed: () => THEMES },
  { name: "adminRoles", path: "admin-roles", idKey: "id", searchFields: ["name", "description"], seed: () => ADMIN_ROLES },
  { name: "adminUsers", path: "admins", idKey: "id", searchFields: ["name", "email", "roleName"], seed: () => ADMIN_USERS },
  { name: "liveSessions", path: "live-sessions", idKey: "id", searchFields: ["title", "courseTitle"], seed: () => LIVE_SESSIONS },
  { name: "announcements", path: "announcements", idKey: "id", searchFields: ["title", "courseTitle"], seed: () => ANNOUNCEMENTS },
  { name: "assignments", path: "assignments", idKey: "id", searchFields: ["title", "courseTitle"], seed: () => ASSIGNMENTS },
  { name: "assignmentSubmissions", path: "assignment-submissions", idKey: "id", searchFields: ["learnerName", "assignmentTitle"], seed: () => ASSIGNMENT_SUBMISSIONS },
  // Curriculum built by the course wizard. No REST path — the bespoke
  // /sections and /lessons handlers own these.
  { name: "sections", path: "__sections", idKey: "sectionId", searchFields: ["title"], seed: () => [] },
  { name: "lessons", path: "__lessons", idKey: "lessonId", searchFields: ["title"], seed: () => [] },
  { name: "instructorSales", path: "instructor/sales", idKey: "id", searchFields: ["courseTitle"], seed: () => INSTRUCTOR_SALES },
];

function freshDb(): MockDb {
  const collections: Record<string, Row[]> = {};
  for (const resource of RESOURCES) {
    collections[resource.name] = structuredClone(resource.seed());
  }
  return {
    version: STORAGE_VERSION,
    collections,
    settings: structuredClone(DEFAULT_SETTINGS) as Record<
      string,
      Record<string, SettingsValue>
    >,
    singletons: {
      certificateTemplate: structuredClone(CERTIFICATE_TEMPLATE),
      instructorProfile: structuredClone(INSTRUCTOR_PROFILE),
    },
  };
}

let cache: MockDb | null = null;

function load(): MockDb {
  if (cache) return cache;
  if (typeof window === "undefined") {
    cache = freshDb();
    return cache;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MockDb;
      if (parsed.version === STORAGE_VERSION) {
        cache = parsed;
        return cache;
      }
    }
  } catch {
    // Unreadable storage — start from the seed.
  }
  cache = freshDb();
  persist();
  return cache;
}

function persist(): void {
  if (typeof window === "undefined" || !cache) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Over quota — the in-memory copy still serves this session.
  }
}

export function db(): MockDb {
  return load();
}

export function write<T>(mutate: (draft: MockDb) => T): T {
  const current = load();
  const result = mutate(current);
  persist();
  return result;
}

export function resetDb(): void {
  cache = freshDb();
  persist();
}

export function collection(name: string): Row[] {
  const rows = load().collections[name];
  if (!rows) throw new Error(`Unknown collection: ${name}`);
  return rows;
}

export function settingsFor(group: SettingsGroup): Record<string, SettingsValue> {
  return load().settings[group] ?? {};
}
