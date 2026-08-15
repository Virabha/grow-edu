/**
 * Edge & failure-behaviour test for the batch API.
 *
 * Covers: capacity enforcement, lifecycle status gates, soft-delete visibility,
 * authorisation (student / off-batch instructor), and validation error shapes.
 *
 * Every fixture this script creates is deleted in the cleanup block.
 * Exit code is non-zero if any assertion fails.
 *
 *   node scripts/e2e-batch-edges.mjs          (expects API on :6000)
 *   API=http://127.0.0.1:6000 node scripts/e2e-batch-edges.mjs
 */
// 127.0.0.1, not localhost: port 6000 is on the WHATWG blocked-ports list (X11)
// so fetch() rejects it. node:http bypasses that restriction.
import http from "node:http";

const API = process.env.API ?? "http://127.0.0.1:6000";
const PASSWORD = "Password123!";

const results = [];
const created = { batchIds: /** @type {string[]} */ ([]) };

function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  const tag = pass ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
  console.log(`  ${tag}  ${name}${detail ? `  \x1b[2m${detail}\x1b[0m` : ""}`);
}

/**
 * @param {string} method
 * @param {string} path
 * @param {{ token?: string | null, body?: unknown }} [opts]
 * @returns {Promise<{ status: number, data: unknown }>}
 */
async function call(method, path, opts = {}) {
  const { token, body } = opts;
  const payload = body === undefined ? null : JSON.stringify(body);
  const url = new URL(API + path);
  const reqOpts = {
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
    const req = http.request(reqOpts, (res) => {
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

/**
 * @param {string} email
 * @returns {Promise<{ token: string, userId: string | null }>}
 */
async function login(email) {
  // /auth/login is throttled; back off to avoid false failures on quick re-runs.
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
    const data = /** @type {Record<string, unknown>} */ (r.data ?? {});
    const token =
      /** @type {string | null} */ (
        data["accessToken"] ?? data["access_token"] ?? data["token"] ?? null
      );
    if (!token) {
      throw new Error(
        `login failed for ${email}: ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`,
      );
    }
    const userObj = /** @type {Record<string, unknown> | undefined} */ (
      data["user"]
    );
    const userId =
      /** @type {string | null} */ (
        userObj?.["userId"] ?? userObj?.["id"] ?? null
      );
    return { token, userId };
  }
  throw new Error(`login for ${email} still throttled after retries`);
}

const uniq = String(process.hrtime.bigint()).slice(-9);

function makeBody(overrides = {}) {
  return {
    title: `Edge Test Batch ${uniq}`,
    slug: `edge-batch-${uniq}`,
    description: "Created by e2e-batch-edges.mjs",
    price: 1000,
    currency: "INR",
    capacity: 10,
    startDate: new Date(Date.now() + 86400_000).toISOString(),
    endDate: new Date(Date.now() + 30 * 86400_000).toISOString(),
    language: "English",
    status: "UPCOMING",
    ...overrides,
  };
}

async function main() {
  console.log(`\n\x1b[1mBatch edge tests\x1b[0m  ${API}\n`);

  // ─────────────────────────────────────────────────────────── actors
  console.log("\x1b[1mActors\x1b[0m");
  const admin = await login("superadmin@grotutor.com");
  record("admin logs in", !!admin.token);
  const instructor = await login("instructor1@grotutor.com");
  record("instructor logs in", !!instructor.token);
  const student1 = await login("learner1@example.com");
  record("learner1 logs in", !!student1.token);
  const student2 = await login("learner2@example.com");
  record("learner2 logs in", !!student2.token);
  const student3 = await login("learner3@example.com");
  record("learner3 logs in", !!student3.token);

  // ══════════════════════════════════════════════════════ CAPACITY
  console.log("\n\x1b[1mCapacity\x1b[0m");

  // Create a capacity-1 batch. instructor1 is NOT in teacherIds.
  const capR = await call("POST", "/batches", {
    token: admin.token,
    body: makeBody({
      slug: `edge-cap-${uniq}`,
      title: `Edge Cap Batch ${uniq}`,
      capacity: 1,
      teacherIds: [],
    }),
  });
  const capId = /** @type {string | null} */ (capR.data?.["batchId"] ?? null);
  if (capId) created.batchIds.push(capId);
  record("admin creates capacity-1 batch", capR.status < 300, `status ${capR.status}`);

  if (capId) {
    // Fill the single slot via admin bulk-enrol
    const fill = await call("POST", `/batches/${capId}/enrollments`, {
      token: admin.token,
      body: { userIds: [student1.userId] },
    });
    record("admin enrolls student1 into capacity-1 batch", fill.status < 300, `status ${fill.status}`);

    // student2 checkout: the batch is full — must get 4xx with "full" in message
    const co2 = await call("POST", `/batches/${capId}/checkout`, {
      token: student2.token,
      body: {},
    });
    const coIs4xx = co2.status >= 400 && co2.status < 500;
    const coHasFull = JSON.stringify(co2.data).toLowerCase().includes("full");
    record(
      "second student checkout rejected (capacity full)",
      coIs4xx,
      `status ${co2.status} — expected 4xx`,
    );
    record(
      "rejection message mentions 'full'",
      coHasFull,
      JSON.stringify(co2.data).slice(0, 200),
    );

    // Admin bulk-enrol of student2 onto a full batch — must also be rejected.
    // Without a capacity guard here the slot would silently overbook (BUG).
    const bulkOverfill = await call("POST", `/batches/${capId}/enrollments`, {
      token: admin.token,
      body: { userIds: [student2.userId] },
    });
    const bulkRejected =
      bulkOverfill.status >= 400 && bulkOverfill.status < 500;
    record(
      "admin bulk-enrol respects capacity — rejected when batch is full",
      bulkRejected,
      `status ${bulkOverfill.status}, enrolled=${bulkOverfill.data?.["enrolled"] ?? "?"}`,
    );
  }

  // ══════════════════════════════════════════════ LIFECYCLE / STATUS
  console.log("\n\x1b[1mLifecycle / Status\x1b[0m");

  // DRAFT batch ─────────────────────────────────────────────────────
  const draftR = await call("POST", "/batches", {
    token: admin.token,
    body: makeBody({
      slug: `edge-draft-${uniq}`,
      title: `Edge Draft Batch ${uniq}`,
      status: "DRAFT",
    }),
  });
  const draftId = /** @type {string | null} */ (draftR.data?.["batchId"] ?? null);
  if (draftId) created.batchIds.push(draftId);
  record("admin creates DRAFT batch", draftR.status < 300, `status ${draftR.status}`);

  if (draftId) {
    const list = await call("GET", "/batches?limit=50");
    const rows = Array.isArray(list.data?.["data"]) ? list.data["data"] : [];
    const inList = rows.some((b) => b["batchId"] === draftId);
    record("DRAFT batch absent from public listing", !inList, `found=${inList}`);

    const draftCo = await call("POST", `/batches/${draftId}/checkout`, {
      token: student1.token,
      body: {},
    });
    record(
      "checkout on DRAFT batch rejected",
      draftCo.status >= 400 && draftCo.status < 500,
      `status ${draftCo.status}`,
    );
  }

  // COMPLETED batch ─────────────────────────────────────────────────
  const compR = await call("POST", "/batches", {
    token: admin.token,
    body: makeBody({
      slug: `edge-comp-${uniq}`,
      title: `Edge Completed Batch ${uniq}`,
      status: "COMPLETED",
    }),
  });
  const compId = /** @type {string | null} */ (compR.data?.["batchId"] ?? null);
  if (compId) created.batchIds.push(compId);
  if (compId) {
    const compCo = await call("POST", `/batches/${compId}/checkout`, {
      token: student1.token,
      body: {},
    });
    record(
      "checkout on COMPLETED batch rejected",
      compCo.status >= 400 && compCo.status < 500,
      `status ${compCo.status}`,
    );
  }

  // ARCHIVED batch ──────────────────────────────────────────────────
  const archR = await call("POST", "/batches", {
    token: admin.token,
    body: makeBody({
      slug: `edge-arch-${uniq}`,
      title: `Edge Archived Batch ${uniq}`,
      status: "ARCHIVED",
    }),
  });
  const archId = /** @type {string | null} */ (archR.data?.["batchId"] ?? null);
  if (archId) created.batchIds.push(archId);
  if (archId) {
    const archCo = await call("POST", `/batches/${archId}/checkout`, {
      token: student1.token,
      body: {},
    });
    record(
      "checkout on ARCHIVED batch rejected",
      archCo.status >= 400 && archCo.status < 500,
      `status ${archCo.status}`,
    );
  }

  // Soft-delete visibility ─────────────────────────────────────────
  const delR = await call("POST", "/batches", {
    token: admin.token,
    body: makeBody({
      slug: `edge-del-${uniq}`,
      title: `Edge Del Batch ${uniq}`,
      status: "UPCOMING",
    }),
  });
  const delId = /** @type {string | null} */ (delR.data?.["batchId"] ?? null);
  // Do NOT push to created.batchIds — we delete it as part of the test itself.

  if (delId) {
    // Enrol student1 so /batches/mine would show it if soft-delete were broken.
    await call("POST", `/batches/${delId}/enrollments`, {
      token: admin.token,
      body: { userIds: [student1.userId] },
    });

    const del = await call("DELETE", `/batches/${delId}`, { token: admin.token });
    record("admin soft-deletes batch", del.status < 300, `status ${del.status}`);

    const listAfter = await call("GET", "/batches?limit=50");
    const rowsAfter = Array.isArray(listAfter.data?.["data"])
      ? listAfter.data["data"]
      : [];
    const stillInList = rowsAfter.some((b) => b["batchId"] === delId);
    record("deleted batch absent from public listing", !stillInList, `found=${stillInList}`);

    const mineR = await call("GET", "/batches/mine", { token: student1.token });
    const mineRows =
      Array.isArray(mineR.data?.["data"]) ? mineR.data["data"] : mineR.data;
    const inMine =
      Array.isArray(mineRows) &&
      mineRows.some(
        (b) => (b["batchId"] ?? b["batch"]?.["batchId"]) === delId,
      );
    record("deleted batch absent from /batches/mine", !inMine, `found=${inMine}`);

    // Management operations on a deleted batch must return 404, not 403.
    // The BatchManagerGuard should surface NotFoundException for deleted batches.
    const delSess = await call("POST", `/batches/${delId}/sessions`, {
      token: admin.token,
      body: { title: "Ghost session", type: "RECORDING", recordingVideoId: "x" },
    });
    record(
      "manager action on deleted batch returns 404, not 403",
      delSess.status === 404,
      `status ${delSess.status} (expected 404)`,
    );
  }

  // ══════════════════════════════════════════════════ AUTHORISATION
  console.log("\n\x1b[1mAuthorisation\x1b[0m");

  // Create authz test batch — instructor1 NOT in teacherIds
  const authzR = await call("POST", "/batches", {
    token: admin.token,
    body: makeBody({
      slug: `edge-authz-${uniq}`,
      title: `Edge Authz Batch ${uniq}`,
      teacherIds: [],
    }),
  });
  const authzId = /** @type {string | null} */ (authzR.data?.["batchId"] ?? null);
  if (authzId) created.batchIds.push(authzId);
  record("admin creates authz test batch", authzR.status < 300, `status ${authzR.status}`);

  if (authzId) {
    // Student cannot create a batch
    const stuCreate = await call("POST", "/batches", {
      token: student1.token,
      body: makeBody({ slug: `edge-stu-${uniq}` }),
    });
    record("student cannot create batch", stuCreate.status === 403, `status ${stuCreate.status}`);

    // Student cannot update a batch
    const stuPatch = await call("PATCH", `/batches/${authzId}`, {
      token: student1.token,
      body: { title: "Hijacked" },
    });
    record("student cannot update batch", stuPatch.status === 403, `status ${stuPatch.status}`);

    // Student cannot delete a batch
    const stuDel = await call("DELETE", `/batches/${authzId}`, { token: student1.token });
    record("student cannot delete batch", stuDel.status === 403, `status ${stuDel.status}`);

    // Off-batch instructor: cannot add a session
    const instrSess = await call("POST", `/batches/${authzId}/sessions`, {
      token: instructor.token,
      body: { title: "Hijacked session", type: "RECORDING", recordingVideoId: "fake" },
    });
    record("off-batch instructor cannot add session", instrSess.status === 403, `status ${instrSess.status}`);

    // Off-batch instructor: cannot add a resource
    const instrRes = await call("POST", `/batches/${authzId}/resources`, {
      token: instructor.token,
      body: { title: "Hijacked resource", type: "NOTES", fileKey: "fake/key.pdf" },
    });
    record("off-batch instructor cannot add resource", instrRes.status === 403, `status ${instrRes.status}`);

    // Off-batch instructor: cannot read enrolment list
    const instrEnrolList = await call("GET", `/batches/${authzId}/enrollments`, {
      token: instructor.token,
    });
    record("off-batch instructor cannot read enrolment list", instrEnrolList.status === 403, `status ${instrEnrolList.status}`);

    // Off-batch instructor: cannot update the batch (admin-only PATCH route)
    const instrPatch = await call("PATCH", `/batches/${authzId}`, {
      token: instructor.token,
      body: { title: "Hijacked by instructor" },
    });
    record(
      "off-batch instructor cannot update batch (admin-only route, expects 403)",
      instrPatch.status === 403,
      `status ${instrPatch.status}`,
    );

    // Enrol student1 so we can test student cross-read
    await call("POST", `/batches/${authzId}/enrollments`, {
      token: admin.token,
      body: { userIds: [student1.userId] },
    });

    // student2 (not enrolled, not staff) cannot read the enrolment list
    const stu2Read = await call("GET", `/batches/${authzId}/enrollments`, {
      token: student2.token,
    });
    record(
      "student cannot read another student's enrolment list",
      stu2Read.status === 403,
      `status ${stu2Read.status}`,
    );
  }

  // ══════════════════════════════════════════════════ VALIDATION
  console.log("\n\x1b[1mValidation\x1b[0m");

  // endDate before startDate
  const badDates = await call("POST", "/batches", {
    token: admin.token,
    body: {
      title: "Bad dates",
      slug: `edge-bd-${uniq}`,
      price: 100,
      startDate: new Date(Date.now() + 30 * 86400_000).toISOString(),
      endDate: new Date(Date.now() + 1 * 86400_000).toISOString(),
      language: "English",
    },
  });
  record(
    "endDate before startDate rejected",
    badDates.status >= 400 && badDates.status < 500,
    `status ${badDates.status}`,
  );

  // Negative price
  const negPrice = await call("POST", "/batches", {
    token: admin.token,
    body: makeBody({ slug: `edge-np-${uniq}`, price: -100 }),
  });
  record(
    "negative price rejected",
    negPrice.status >= 400 && negPrice.status < 500,
    `status ${negPrice.status}`,
  );

  // Duplicate slug — create first, then try again with same slug
  const dupSlug = `edge-dup-${uniq}`;
  const slug1 = await call("POST", "/batches", {
    token: admin.token,
    body: makeBody({ slug: dupSlug, title: "Slug original" }),
  });
  const slug1Id = /** @type {string | null} */ (slug1.data?.["batchId"] ?? null);
  if (slug1Id) created.batchIds.push(slug1Id);
  record("first batch with slug creates OK", slug1.status < 300, `status ${slug1.status}`);

  const slug2 = await call("POST", "/batches", {
    token: admin.token,
    body: makeBody({ slug: dupSlug, title: "Slug duplicate" }),
  });
  record(
    "duplicate slug rejected with 409 Conflict",
    slug2.status === 409,
    `status ${slug2.status} (expected 409)`,
  );

  // limit=1000 must be rejected by validation (cap is 100)
  const bigLimit = await call("GET", "/batches?limit=1000");
  record(
    "limit=1000 rejected (cap is 100)",
    bigLimit.status >= 400 && bigLimit.status < 500,
    `status ${bigLimit.status}`,
  );

  return finish();
}

async function finish() {
  console.log("\n\x1b[2mCleaning up…\x1b[0m");
  const adm = await login("superadmin@grotutor.com");
  for (const id of created.batchIds) {
    try {
      const r = await call("DELETE", `/batches/${id}`, { token: adm.token });
      console.log(`  \x1b[2mdeleted batch ${id} (status ${r.status})\x1b[0m`);
    } catch {
      console.log(`  \x1b[33mcleanup failed for ${id} — remove by hand\x1b[0m`);
    }
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n\x1b[1m${results.length - failed.length}/${results.length} checks passed\x1b[0m`);
  if (failed.length) {
    console.log("\n\x1b[31mFailures:\x1b[0m");
    for (const f of failed) console.log(`  - ${f.name}  ${f.detail}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n\x1b[31mE2E aborted:\x1b[0m", err.message);
  finish().finally(() => process.exit(1));
});
