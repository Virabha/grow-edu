/**
 * Route table for the demo build.
 *
 * Paths and response shapes mirror the NestJS API exactly, so the components
 * and hooks calling them cannot tell the difference. When the backend comes
 * online, remove the adapter in lib/api/client.ts and nothing else changes.
 */

import { db, findCourse, resetDb, staticData, write } from "./db";
import { BLOG_CATEGORIES, BLOG_POSTS } from "./blog";
import type { MockOrder, MockQuizAttempt, MockReview } from "./seed";

export interface HandlerContext {
  params: Record<string, string>;
  query: URLSearchParams;
  body: Record<string, unknown>;
}

type Handler = (ctx: HandlerContext) => unknown | Promise<unknown>;

export class MockHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "MockHttpError";
  }
}

/* --------------------------------------------------------------- helpers */

function base64(input: string): string {
  if (typeof btoa === "function") {
    // The payload is JSON with ASCII keys; percent-encoding first keeps btoa
    // safe if a name or email carries a non-Latin character.
    const bytes = new TextEncoder().encode(input);
    let binary = "";
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary);
  }
  return Buffer.from(input, "utf-8").toString("base64");
}

/**
 * A structurally valid JWT. It is not signed — nothing in the demo verifies a
 * signature — but the middleware and the auth store both decode the payload
 * for `role` and `exp`, so those have to be real.
 */
function issueToken(userId: string, email: string, role = "LEARNER"): string {
  const header = base64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64(
    JSON.stringify({
      sub: userId,
      email,
      role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    }),
  );
  return `${header}.${payload}.demo-signature-not-verified`;
}

function paginate<T>(rows: T[], query: URLSearchParams) {
  const page = Math.max(1, Number(query.get("page") ?? 1) || 1);
  const limit = Math.max(1, Number(query.get("limit") ?? 12) || 12);
  const start = (page - 1) * limit;
  return {
    data: rows.slice(start, start + limit),
    pagination: {
      page,
      limit,
      total: rows.length,
      totalPages: Math.max(1, Math.ceil(rows.length / limit)),
    },
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Shape a seed course into the payload the courses service returns. */
function courseDto(courseId: string) {
  const course = findCourse(courseId);
  if (!course) throw new MockHttpError(404, "Course not found");
  return course;
}

/**
 * Shrink an image to `max` on its longest edge and return a JPEG data URL.
 * Storing a full-resolution photo would blow the localStorage quota.
 */
async function downscaleToDataUrl(file: Blob, max: number): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable");
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    // Non-image file, or canvas blocked — fall back to the raw bytes.
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read that file"));
      reader.readAsDataURL(file);
    });
  }
}

function requireString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new MockHttpError(400, `${key} is required`);
  }
  return value.trim();
}

/* -------------------------------------------------------------- handlers */

const handlersRef: Record<string, Handler> = {}

export const handlers: Record<string, Handler> = handlersRef;

