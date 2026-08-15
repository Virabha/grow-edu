/**
 * Route table for the admin demo build.
 *
 * CRUD routes are generated from the resource declarations in db.ts; only the
 * genuinely bespoke endpoints are written by hand.
 */

import {
  RESOURCES,
  collection,
  db,
  resetDb,
  settingsFor,
  write,
  type ResourceDef,
  type Row,
} from "./db";
import { USERS } from "./seed";
import { ALL_PERMISSIONS, PAGE_SECTION_LIBRARY } from "./seed-platform";
import { SETTINGS_FIELDS, SETTINGS_META, type SettingsGroup } from "./settings";

export interface HandlerContext {
  params: Record<string, string>;
  query: URLSearchParams;
  body: Record<string, unknown>;
}

export type Handler = (ctx: HandlerContext) => unknown | Promise<unknown>;

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
    const bytes = new TextEncoder().encode(input);
    let binary = "";
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary);
  }
  return Buffer.from(input, "utf-8").toString("base64");
}

function issueToken(userId: string, email: string, role: string): string {
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

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function paginate(rows: Row[], query: URLSearchParams) {
  const page = Math.max(1, Number(query.get("page") ?? 1) || 1);
  const limit = Math.max(1, Number(query.get("limit") ?? 10) || 10);
  const start = (page - 1) * limit;
  const meta = {
    page,
    limit,
    total: rows.length,
    totalPages: Math.max(1, Math.ceil(rows.length / limit)),
  };
  // Services in this app read either `pagination` or `meta`; carrying both
  // keeps every existing caller working against one response shape.
  return { data: rows.slice(start, start + limit), pagination: meta, meta };
}

/** Apply `?search=`, then any `?field=value` pair that matches a row key. */
function applyFilters(
  rows: Row[],
  query: URLSearchParams,
  searchFields: string[],
): Row[] {
  let out = rows;

  const search = (query.get("search") ?? query.get("q") ?? "").toLowerCase();
  if (search) {
    out = out.filter((row) =>
      searchFields.some((field) =>
        String(row[field] ?? "").toLowerCase().includes(search),
      ),
    );
  }

  const skip = new Set(["search", "q", "page", "limit", "sort", "order"]);
  for (const [key, value] of query.entries()) {
    if (skip.has(key) || value === "" || value === "all") continue;
    if (!out.some((row) => key in row)) continue;
    out = out.filter((row) => {
      const cell = row[key];
      if (typeof cell === "boolean") return String(cell) === value;
      return String(cell ?? "") === value;
    });
  }

  const sort = query.get("sort");
  if (sort) {
    const dir = query.get("order") === "asc" ? 1 : -1;
    out = [...out].sort((a, b) => {
      const av = a[sort];
      const bv = b[sort];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
    });
  }

  return out;
}

function requireString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new MockHttpError(400, `${key} is required`);
  }
  return value.trim();
}

/* ------------------------------------------------- generated CRUD routes */

function crudRoutes(resource: ResourceDef): Record<string, Handler> {
  const { name, path, idKey, searchFields } = resource;

  return {
    [`GET /${path}`]: ({ query }) => {
      const rows = applyFilters(collection(name), query, searchFields);
      // Some admin lists expect a bare array; the paginated shape is a superset
      // that also carries the array on `.data`, so both callers work.
      return paginate(rows, query);
    },

    [`GET /${path}/:id`]: ({ params }) => {
      const row = collection(name).find((r) => r[idKey] === params.id);
      if (!row) throw new MockHttpError(404, "Not found");
      return row;
    },

    [`POST /${path}`]: ({ body }) =>
      write((draft) => {
        const rows = draft.collections[name];
        if (!rows) throw new MockHttpError(500, `Unknown collection ${name}`);
        const row: Row = {
          ...body,
          [idKey]: body[idKey] ?? newId(path.replace(/[^a-z]/gi, "").slice(0, 4)),
          createdAt: body.createdAt ?? nowIso(),
        };
        rows.unshift(row);
        return row;
      }),

    [`PATCH /${path}/:id`]: ({ params, body }) =>
      write((draft) => {
        const rows = draft.collections[name] ?? [];
        const row = rows.find((r) => r[idKey] === params.id);
        if (!row) throw new MockHttpError(404, "Not found");
        Object.assign(row, body, { updatedAt: nowIso() });
        return row;
      }),

    [`PUT /${path}/:id`]: ({ params, body }) =>
      write((draft) => {
        const rows = draft.collections[name] ?? [];
        const row = rows.find((r) => r[idKey] === params.id);
        if (!row) throw new MockHttpError(404, "Not found");
        Object.assign(row, body, { updatedAt: nowIso() });
        return row;
      }),

    [`DELETE /${path}/:id`]: ({ params }) =>
      write((draft) => {
        const rows = draft.collections[name] ?? [];
        const index = rows.findIndex((r) => r[idKey] === params.id);
        if (index === -1) throw new MockHttpError(404, "Not found");
        rows.splice(index, 1);
        return { message: "Deleted" };
      }),
  };
}

