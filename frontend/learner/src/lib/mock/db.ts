/**
 * In-memory store backing the demo build.
 *
 * Mutations made in the UI persist to localStorage so a refresh does not undo
 * the demo, and `resetDb()` puts everything back to the seed. On the server
 * there is no storage, so each render starts from the seed — which is correct,
 * since server-rendered pages only ever show read-only content.
 */

import {
  CATEGORIES,
  COURSES,
  DEMO_USER,
  DEVICES,
  ENROLLMENTS,
  ORDERS,
  QUIZ_ATTEMPTS,
  REVIEWS,
  STUDY_ACTIVITY,
  type MockDevice,
  type MockEnrollment,
  type MockOrder,
  type MockProfile,
  type MockQuizAttempt,
  type MockReview,
} from "./seed";

const STORAGE_KEY = "grotutor-mock-db";
const STORAGE_VERSION = 1;

export interface MockDb {
  version: number;
  profile: MockProfile;
  enrollments: MockEnrollment[];
  orders: MockOrder[];
  reviews: MockReview[];
  quizAttempts: MockQuizAttempt[];
  devices: MockDevice[];
  notifications: {
    notificationId: string;
    title: string;
    body: string;
    read: boolean;
    createdAt: string;
    href: string | null;
  }[];
}

function freshDb(): MockDb {
  return {
    version: STORAGE_VERSION,
    profile: structuredClone(DEMO_USER),
    enrollments: structuredClone(ENROLLMENTS),
    orders: structuredClone(ORDERS),
    reviews: structuredClone(REVIEWS),
    quizAttempts: structuredClone(QUIZ_ATTEMPTS),
    devices: structuredClone(DEVICES),
    notifications: [
      {
        notificationId: "ntf-1",
        title: "Payment under review",
        body: "We received your transfer for React in Production. Verification usually finishes within a few hours.",
        read: false,
        createdAt: "2026-08-11T18:02:00.000Z",
        href: "/orders",
      },
      {
        notificationId: "ntf-2",
        title: "Your review is awaiting approval",
        body: "Thanks for reviewing Data Analytics with Python and SQL. It will appear publicly once a moderator approves it.",
        read: false,
        createdAt: "2026-08-10T20:31:00.000Z",
        href: "/reviews",
      },
      {
        notificationId: "ntf-3",
        title: "New module unlocked",
        body: "Module 7 — Environment and Ecology is now available in UPSC Prelims.",
        read: true,
        createdAt: "2026-08-06T06:15:00.000Z",
        href: "/my-batches",
      },
    ],
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
    // Corrupt or unavailable storage — fall through to a fresh seed.
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
    // Storage full or blocked — the in-memory copy still works for this session.
  }
}

/** Read the store. Treat the result as read-only; use `write` to change it. */
export function db(): MockDb {
  return load();
}

/** Mutate the store and persist the result. */
export function write<T>(mutate: (draft: MockDb) => T): T {
  const current = load();
  const result = mutate(current);
  persist();
  return result;
}

/** Restore the seed. Wired to the "Reset demo data" control in profile settings. */
export function resetDb(): void {
  cache = freshDb();
  persist();
}

/* ------------------------------------------------------------ static data */

export const staticData = {
  courses: COURSES,
  categories: CATEGORIES,
  studyActivity: STUDY_ACTIVITY,
};

export function findCourse(courseId: string) {
  return COURSES.find(
    (c) => c.courseId === courseId || c.slug === courseId,
  );
}
