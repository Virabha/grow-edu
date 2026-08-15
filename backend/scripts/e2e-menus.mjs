import http from "node:http";

const API = process.env.API ?? "http://127.0.0.1:6000";
const PASSWORD = "Password123!";

const results = [];
const cleanup = [];

function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  const tag = pass ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
  console.log(`  ${tag}  ${name}${detail ? `  \x1b[2m${detail}\x1b[0m` : ""}`);
}

async function call(method, path, { token, body } = {}) {
  const payload = body === undefined ? null : JSON.stringify(body);
  const url = new URL(API + path);
  const opts = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search,
    method,
    headers: {
      "Content-Type": "application/json",
      ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
  };
  return new Promise((resolve, reject) => {
    const req = http.request(opts, (res) => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", (c) => (text += c));
      res.on("end", () => {
        let data = null;
        if (text) {
          try {
            data = JSON.parse(text);
          } catch {
            data = text;
          }
        }
        resolve({ status: res.statusCode ?? 0, data });
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function login(email) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = await call("POST", "/auth/login", {
      body: { email, password: PASSWORD },
    });
    if (r.status === 429) {
      const waitMs = 15000 * (attempt + 1);
      console.log(`  \x1b[2mthrottled, waiting ${waitMs / 1000}s…\x1b[0m`);
      await new Promise((res) => setTimeout(res, waitMs));
      continue;
    }
    const token =
      r.data?.accessToken ?? r.data?.access_token ?? r.data?.token ?? null;
    if (!token) {
      throw new Error(
        `login failed for ${email}: ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`,
      );
    }
    const userId = r.data?.user?.userId ?? r.data?.user?.id ?? null;
    return { token, userId };
  }
  throw new Error(`login for ${email} still throttled after retries`);
}

function isPaginatedEnvelope(data) {
  return (
    !!data &&
    Array.isArray(data.data) &&
    !!data.pagination &&
    typeof data.pagination.page === "number" &&
    typeof data.pagination.limit === "number" &&
    typeof data.pagination.total === "number" &&
    typeof data.pagination.totalPages === "number"
  );
}

const uniq = String(process.hrtime.bigint()).slice(-9);

async function main() {
  console.log(`\n\x1b[1mAdmin + Student menus end-to-end\x1b[0m  ${API}\n`);

  console.log("\x1b[1mActors\x1b[0m");
  const admin = await login("superadmin@grotutor.com");
  record("admin logs in", !!admin.token);
  const student = await login("learner1@example.com");
  record("student logs in", !!student.token);
  const other = await login("learner2@example.com");
  record("second student logs in", !!other.token);

  // ─────────────────────────────────────────────── Manage Blog (admin menu)
  console.log("\n\x1b[1mManage Blog\x1b[0m");

  const mkCat = await call("POST", "/blog/categories", {
    token: admin.token,
    body: { name: `E2E Cat ${uniq}`, displayOrder: 1, isActive: true },
  });
  const catId = mkCat.data?.id ?? mkCat.data?.data?.id ?? null;
  record("blog category created", mkCat.status === 201 && !!catId, `status ${mkCat.status}`);
  if (catId) cleanup.push(["DELETE", `/blog/categories/${catId}`, admin.token]);

  const catList = await call("GET", "/blog/categories?page=1&limit=10", {
    token: admin.token,
  });
  record(
    "blog category list returns ResourcePage envelope",
    catList.status === 200 && isPaginatedEnvelope(catList.data),
    `status ${catList.status}`,
  );

  const mkPost = await call("POST", "/blog/posts", {
    token: admin.token,
    body: {
      title: `E2E Post ${uniq}`,
      excerpt: "Written by the end-to-end script.",
      content: "Body text.",
      authorName: "E2E",
      status: "DRAFT",
      categoryId: catId,
    },
  });
  const postId = mkPost.data?.id ?? mkPost.data?.data?.id ?? null;
  record("blog post created", mkPost.status === 201 && !!postId, `status ${mkPost.status}`);
  if (postId) cleanup.push(["DELETE", `/blog/posts/${postId}`, admin.token]);

  const postList = await call("GET", "/blog/posts?page=1&limit=10", {
    token: admin.token,
  });
  record(
    "blog post list returns ResourcePage envelope",
    postList.status === 200 && isPaginatedEnvelope(postList.data),
    `status ${postList.status}`,
  );

  const publicDraft = await call("GET", "/blog/posts/public?page=1&limit=50");
  const draftLeaked =
    publicDraft.status === 200 &&
    (publicDraft.data?.data ?? []).some((p) => p.id === postId);
  record("DRAFT post absent from public blog list", !draftLeaked);

  if (postId) {
    const pub = await call("PATCH", `/blog/posts/${postId}`, {
      token: admin.token,
      body: { status: "PUBLISHED" },
    });
    record("blog post publishes", pub.status === 200, `status ${pub.status}`);
    const publishedAt = pub.data?.publishedAt ?? pub.data?.data?.publishedAt ?? null;
    record("publishing stamps publishedAt", !!publishedAt);

    const again = await call("PATCH", `/blog/posts/${postId}`, {
      token: admin.token,
      body: { status: "PUBLISHED" },
    });
    const secondAt = again.data?.publishedAt ?? again.data?.data?.publishedAt ?? null;
    record("re-publishing does not overwrite publishedAt", secondAt === publishedAt);
  }

  const dupe = await call("POST", "/blog/posts", {
    token: admin.token,
    body: {
      title: `E2E Post ${uniq}`,
      slug: `e2e-post-${uniq}`,
      content: "Body text.",
      status: "DRAFT",
    },
  });
  const dupe2 = await call("POST", "/blog/posts", {
    token: admin.token,
    body: {
      title: `E2E Post ${uniq}`,
      slug: `e2e-post-${uniq}`,
      content: "Body text.",
      status: "DRAFT",
    },
  });
  const dupeId = dupe.data?.id ?? dupe.data?.data?.id ?? null;
  if (dupeId) cleanup.push(["DELETE", `/blog/posts/${dupeId}`, admin.token]);
  const dupe2Id = dupe2.data?.id ?? dupe2.data?.data?.id ?? null;
  if (dupe2Id) cleanup.push(["DELETE", `/blog/posts/${dupe2Id}`, admin.token]);
  record(
    "duplicate slug is handled (409 or auto-deduped), never a 500",
    dupe2.status === 409 || dupe2.status === 201,
    `status ${dupe2.status}`,
  );

  const studentWrite = await call("POST", "/blog/posts", {
    token: student.token,
    body: { title: "nope", content: "nope" },
  });
  record(
    "student cannot create a blog post",
    studentWrite.status === 403 || studentWrite.status === 401,
    `status ${studentWrite.status}`,
  );

  // ────────────────────────────────────── Certificate Builder (admin menu)
  console.log("\n\x1b[1mCertificate Builder\x1b[0m");

  const tplGet = await call("GET", "/certificate-template", { token: admin.token });
  record(
    "certificate template loads (defaults, not 404, on a fresh install)",
    tplGet.status === 200,
    `status ${tplGet.status}`,
  );
  const tplFields = [
    "backgroundUrl",
    "signatureUrl",
    "signatoryName",
    "signatoryTitle",
    "bodyText",
    "showQrCode",
    "showCertificateId",
    "accentColour",
  ];
  const tplBody = tplGet.data?.data ?? tplGet.data;
  record(
    "certificate template has every field the builder screen reads",
    tplFields.every((f) => tplBody && f in tplBody),
    tplBody ? `missing: ${tplFields.filter((f) => !(f in tplBody)).join(",") || "none"}` : "no body",
  );

  const tplPut = await call("PUT", "/certificate-template", {
    token: admin.token,
    body: {
      backgroundUrl: "",
      signatureUrl: "",
      signatoryName: `E2E ${uniq}`,
      signatoryTitle: "Director",
      bodyText: "has completed {{course_title}}",
      showQrCode: true,
      showCertificateId: true,
      accentColour: "#2563eb",
    },
  });
  record("certificate template saves", tplPut.status === 200, `status ${tplPut.status}`);

  const tplReGet = await call("GET", "/certificate-template", { token: admin.token });
  const reBody = tplReGet.data?.data ?? tplReGet.data;
  record(
    "saved certificate template round-trips",
    reBody?.signatoryName === `E2E ${uniq}`,
    `signatoryName=${reBody?.signatoryName}`,
  );

  const tplPut2 = await call("PUT", "/certificate-template", {
    token: admin.token,
    body: {
      backgroundUrl: "",
      signatureUrl: "",
      signatoryName: `E2E again ${uniq}`,
      signatoryTitle: "Director",
      bodyText: "has completed {{course_title}}",
      showQrCode: false,
      showCertificateId: true,
      accentColour: "#111827",
    },
  });
  const tplReGet2 = await call("GET", "/certificate-template", { token: admin.token });
  const reBody2 = tplReGet2.data?.data ?? tplReGet2.data;
  record(
    "saving twice upserts rather than duplicating",
    tplPut2.status === 200 && reBody2?.signatoryName === `E2E again ${uniq}`,
    `signatoryName=${reBody2?.signatoryName}`,
  );

  const tplStudent = await call("PUT", "/certificate-template", {
    token: student.token,
    body: { ...(reBody2 ?? {}), signatoryName: "hacked" },
  });
  record(
    "student cannot overwrite the certificate template",
    tplStudent.status === 403 || tplStudent.status === 401,
    `status ${tplStudent.status}`,
  );

  // ─────────────────────────────────────────── Course Review (both menus)
  console.log("\n\x1b[1mCourse Review\x1b[0m");

  const enrolled = await call("GET", "/enrollments?page=1&limit=1", {
    token: student.token,
  });
  const enrolledCourseId =
    enrolled.data?.data?.[0]?.courseId ?? enrolled.data?.[0]?.courseId ?? null;
  record(
    "student has an enrolment to review against",
    !!enrolledCourseId,
    enrolledCourseId ? `courseId ${enrolledCourseId}` : "none found — seed data may be missing",
  );

  if (enrolledCourseId) {
    const mkReview = await call("POST", "/reviews", {
      token: student.token,
      body: {
        courseId: enrolledCourseId,
        rating: 5,
        title: `E2E review ${uniq}`,
        body: "Written by the end-to-end script.",
      },
    });
    const reviewId = mkReview.data?.reviewId ?? mkReview.data?.data?.reviewId ?? null;
    record("student can review an enrolled course", mkReview.status === 201, `status ${mkReview.status}`);
    if (reviewId) cleanup.push(["DELETE", `/reviews/${reviewId}`, student.token]);

    record(
      "new review starts PENDING moderation",
      (mkReview.data?.status ?? mkReview.data?.data?.status) === "PENDING",
    );

    const mine = await call("GET", "/reviews/mine?page=1&limit=10", {
      token: student.token,
    });
    const mineRow = (mine.data?.data ?? []).find((r) => r.reviewId === reviewId);
    record("review appears on the student's Reviews screen", mine.status === 200 && !!mineRow);
    record(
      "my-reviews row carries the course title the screen renders",
      !!mineRow && typeof mineRow.courseTitle === "string" && mineRow.courseTitle.length > 0,
    );

    const publicReviews = await call("GET", `/reviews?courseId=${enrolledCourseId}&page=1&limit=50`);
    const leaked = (publicReviews.data?.data ?? []).some((r) => r.reviewId === reviewId);
    record("PENDING review is not publicly visible", !leaked);

    const queue = await call("GET", "/admin/reviews?status=PENDING&page=1&limit=10", {
      token: admin.token,
    });
    record(
      "admin moderation queue returns ResourcePage envelope",
      queue.status === 200 && isPaginatedEnvelope(queue.data),
      `status ${queue.status}`,
    );

    if (reviewId) {
      const publish = await call("PATCH", `/admin/reviews/${reviewId}/status`, {
        token: admin.token,
        body: { status: "PUBLISHED" },
      });
      record("admin can publish a review", publish.status === 200, `status ${publish.status}`);

      const publicAfter = await call("GET", `/reviews?courseId=${enrolledCourseId}&page=1&limit=50`);
      const visible = (publicAfter.data?.data ?? []).some((r) => r.reviewId === reviewId);
      record("published review becomes publicly visible", visible);

      const otherEdit = await call("PATCH", `/reviews/${reviewId}`, {
        token: other.token,
        body: { rating: 1, body: "hijacked" },
      });
      record(
        "another student cannot edit someone else's review",
        otherEdit.status === 403 || otherEdit.status === 404,
        `status ${otherEdit.status}`,
      );

      const studentModerate = await call("PATCH", `/admin/reviews/${reviewId}/status`, {
        token: student.token,
        body: { status: "PUBLISHED" },
      });
      record(
        "student cannot reach the moderation endpoint",
        studentModerate.status === 403 || studentModerate.status === 401,
        `status ${studentModerate.status}`,
      );
    }

    const second = await call("POST", "/reviews", {
      token: student.token,
      body: { courseId: enrolledCourseId, rating: 4, body: "again" },
    });
    record(
      "duplicate review is rejected or folded into the existing one, never a 500",
      second.status === 409 || second.status === 200 || second.status === 201,
      `status ${second.status}`,
    );
  }

  const notEnrolled = await call("POST", "/reviews", {
    token: other.token,
    body: { courseId: "00000000-0000-0000-0000-000000000000", rating: 5, body: "x" },
  });
  record(
    "cannot review a course you are not enrolled in",
    notEnrolled.status === 403 || notEnrolled.status === 404 || notEnrolled.status === 400,
    `status ${notEnrolled.status}`,
  );

  // ───────────────────────────────────────────── Order History / Manage Orders
  console.log("\n\x1b[1mOrders\x1b[0m");

  const myOrders = await call("GET", "/orders?page=1&limit=10", { token: student.token });
  record("student order history loads", myOrders.status === 200, `status ${myOrders.status}`);
  record(
    "order history returns a paginated envelope",
    isPaginatedEnvelope(myOrders.data),
  );
  const anOrder = (myOrders.data?.data ?? [])[0] ?? null;
  if (anOrder) {
    record(
      "order row is self-describing (title + amount + status)",
      typeof anOrder.status === "string" &&
        anOrder.amount !== undefined &&
        (anOrder.itemTitle !== undefined || anOrder.title !== undefined),
      `keys: ${Object.keys(anOrder).join(",")}`,
    );
    const orderId = anOrder.orderId ?? anOrder.id ?? anOrder.paymentId ?? null;
    if (orderId) {
      const foreign = await call("GET", `/orders/${orderId}`, { token: other.token });
      record(
        "another student cannot read someone else's order",
        foreign.status === 404 || foreign.status === 403,
        `status ${foreign.status}`,
      );
    }
  } else {
    record("order history is empty for this seed user (not a failure)", true);
  }

  const adminOrders = await call("GET", "/admin/orders?page=1&limit=10", {
    token: admin.token,
  });
  record(
    "admin Manage Orders returns ResourcePage envelope",
    adminOrders.status === 200 && isPaginatedEnvelope(adminOrders.data),
    `status ${adminOrders.status}`,
  );

  const studentAdminOrders = await call("GET", "/admin/orders?page=1&limit=10", {
    token: student.token,
  });
  record(
    "student cannot read all orders",
    studentAdminOrders.status === 403 || studentAdminOrders.status === 401,
    `status ${studentAdminOrders.status}`,
  );

  // ─────────────────────────────────────────────────── Attempted Quiz's
  console.log("\n\x1b[1mAttempted Quiz's\x1b[0m");

  const attempts = await call("GET", "/quiz-attempts?page=1&limit=10", {
    token: student.token,
  });
  record("quiz attempts screen loads", attempts.status === 200, `status ${attempts.status}`);
  record("quiz attempts returns a paginated envelope", isPaginatedEnvelope(attempts.data));

  const summary = await call("GET", "/quiz-attempts/summary", { token: student.token });
  record("quiz attempt summary loads", summary.status === 200, `status ${summary.status}`);

  const anAttempt = (attempts.data?.data ?? [])[0] ?? null;
  if (anAttempt) {
    const attemptId = anAttempt.attemptId ?? anAttempt.id ?? null;
    if (attemptId) {
      const foreign = await call("GET", `/quiz-attempts/${attemptId}`, {
        token: other.token,
      });
      record(
        "another student cannot read someone else's attempt",
        foreign.status === 404 || foreign.status === 403,
        `status ${foreign.status}`,
      );
    }
  } else {
    record("no quiz attempts for this seed user (not a failure)", true);
  }

  // ───────────────────────────────────────────────────────────── cleanup
  console.log("\n\x1b[1mCleanup\x1b[0m");
  let removed = 0;
  for (const [method, path, token] of cleanup.reverse()) {
    const r = await call(method, path, { token });
    if (r.status >= 200 && r.status < 300) removed++;
  }
  record(`removed ${removed}/${cleanup.length} fixtures`, removed === cleanup.length);

  // ───────────────────────────────────────────────────────────── summary
  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;
  console.log(
    `\n\x1b[1m${passed}/${results.length} checks passed\x1b[0m` +
      (failed ? `  \x1b[31m${failed} failed\x1b[0m` : ""),
  );
  if (failed) {
    console.log("\nFailures:");
    for (const r of results.filter((x) => !x.pass)) {
      console.log(`  \x1b[31m·\x1b[0m ${r.name}${r.detail ? `  (${r.detail})` : ""}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n\x1b[31mscript error\x1b[0m", err);
  process.exit(1);
});