/* ------------------------------------------------------ bespoke handlers */

const custom: Record<string, Handler> = {
  /* ---- auth ---- */

  "POST /auth/login": ({ body }) => {
    const email = requireString(body, "email").toLowerCase();
    const password = requireString(body, "password");
    if (password.length < 4) throw new MockHttpError(401, "Invalid credentials");

    const known = USERS.find((u) => u.email.toLowerCase() === email);
    // Unknown addresses sign in as a platform admin so the demo is never locked
    // out; a known address keeps its real role.
    const role = known?.role ?? "PLATFORM_ADMIN";
    const id = known?.id ?? "usr-admin";
    const firstName = known?.firstName ?? "Platform";
    const lastName = known?.lastName ?? "Admin";

    return {
      access_token: issueToken(id, email, role),
      user: { id, email, firstName, lastName, role },
    };
  },

  "POST /auth/register": ({ body }) => ({
    message: "Registration successful. Check your email to verify your account.",
    email: requireString(body, "email"),
  }),
  "POST /auth/forgot-password": () => ({
    message: "If an account exists with this email, a reset link has been sent.",
  }),
  "POST /auth/reset-password": () => ({ message: "Password has been reset" }),
  "POST /auth/verify-email": () => ({ message: "Email verified" }),

  "GET /users/me": () => {
    const admin = USERS[0];
    return {
      id: admin?.id,
      email: admin?.email,
      firstName: admin?.firstName,
      lastName: admin?.lastName,
      role: admin?.role,
      profileImage: null,
    };
  },
  "PATCH /users/me": ({ body }) => ({ ...body, id: "usr-admin" }),

  /* ---- settings ---- */

  "GET /settings/:group": ({ params }) => {
    const group = params.group as SettingsGroup;
    const values = settingsFor(group);
    const fields = SETTINGS_FIELDS[group];
    if (!fields) throw new MockHttpError(404, `Unknown settings group: ${group}`);
    return { group, meta: SETTINGS_META[group], fields, values };
  },

  "PUT /settings/:group": ({ params, body }) =>
    write((draft) => {
      const group = params.group as SettingsGroup;
      if (!SETTINGS_FIELDS[group]) {
        throw new MockHttpError(404, `Unknown settings group: ${group}`);
      }
      draft.settings[group] = {
        ...(draft.settings[group] ?? {}),
        ...(body as Record<string, string | number | boolean>),
      };
      return { group, values: draft.settings[group] };
    }),

  /* ---- singletons ---- */

  "GET /certificate-template": () => db().singletons.certificateTemplate,
  "PUT /certificate-template": ({ body }) =>
    write((draft) => {
      draft.singletons.certificateTemplate = {
        ...(draft.singletons.certificateTemplate ?? {}),
        ...body,
      };
      return draft.singletons.certificateTemplate;
    }),

  "GET /instructor/profile": () => db().singletons.instructorProfile,
  "PUT /instructor/profile": ({ body }) =>
    write((draft) => {
      draft.singletons.instructorProfile = {
        ...(draft.singletons.instructorProfile ?? {}),
        ...body,
      };
      return draft.singletons.instructorProfile;
    }),

  /* ---- reference data ---- */

  // These three are typed as bare arrays by their services (categoriesApi.getAll,
  // cartApi.get, sectionsApi.getByCourse), so they must not be wrapped.
  "GET /categories": ({ query }) =>
    applyFilters(collection("categories"), query, ["name", "slug"]),
  "GET /cart": () => [],

  /* ---- course curriculum: sections and lessons ----
     The wizard builds a course out of these two, so they get a real store
     rather than a stub. Both are keyed on courseId. */

  "GET /sections/course/:courseId": ({ params }) =>
    collection("sections")
      .filter((row) => row.courseId === params.courseId && row.isDeleted !== true)
      .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
      .map((section) => ({
        ...section,
        lessons: collection("lessons")
          .filter((l) => l.sectionId === section.sectionId)
          .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)),
      })),

  "POST /sections": ({ body }) => {
    const courseId = requireString(body, "courseId");
    const title = requireString(body, "title");
    return write((draft) => {
      const row: Row = {
        sectionId: newId("sec"),
        courseId,
        title,
        description: String(body.description ?? ""),
        order: Number(body.order ?? (draft.collections.sections?.length ?? 0) + 1),
        priceType: String(body.priceType ?? "INCLUDED"),
        sectionPrice: body.sectionPrice ?? null,
        isDeleted: false,
        lessons: [],
      };
      draft.collections.sections?.push(row);
      return row;
    });
  },

  "PUT /sections/:sectionId": ({ params, body }) =>
    write((draft) => {
      const row = draft.collections.sections?.find(
        (r) => r.sectionId === params.sectionId,
      );
      if (!row) throw new MockHttpError(404, "Section not found");
      Object.assign(row, body);
      return row;
    }),

  "DELETE /sections/:sectionId": ({ params }) =>
    write((draft) => {
      const rows = draft.collections.sections ?? [];
      const index = rows.findIndex((r) => r.sectionId === params.sectionId);
      if (index === -1) throw new MockHttpError(404, "Section not found");
      rows.splice(index, 1);
      return { message: "Section deleted" };
    }),

  "POST /sections/reorder": ({ body }) =>
    write((draft) => {
      const modules = Array.isArray(body.modules)
        ? (body.modules as { sectionId: string; order: number }[])
        : [];
      for (const entry of modules) {
        const row = draft.collections.sections?.find(
          (r) => r.sectionId === entry.sectionId,
        );
        if (row) row.order = entry.order;
      }
      return { message: "Order saved" };
    }),

  "GET /lessons/:lessonId": ({ params }) => {
    const row = collection("lessons").find((l) => l.lessonId === params.lessonId);
    if (!row) throw new MockHttpError(404, "Lesson not found");
    return row;
  },

  "POST /lessons": ({ body }) => {
    const sectionId = requireString(body, "sectionId");
    const title = requireString(body, "title");
    return write((draft) => {
      const row: Row = {
        lessonId: newId("lsn"),
        sectionId,
        courseId: body.courseId ?? null,
        title,
        description: String(body.description ?? ""),
        type: String(body.type ?? "VIDEO"),
        status: "DRAFT",
        order: Number(body.order ?? (draft.collections.lessons?.length ?? 0) + 1),
        duration: Number(body.duration ?? 0),
        isFreePreview: body.isFreePreview === true,
        videoId: body.videoId ?? null,
        content: body.content ?? null,
      };
      draft.collections.lessons?.push(row);
      return row;
    });
  },

  "PUT /lessons/:lessonId": ({ params, body }) =>
    write((draft) => {
      const row = draft.collections.lessons?.find(
        (l) => l.lessonId === params.lessonId,
      );
      if (!row) throw new MockHttpError(404, "Lesson not found");
      Object.assign(row, body);
      return row;
    }),

  "DELETE /lessons/:lessonId": ({ params }) =>
    write((draft) => {
      const rows = draft.collections.lessons ?? [];
      const index = rows.findIndex((l) => l.lessonId === params.lessonId);
      if (index === -1) throw new MockHttpError(404, "Lesson not found");
      rows.splice(index, 1);
      return { message: "Lesson deleted" };
    }),

  "POST /lessons/reorder": ({ body }) =>
    write((draft) => {
      const items = Array.isArray(body.lessons)
        ? (body.lessons as { lessonId: string; order: number }[])
        : [];
      for (const entry of items) {
        const row = draft.collections.lessons?.find(
          (l) => l.lessonId === entry.lessonId,
        );
        if (row) row.order = entry.order;
      }
      return { message: "Order saved" };
    }),

  "POST /lessons/:lessonId/approve": ({ params }) =>
    write((draft) => {
      const row = draft.collections.lessons?.find(
        (l) => l.lessonId === params.lessonId,
      );
      if (!row) throw new MockHttpError(404, "Lesson not found");
      row.status = "READY";
      return row;
    }),

  "POST /lessons/:lessonId/quiz-questions": ({ params, body }) =>
    write((draft) => {
      const row = draft.collections.lessons?.find(
        (l) => l.lessonId === params.lessonId,
      );
      if (!row) throw new MockHttpError(404, "Lesson not found");
      row.quizQuestions = body.questions ?? [];
      return row;
    }),

  "POST /video-encoding/create-upload": ({ body }) => ({
    videoId: newId("vid"),
    uploadUrl: "https://demo.local/upload",
    libraryId: "665232",
    title: String(body.title ?? "Untitled video"),
  }),

  /**
   * The course detail response embeds its curriculum. The wizard's review step
   * reads `course.sections[].lessons[]` to build its pre-submission checklist,
   * so a bare course row leaves it reporting "Sections added (0)" however many
   * were actually created.
   */
  "POST /courses": ({ body }) =>
    write((draft) => {
      const row: Row = {
        ...body,
        courseId: body.courseId ?? newId("crs"),
        // The wizard does not send an instructor; without one the new course
        // never appears in the instructor's own list.
        instructorId: body.instructorId ?? DEMO_INSTRUCTOR.id,
        instructorName: body.instructorName ?? DEMO_INSTRUCTOR.name,
        status: body.status ?? "DRAFT",
        reviewStatus: body.reviewStatus ?? "DRAFT",
        enrolledCount: body.enrolledCount ?? 0,
        enrollmentCount: body.enrollmentCount ?? 0,
        rating: body.rating ?? 0,
        ratingCount: body.ratingCount ?? 0,
        revenue: body.revenue ?? 0,
        currency: body.currency ?? "INR",
        createdAt: body.createdAt ?? nowIso(),
      };
      draft.collections.courses?.unshift(row);
      return row;
    }),

  "GET /courses/:id": ({ params }) => {
    const course = collection("courses").find(
      (c) => c.courseId === params.id || c.slug === params.id,
    );
    if (!course) throw new MockHttpError(404, "Course not found");

    const sections = collection("sections")
      .filter((sec) => sec.courseId === course.courseId && sec.isDeleted !== true)
      .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
      .map((sec) => ({
        ...sec,
        lessons: collection("lessons")
          .filter((l) => l.sectionId === sec.sectionId)
          .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)),
      }));

    return { ...course, sections };
  },

  "GET /courses/slug/:slug": ({ params }) => {
    const course = collection("courses").find((c) => c.slug === params.slug);
    if (!course) throw new MockHttpError(404, "Course not found");
    return course;
  },

  "GET /permissions": () => ALL_PERMISSIONS,
  "GET /page-sections": () => PAGE_SECTION_LIBRARY,

  /* ---- workflow actions ---- */

  "POST /courses/:id/approve": ({ params }) =>
    write((draft) => {
      const row = draft.collections.courses?.find((c) => c.courseId === params.id);
      if (!row) throw new MockHttpError(404, "Course not found");
      row.reviewStatus = "APPROVED";
      row.status = "PUBLISHED";
      row.publishedAt = nowIso();
      row.reviewNotes = null;
      return row;
    }),

  "POST /courses/:id/reject": ({ params, body }) => {
    const notes = requireString(body, "notes");
    return write((draft) => {
      const row = draft.collections.courses?.find((c) => c.courseId === params.id);
      if (!row) throw new MockHttpError(404, "Course not found");
      row.reviewStatus = "REJECTED";
      row.status = "DRAFT";
      row.reviewNotes = notes;
      return row;
    });
  },

  "POST /courses/:id/request-changes": ({ params, body }) => {
    const notes = requireString(body, "notes");
    return write((draft) => {
      const row = draft.collections.courses?.find((c) => c.courseId === params.id);
      if (!row) throw new MockHttpError(404, "Course not found");
      row.reviewStatus = "CHANGES_REQUESTED";
      row.reviewNotes = notes;
      return row;
    });
  },

  "POST /payouts/:id/approve": ({ params, body }) =>
    write((draft) => {
      const row = draft.collections.payoutRequests?.find((p) => p.id === params.id);
      if (!row) throw new MockHttpError(404, "Request not found");
      if (row.status !== "PENDING") {
        throw new MockHttpError(409, "That request has already been processed");
      }
      row.status = "APPROVED";
      row.processedAt = nowIso();
      row.reference = String(body.reference ?? `UTR${Date.now()}`);
      return row;
    }),

  "POST /payouts/:id/reject": ({ params, body }) => {
    const note = requireString(body, "note");
    return write((draft) => {
      const row = draft.collections.payoutRequests?.find((p) => p.id === params.id);
      if (!row) throw new MockHttpError(404, "Request not found");
      if (row.status !== "PENDING") {
        throw new MockHttpError(409, "That request has already been processed");
      }
      row.status = "REJECTED";
      row.processedAt = nowIso();
      row.note = note;
      return row;
    });
  },

  "POST /payments/:id/approve": ({ params }) =>
    write((draft) => {
      const row = draft.collections.payments?.find((p) => p.paymentId === params.id);
      if (!row) throw new MockHttpError(404, "Payment not found");
      row.status = "COMPLETED";
      return row;
    }),

  "POST /payments/:id/reject": ({ params, body }) => {
    const reason = requireString(body, "reason");
    return write((draft) => {
      const row = draft.collections.payments?.find((p) => p.paymentId === params.id);
      if (!row) throw new MockHttpError(404, "Payment not found");
      row.status = "FAILED";
      row.rejectionReason = reason;
      return row;
    });
  },

  // The admin screen updates status through this endpoint; approve/reject
  // below remain for any caller using the verb-style routes.
  "PATCH /teacher-applications/:id/status": ({ params, body }) =>
    write((draft) => {
      const row = draft.collections.teacherApplications?.find(
        (t) => t.applicationId === params.id,
      );
      if (!row) throw new MockHttpError(404, "Application not found");
      const status = requireString(body, "status");
      if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) {
        throw new MockHttpError(400, `Unknown status: ${status}`);
      }
      row.status = status;
      return row;
    }),

  "POST /teacher-applications/:id/approve": ({ params }) =>
    write((draft) => {
      const row = draft.collections.teacherApplications?.find(
        (t) => t.applicationId === params.id,
      );
      if (!row) throw new MockHttpError(404, "Application not found");
      row.status = "APPROVED";
      return row;
    }),

  "POST /teacher-applications/:id/reject": ({ params, body }) =>
    write((draft) => {
      const row = draft.collections.teacherApplications?.find(
        (t) => t.applicationId === params.id,
      );
      if (!row) throw new MockHttpError(404, "Application not found");
      row.status = "REJECTED";
      row.rejectionReason = String(body.reason ?? "");
      return row;
    }),

  "POST /course-reviews/:id/approve": ({ params }) =>
    write((draft) => {
      const row = draft.collections.courseReviews?.find((r) => r.id === params.id);
      if (!row) throw new MockHttpError(404, "Review not found");
      row.status = "PUBLISHED";
      return row;
    }),

  "POST /course-reviews/:id/reject": ({ params }) =>
    write((draft) => {
      const row = draft.collections.courseReviews?.find((r) => r.id === params.id);
      if (!row) throw new MockHttpError(404, "Review not found");
      row.status = "REJECTED";
      return row;
    }),

  "POST /users/:id/ban": ({ params }) =>
    write((draft) => {
      const row = draft.collections.users?.find((u) => u.id === params.id);
      if (!row) throw new MockHttpError(404, "User not found");
      row.isBanned = !row.isBanned;
      return row;
    }),

  "POST /enrollments/manual": ({ body }) => {
    const userId = requireString(body, "userId");
    const courseId = requireString(body, "courseId");
    return write((draft) => {
      const user = draft.collections.users?.find((u) => u.id === userId);
      const course = draft.collections.courses?.find((c) => c.courseId === courseId);
      if (!user) throw new MockHttpError(404, "Learner not found");
      if (!course) throw new MockHttpError(404, "Course not found");

      const already = draft.collections.enrollments?.some(
        (e) => e.userId === userId && e.courseId === courseId,
      );
      if (already) {
        throw new MockHttpError(409, "That learner is already enrolled on this course");
      }

      const row: Row = {
        enrollmentId: newId("enr"),
        userId,
        userName: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
        userEmail: user.email,
        courseId,
        courseTitle: course.title,
        status: "ACTIVE",
        source: "ADMIN_GRANT",
        progressPercent: 0,
        enrolledAt: nowIso(),
      };
      draft.collections.enrollments?.unshift(row);
      return row;
    });
  },

  "POST /subscribers/broadcast": ({ body }) => {
    requireString(body, "subject");
    requireString(body, "message");
    const active = collection("subscribers").filter((s) => s.isActive).length;
    return { message: `Queued for ${active} subscribers`, recipients: active };
  },

  "POST /menu-items/reorder": ({ body }) =>
    write((draft) => {
      const order = Array.isArray(body.order) ? (body.order as string[]) : [];
      const rows = draft.collections.menuItems ?? [];
      order.forEach((id, index) => {
        const row = rows.find((r) => r.id === id);
        if (row) row.displayOrder = index + 1;
      });
      return { message: "Order saved" };
    }),

  "POST /home-sections/reorder": ({ body }) =>
    write((draft) => {
      const order = Array.isArray(body.order) ? (body.order as string[]) : [];
      const rows = draft.collections.homeSections ?? [];
      order.forEach((id, index) => {
        const row = rows.find((r) => r.id === id);
        if (row) row.displayOrder = index + 1;
      });
      return { message: "Order saved" };
    }),

  "POST /themes/:id/activate": ({ params }) =>
    write((draft) => {
      const rows = draft.collections.themes ?? [];
      let found = false;
      for (const row of rows) {
        row.isActive = row.id === params.id;
        if (row.isActive) found = true;
      }
      if (!found) throw new MockHttpError(404, "Theme not found");
      return { message: "Theme activated" };
    }),

  "POST /languages/:id/default": ({ params }) =>
    write((draft) => {
      const rows = draft.collections.siteLanguages ?? [];
      let found = false;
      for (const row of rows) {
        row.isDefault = row.id === params.id;
        if (row.isDefault) found = true;
      }
      if (!found) throw new MockHttpError(404, "Language not found");
      return { message: "Default language updated" };
    }),

  "POST /currencies/:id/default": ({ params }) =>
    write((draft) => {
      const rows = draft.collections.currencies ?? [];
      let found = false;
      for (const row of rows) {
        row.isDefault = row.id === params.id;
        if (row.isDefault) found = true;
      }
      if (!found) throw new MockHttpError(404, "Currency not found");
      return { message: "Default currency updated" };
    }),

  /* ---- maintenance actions ---- */

  "POST /system/clear-cache": ({ body }) => {
    const scopes = Array.isArray(body.scopes) ? (body.scopes as string[]) : [];
    return {
      message:
        scopes.length > 0
          ? `Cleared ${scopes.join(", ")}`
          : "Cleared all caches",
      clearedAt: nowIso(),
    };
  },

  "POST /system/clear-database": ({ body }) => {
    if (body.confirm !== "DELETE") {
      throw new MockHttpError(400, 'Type DELETE to confirm');
    }
    resetDb();
    return { message: "Demo data reset to its seeded state" };
  },

  "POST /demo/reset": () => {
    resetDb();
    return { message: "Demo data reset" };
  },

  /* ---- dashboards & analytics ---- */

  "GET /analytics/revenue": () => {
    const payments = collection("payments");
    const completed = payments.filter((p) => p.status === "COMPLETED");
    const total = completed.reduce((sum, p) => sum + Number(p.total ?? 0), 0);
    return { total, currency: "INR", orders: completed.length };
  },

  "GET /analytics/enrollments": () => ({
    total: collection("enrollments").length,
    active: collection("enrollments").filter((e) => e.status === "ACTIVE").length,
  }),

  "GET /analytics/revenue-trend": () => MONTHLY.map((m) => ({ month: m.month, value: m.revenue })),
  "GET /analytics/enrollment-trend": () => MONTHLY.map((m) => ({ month: m.month, value: m.enrolments })),

  "GET /analytics/top-courses": () =>
    [...collection("courses")]
      .sort((a, b) => Number(b.enrolledCount ?? 0) - Number(a.enrolledCount ?? 0))
      .slice(0, 6)
      .map((c) => ({
        courseId: c.courseId,
        title: c.title,
        enrolledCount: c.enrolledCount,
        revenue: c.revenue,
        rating: c.rating,
      })),

  "GET /analytics/instructor-revenue": () => {
    const byInstructor = new Map<string, { name: string; revenue: number; courses: number }>();
    for (const course of collection("courses")) {
      const key = String(course.instructorName ?? "Unknown");
      const entry = byInstructor.get(key) ?? { name: key, revenue: 0, courses: 0 };
      entry.revenue += Number(course.revenue ?? 0);
      entry.courses += 1;
      byInstructor.set(key, entry);
    }
    return Array.from(byInstructor.values()).sort((a, b) => b.revenue - a.revenue);
  },

  "GET /admin/dashboard": () => buildAdminDashboard(),
  "GET /instructor/dashboard": () => buildInstructorDashboard(),
  "GET /instructor/stats": () => {
    const dashboard = buildInstructorDashboard();
    // instructorService.getStats expects this exact shape.
    return {
      totalCourses: dashboard.stats.courses,
      totalStudents: dashboard.stats.learners,
      totalRevenue: dashboard.stats.revenue,
      recentCourses: dashboard.courses.slice(0, 5),
    };
  },

  "GET /instructor/courses": ({ query }) => {
    const mine = collection("courses").filter(
      (c) => c.instructorId === DEMO_INSTRUCTOR.id || !c.instructorId,
    );
    return paginate(applyFilters(mine, query, ["title"]), query);
  },

  /* ---- storage ---- */

  "POST /storage/upload": async ({ body }) => uploadResponse(body.file),
  "POST /storage/upload-key": async ({ body }) => uploadResponse(body.file),
  "POST /files/storage/upload-url": async ({ body }) => uploadResponse(body.file),

  "GET /notifications": () => ({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } }),
  "GET /notifications/unread-count": () => ({ count: 0 }),
  "POST /notifications/read": () => ({ message: "ok" }),
  "POST /notifications/mark-all-read": () => ({ message: "ok" }),
};