const table: Record<string, Handler> = {
  /* ---- auth ---- */

  "POST /auth/login": ({ body }) => {
    const email = requireString(body, "email");
    const password = requireString(body, "password");
    if (password.length < 4) {
      throw new MockHttpError(401, "Invalid credentials");
    }
    const profile = write((draft) => {
      // Any email signs in during the demo; the profile takes on that address
      // so the header and settings screens show what was typed.
      draft.profile.email = email;
      return draft.profile;
    });
    return {
      access_token: issueToken(profile.id, profile.email),
      user: {
        id: profile.id,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        role: "LEARNER",
      },
    };
  },

  "POST /auth/register": ({ body }) => {
    const email = requireString(body, "email");
    requireString(body, "password");
    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();
    write((draft) => {
      draft.profile.email = email;
      if (firstName) draft.profile.firstName = firstName;
      if (lastName) draft.profile.lastName = lastName;
    });
    return {
      message:
        "Registration successful. Check your email to verify your account.",
      email,
    };
  },

  "POST /auth/forgot-password": ({ body }) => {
    requireString(body, "email");
    return {
      message:
        "If an account exists with this email, a password reset link has been sent.",
    };
  },

  "POST /auth/reset-password": ({ body }) => {
    requireString(body, "token");
    const next = requireString(body, "newPassword");
    if (next.length < 8) {
      throw new MockHttpError(400, "Password must be at least 8 characters");
    }
    return { message: "Password has been reset successfully" };
  },

  "POST /auth/verify-email": () => ({
    message: "Email has been verified successfully",
  }),

  /* ---- profile ---- */

  "GET /users/me": () => {
    const p = db().profile;
    return {
      id: p.id,
      email: p.email,
      firstName: p.firstName,
      lastName: p.lastName,
      profileImage: p.profileImage,
      headline: p.headline,
      bio: p.bio,
      phone: p.phone,
      addressLine: p.addressLine,
      city: p.city,
      state: p.state,
      country: p.country,
      postalCode: p.postalCode,
      social: p.social,
    };
  },

  "PATCH /users/me": ({ body }) =>
    write((draft) => {
      const p = draft.profile;
      const scalars = [
        "firstName",
        "lastName",
        "headline",
        "bio",
        "phone",
        "addressLine",
        "city",
        "state",
        "country",
        "postalCode",
      ] as const;
      for (const key of scalars) {
        if (typeof body[key] === "string") p[key] = body[key] as string;
      }
      if ("profileImage" in body) {
        p.profileImage = (body.profileImage as string | null) ?? null;
      }
      if (body.social && typeof body.social === "object") {
        p.social = { ...p.social, ...(body.social as Record<string, string>) };
      }
      return p;
    }),

  "POST /users/me/password": ({ body }) => {
    const current = requireString(body, "currentPassword");
    const next = requireString(body, "newPassword");
    if (current === next) {
      throw new MockHttpError(
        400,
        "Choose a password different from your current one",
      );
    }
    if (next.length < 8) {
      throw new MockHttpError(400, "Password must be at least 8 characters");
    }
    return { message: "Password updated" };
  },

  "POST /users/me/email": ({ body }) => {
    const email = requireString(body, "email");
    if (!email.includes("@")) {
      throw new MockHttpError(400, "Enter a valid email address");
    }
    return write((draft) => {
      draft.profile.email = email;
      return { message: "Email updated", email };
    });
  },

  /* ---- file upload ---- */

  /**
   * Real uploads go to Bunny Storage and come back as a CDN key. With no
   * backend, the file is downscaled in the browser and returned as a data URL
   * — same response shape, and the picture the learner chose actually shows.
   */
  "POST /files/storage/upload-url": async ({ body }) => {
    const file = body.file;
    if (!(file instanceof File) && !(file instanceof Blob)) {
      throw new MockHttpError(400, "No file was received");
    }
    if (file.size > 8 * 1024 * 1024) {
      throw new MockHttpError(400, "Images must be 8 MB or smaller");
    }

    const url = await downscaleToDataUrl(file, 320);
    return { url, key: url };
  },

  /* ---- devices ---- */

  "GET /users/me/devices": () => db().devices,

  "DELETE /users/me/devices/:deviceId": ({ params }) =>
    write((draft) => {
      const target = draft.devices.find((d) => d.deviceId === params.deviceId);
      if (!target) throw new MockHttpError(404, "Device not found");
      if (target.current) {
        throw new MockHttpError(
          400,
          "You cannot sign out the device you are using here",
        );
      }
      draft.devices = draft.devices.filter(
        (d) => d.deviceId !== params.deviceId,
      );
      return { message: "Device signed out" };
    }),

  "POST /users/me/devices/logout-others": () =>
    write((draft) => {
      const removed = draft.devices.filter((d) => !d.current).length;
      draft.devices = draft.devices.filter((d) => d.current);
      return { message: "Other devices signed out", removed };
    }),

  /* ---- enrollments ---- */

  "GET /enrollments": ({ query }) => {
    const status = query.get("status");
    let rows = db().enrollments.map((e) => ({
      ...e,
      course: findCourse(e.courseId) ?? undefined,
    }));
    if (status && status !== "all") {
      rows = rows.filter((e) => e.status === status);
    }
    return paginate(rows, query);
  },

  /* ---- orders ---- */

  "GET /orders": ({ query }) => {
    const status = query.get("status");
    const search = (query.get("search") ?? "").toLowerCase();
    let rows = [...db().orders].sort(
      (a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt),
    );
    if (status && status !== "all") {
      rows = rows.filter((o) => o.status === status);
    }
    if (search) {
      rows = rows.filter(
        (o) =>
          o.invoiceNo.toLowerCase().includes(search) ||
          o.items.some((i) => i.title.toLowerCase().includes(search)),
      );
    }
    return paginate(rows, query);
  },

  "GET /orders/:orderId": ({ params }) => {
    const order = db().orders.find((o) => o.orderId === params.orderId);
    if (!order) throw new MockHttpError(404, "Order not found");
    return order;
  },

  "POST /orders/:orderId/refund-request": ({ params, body }) => {
    // Validate everything first. `write` mutates the live cache in place, so a
    // throw after the first assignment would leave the order stuck REQUESTED.
    const reason = requireString(body, "reason");
    return write((draft) => {
      const order = draft.orders.find((o) => o.orderId === params.orderId);
      if (!order) throw new MockHttpError(404, "Order not found");
      if (order.status !== "COMPLETED") {
        throw new MockHttpError(400, "Only completed orders can be refunded");
      }
      if (order.refundStatus === "REQUESTED") {
        throw new MockHttpError(
          409,
          "A refund request is already under review for this order",
        );
      }
      order.refundStatus = "REQUESTED";
      order.refundReason = reason;
      return order as MockOrder;
    });
  },

  /* ---- reviews ---- */

  "GET /reviews/mine": ({ query }) => {
    const rows = [...db().reviews].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
    return paginate(rows, query);
  },

  "GET /reviews/reviewable": () => {
    const state = db();
    const reviewed = new Set(state.reviews.map((r) => r.courseId));
    return state.enrollments
      .filter((e) => e.status !== "REVOKED" && !reviewed.has(e.courseId))
      .map((e) => {
        const course = findCourse(e.courseId);
        return {
          courseId: e.courseId,
          title: course?.title ?? "Course",
          thumbnail: course?.thumbnail ?? "",
          progressPercent: e.progressPercent,
        };
      });
  },

  "POST /reviews": ({ body }) =>
    write((draft) => {
      const courseId = requireString(body, "courseId");
      if (draft.reviews.some((r) => r.courseId === courseId)) {
        throw new MockHttpError(409, "You have already reviewed this course");
      }
      const rating = Number(body.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new MockHttpError(400, "Choose a rating from 1 to 5");
      }
      const course = findCourse(courseId);
      const review: MockReview = {
        reviewId: newId("rev"),
        userId: draft.profile.id,
        courseId,
        courseTitle: course?.title ?? "Course",
        courseThumbnail: course?.thumbnail ?? "",
        rating,
        title: requireString(body, "title"),
        body: requireString(body, "body"),
        status: "PENDING",
        createdAt: nowIso(),
        updatedAt: null,
        instructorReply: null,
      };
      draft.reviews.unshift(review);
      return review;
    }),

  "PATCH /reviews/:reviewId": ({ params, body }) =>
    write((draft) => {
      const review = draft.reviews.find((r) => r.reviewId === params.reviewId);
      if (!review) throw new MockHttpError(404, "Review not found");
      if (typeof body.rating === "number") {
        const rating = Number(body.rating);
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
          throw new MockHttpError(400, "Choose a rating from 1 to 5");
        }
        review.rating = rating;
      }
      if (typeof body.title === "string") review.title = body.title.trim();
      if (typeof body.body === "string") review.body = body.body.trim();
      review.updatedAt = nowIso();
      review.status = "PENDING";
      return review;
    }),

  "DELETE /reviews/:reviewId": ({ params }) =>
    write((draft) => {
      const exists = draft.reviews.some((r) => r.reviewId === params.reviewId);
      if (!exists) throw new MockHttpError(404, "Review not found");
      draft.reviews = draft.reviews.filter(
        (r) => r.reviewId !== params.reviewId,
      );
      return { message: "Review deleted" };
    }),

  /* ---- quiz attempts ---- */

  "GET /quiz-attempts": ({ query }) => {
    const courseId = query.get("courseId");
    const result = query.get("result");
    let rows: MockQuizAttempt[] = [...db().quizAttempts].sort(
      (a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt),
    );
    if (courseId && courseId !== "all") {
      rows = rows.filter((a) => a.courseId === courseId);
    }
    if (result === "passed") rows = rows.filter((a) => a.passed);
    if (result === "failed") rows = rows.filter((a) => !a.passed);
    return paginate(rows, query);
  },

  "GET /quiz-attempts/:attemptId": ({ params }) => {
    const attempt = db().quizAttempts.find(
      (a) => a.attemptId === params.attemptId,
    );
    if (!attempt) throw new MockHttpError(404, "Attempt not found");
    return attempt;
  },

  /* ---- dashboard ---- */

  "GET /dashboard/summary": () => {
    const state = db();
    const enrollments = state.enrollments;
    const active = enrollments.filter((e) => e.status === "ACTIVE");
    const completed = enrollments.filter((e) => e.status === "COMPLETED");
    const attempts = state.quizAttempts;
    const spend = state.orders
      .filter((o) => o.status === "COMPLETED")
      .reduce((sum, o) => sum + o.total, 0);
    const lessonsDone = enrollments.reduce(
      (sum, e) => sum + e.lessonsCompleted,
      0,
    );
    const averageScore = attempts.length
      ? Math.round(
          attempts.reduce((s, a) => s + a.scorePercent, 0) / attempts.length,
        )
      : 0;

    return {
      stats: {
        enrolledCount: enrollments.length,
        activeCount: active.length,
        completedCount: completed.length,
        lessonsCompleted: lessonsDone,
        quizzesAttempted: attempts.length,
        averageQuizScore: averageScore,
        certificatesEarned: completed.length,
        totalSpend: spend,
        currency: "INR",
        studyStreakDays: 12,
        studyMinutesThisWeek: staticData.studyActivity.reduce(
          (s, d) => s + d.minutes,
          0,
        ),
      },
      activity: staticData.studyActivity,
      continueLearning: active
        .slice()
        .sort(
          (a, b) =>
            Date.parse(b.lastAccessedAt ?? b.enrolledAt) -
            Date.parse(a.lastAccessedAt ?? a.enrolledAt),
        )
        .slice(0, 3)
        .map((e) => ({
          ...e,
          course: findCourse(e.courseId) ?? undefined,
        })),
      recentAttempts: attempts.slice(0, 3),
      recentOrders: [...state.orders]
        .sort((a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt))
        .slice(0, 3),
    };
  },

  /* ---- catalogue ---- */

  "GET /courses": ({ query }) => {
    const search = (query.get("search") ?? "").toLowerCase();
    const categoryId = query.get("categoryId");
    let rows = [...staticData.courses];
    if (search) {
      rows = rows.filter(
        (c) =>
          c.title.toLowerCase().includes(search) ||
          c.shortDescription.toLowerCase().includes(search),
      );
    }
    if (categoryId && categoryId !== "all") {
      rows = rows.filter((c) => c.categoryId === categoryId);
    }
    return paginate(rows, query);
  },

  "GET /courses/:courseId": ({ params }) => courseDto(params.courseId ?? ""),
  "GET /courses/slug/:slug": ({ params }) => courseDto(params.slug ?? ""),

  "GET /categories": () => staticData.categories,

  /* ---- notifications ---- */

  "GET /notifications": () => ({
    data: db().notifications,
    pagination: {
      page: 1,
      limit: 20,
      total: db().notifications.length,
      totalPages: 1,
    },
  }),

  "GET /notifications/unread-count": () => ({
    count: db().notifications.filter((n) => !n.read).length,
  }),

  "POST /notifications/read": ({ body }) =>
    write((draft) => {
      const ids = Array.isArray(body.notificationIds)
        ? (body.notificationIds as string[])
        : [];
      for (const n of draft.notifications) {
        if (ids.includes(n.notificationId)) n.read = true;
      }
      return { message: "Marked as read" };
    }),

  "POST /notifications/mark-all-read": () =>
    write((draft) => {
      for (const n of draft.notifications) n.read = true;
      return { message: "All notifications marked as read" };
    }),

  /* ---- demo utility ---- */


  /* ---- landing CMS ---- */

  "GET /cms/banners": () => [
    {
      bannerId: "ban-1",
      title: "Crack UPSC Prelims 2027",
      subtitle: "Nine months, one fixed weekly rhythm, forty sectional tests.",
      imageUrl: staticData.courses[0]?.thumbnail ?? "",
      ctaLabel: "Explore the programme",
      ctaUrl: "/courses",
      displayOrder: 1,
      isActive: true,
    },
    {
      bannerId: "ban-2",
      title: "Learn the analyst's toolkit",
      subtitle: "SQL, pandas and a dashboard you can put in front of a client.",
      imageUrl: staticData.courses[2]?.thumbnail ?? "",
      ctaLabel: "Start with SQL",
      ctaUrl: "/courses",
      displayOrder: 2,
      isActive: true,
    },
  ],

  "GET /cms/faqs": () => [
    { faqId: "faq-1", question: "How long do I keep access to a course?", answer: "Lifetime access to every course you buy, including future updates to its lessons.", displayOrder: 1, isActive: true },
    { faqId: "faq-2", question: "Can I pay in instalments?", answer: "Courses above Rs 10,000 can be split into three monthly instalments at checkout, with no extra charge.", displayOrder: 2, isActive: true },
    { faqId: "faq-3", question: "Do I get a certificate?", answer: "Yes. Finish every lesson and pass the final assessment and the certificate is issued automatically to your dashboard.", displayOrder: 3, isActive: true },
    { faqId: "faq-4", question: "What if a course is not right for me?", answer: "Ask for a refund within 14 days, as long as you have completed less than 30% of the lessons.", displayOrder: 4, isActive: true },
  ],

  "GET /cms/why-choose-us": () => [
    { id: "wcu-1", title: "Taught by people who sat the exam", description: "Every instructor has cleared the exam or shipped the work they teach.", icon: "award", displayOrder: 1, isActive: true },
    { id: "wcu-2", title: "A fixed weekly rhythm", description: "Structure beats motivation. Each module lands on a schedule you can plan around.", icon: "calendar", displayOrder: 2, isActive: true },
    { id: "wcu-3", title: "Tested, not just watched", description: "Sectional tests after every module, with reasoning for each option.", icon: "target", displayOrder: 3, isActive: true },
  ],

  "GET /cms/instructors": () => [
    { instructorId: "ins-anand", name: "Anand Krishnan", slug: "anand-krishnan", headline: "Ex-IAS, 11 years teaching Polity and Governance", avatarUrl: null, courseCount: 2, learnerCount: 22470, rating: 4.8 },
    { instructorId: "ins-meera", name: "Meera Subramanian", slug: "meera-subramanian", headline: "IIT Bombay, JEE Physics and Class 12 Mathematics", avatarUrl: null, courseCount: 2, learnerCount: 16550, rating: 4.7 },
    { instructorId: "ins-rahul", name: "Rahul Deshpande", slug: "rahul-deshpande", headline: "Data and front-end engineering", avatarUrl: null, courseCount: 2, learnerCount: 22400, rating: 4.7 },
    { instructorId: "ins-fatima", name: "Fatima Sheikh", slug: "fatima-sheikh", headline: "Communication and product coaching", avatarUrl: null, courseCount: 2, learnerCount: 28320, rating: 4.6 },
    { instructorId: "ins-vikram", name: "Vikram Nair", slug: "vikram-nair", headline: "Finance and growth marketing", avatarUrl: null, courseCount: 2, learnerCount: 20290, rating: 4.65 },
  ],

  "GET /cms/site-settings": () => ({
    siteName: "grotutor",
    tagline: "Online Learning Platform",
    supportEmail: "contact@grotutor.com",
    supportPhone: "+91-6309046611",
    heroHeadline: "Redefining the future of learning",
  }),

  "GET /categories/slug/:slug": ({ params }) => {
    const found = staticData.categories.find((c) => c.slug === params.slug);
    if (!found) throw new MockHttpError(404, "Category not found");
    return found;
  },

  /* ---- blog ---- */

  "GET /blog/posts": ({ query }) => {
    const category = query.get("categoryId");
    let rows = BLOG_POSTS.filter((p) => p.status === "PUBLISHED");
    if (category && category !== "all") {
      rows = rows.filter((p) => p.categoryId === category);
    }
    const search = (query.get("search") ?? "").toLowerCase();
    if (search) {
      rows = rows.filter(
        (p) =>
          p.title.toLowerCase().includes(search) ||
          p.excerpt.toLowerCase().includes(search),
      );
    }
    return paginate(rows, query);
  },

  "GET /blog/posts/slug/:slug": ({ params }) => {
    const post = BLOG_POSTS.find((p) => p.slug === params.slug);
    if (!post) throw new MockHttpError(404, "Post not found");
    return post;
  },

  "GET /blog/categories": () =>
    BLOG_CATEGORIES.filter((c) => c.isActive),

  /* ---- catalogue extras ---- */

  "GET /instructors": () => handlersRef["GET /cms/instructors"]?.({
    params: {},
    query: new URLSearchParams(),
    body: {},
  }),

  "GET /books": ({ query }) => paginate([], query),
  "GET /books/my-purchases": () => [],
  "GET /batches": ({ query }) => paginate([], query),
  "GET /batches/mine": () => [],

  "POST /subscribe": ({ body }) => {
    requireString(body, "email");
    return { message: "You are on the list. Look out for the next digest." };
  },

  "POST /contact": () => ({
    message: "Thanks — we will reply within one working day.",
  }),

  "POST /teacher-applications": () => ({
    message: "Application received. We review new instructors every Friday.",
  }),

  "POST /coupons/validate": ({ body }) => {
    const code = requireString(body, "code").toUpperCase();
    const known: Record<string, number> = {
      MONSOON10: 10,
      EARLYBIRD15: 15,
      BUNDLE20: 20,
    };
    const percent = known[code];
    if (!percent) throw new MockHttpError(404, "That coupon code is not valid");
    return { code, discountType: "PERCENTAGE", discountValue: percent, valid: true };
  },

  "GET /payments/qr-settings": () => ({
    qrImageUrl: null,
    upiId: "grotutor@okicici",
    bankName: "ICICI Bank",
    bankAccountNumber: "004215002199",
    bankIfsc: "ICIC0000042",
    bankAccountHolder: "Grotutor Learning Pvt Ltd",
    instructions: "Pay to the UPI id above, then upload the payment screenshot.",
  }),

  "POST /demo/reset": () => {
    resetDb();
    return { message: "Demo data reset" };
  },
};

Object.assign(handlersRef, table);