/** The instructor the demo signs in as; new courses are attributed to them. */
const DEMO_INSTRUCTOR = { id: "ins-anand", name: "Anand Krishnan" };

const MONTHLY = [
  { month: "Sep", revenue: 842000, enrolments: 410 },
  { month: "Oct", revenue: 918000, enrolments: 468 },
  { month: "Nov", revenue: 1104000, enrolments: 522 },
  { month: "Dec", revenue: 1338000, enrolments: 640 },
  { month: "Jan", revenue: 1512000, enrolments: 712 },
  { month: "Feb", revenue: 1288000, enrolments: 596 },
  { month: "Mar", revenue: 1402000, enrolments: 654 },
  { month: "Apr", revenue: 1196000, enrolments: 548 },
  { month: "May", revenue: 1284000, enrolments: 590 },
  { month: "Jun", revenue: 1470000, enrolments: 688 },
  { month: "Jul", revenue: 1622000, enrolments: 742 },
  { month: "Aug", revenue: 986000, enrolments: 431 },
];

async function uploadResponse(file: unknown) {
  if (!(file instanceof File) && !(file instanceof Blob)) {
    throw new MockHttpError(400, "No file was received");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new MockHttpError(400, "Files must be 8 MB or smaller");
  }
  const url = await downscaleToDataUrl(file, 480);
  return { url, key: url, fileName: file instanceof File ? file.name : "upload" };
}

async function downscaleToDataUrl(file: Blob, max: number): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read that file"));
      reader.readAsDataURL(file);
    });
  }
}

function buildAdminDashboard() {
  const payments = collection("payments");
  const completed = payments.filter((p) => p.status === "COMPLETED");
  const revenue = completed.reduce((s, p) => s + Number(p.total ?? 0), 0);
  const learners = collection("users").filter((u) => u.role === "LEARNER");
  const courses = collection("courses");

  return {
    stats: {
      revenue,
      currency: "INR",
      orders: completed.length,
      pendingPayments: payments.filter((p) => p.status === "PROOF_UPLOADED").length,
      learners: learners.length,
      instructors: collection("users").filter((u) => u.role === "INSTRUCTOR").length,
      courses: courses.length,
      publishedCourses: courses.filter((c) => c.status === "PUBLISHED").length,
      pendingReview: courses.filter((c) => c.reviewStatus === "PENDING_REVIEW").length,
      enrolments: collection("enrollments").length,
      pendingPayouts: collection("payoutRequests").filter((p) => p.status === "PENDING").length,
      newMessages: collection("contactMessages").filter((m) => m.status === "NEW").length,
      pendingApplications: collection("teacherApplications").filter((t) => t.status === "PENDING").length,
      pendingReviews: collection("courseReviews").filter((r) => r.status === "PENDING").length,
    },
    revenueTrend: MONTHLY.map((m) => ({ month: m.month, value: m.revenue })),
    enrolmentTrend: MONTHLY.map((m) => ({ month: m.month, value: m.enrolments })),
    topCourses: [...courses]
      .sort((a, b) => Number(b.enrolledCount ?? 0) - Number(a.enrolledCount ?? 0))
      .slice(0, 5),
    recentOrders: [...payments]
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, 6),
  };
}

function buildInstructorDashboard() {
  const mine = collection("courses").filter(
    (c) => c.instructorId === DEMO_INSTRUCTOR.id || !c.instructorId,
  );
  const revenue = mine.reduce((sum, c) => sum + Number(c.revenue ?? 0), 0);
  const learners = mine.reduce((sum, c) => sum + Number(c.enrolledCount ?? 0), 0);
  const rated = mine.filter((c) => Number(c.rating ?? 0) > 0);
  const averageRating = rated.length
    ? Number(
        (rated.reduce((sum, c) => sum + Number(c.rating ?? 0), 0) / rated.length).toFixed(2),
      )
    : 0;

  return {
    stats: {
      courses: mine.length,
      publishedCourses: mine.filter((c) => c.status === "PUBLISHED").length,
      learners,
      revenue,
      currency: "INR",
      averageRating,
      pendingPayout: 184500,
      lifetimeEarnings: Math.round(revenue * 0.7),
    },
    revenueTrend: MONTHLY.map((m) => ({ month: m.month, value: Math.round(m.revenue * 0.18) })),
    courses: mine,
  };
}

/* ------------------------------------------------------------ the table */

export const handlers: Record<string, Handler> = (() => {
  const table: Record<string, Handler> = {};
  for (const resource of RESOURCES) {
    Object.assign(table, crudRoutes(resource));
  }
  // Bespoke routes win over generated ones with the same key.
  Object.assign(table, custom);
  return table;
})();
