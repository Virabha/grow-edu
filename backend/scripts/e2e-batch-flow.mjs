/**
 * End-to-end exercise of the batch lifecycle against a RUNNING server.
 *
 *   node scripts/e2e-batch-flow.mjs            (expects API on :6000)
 *   API=http://localhost:6000 node scripts/e2e-batch-flow.mjs
 *
 * Covers: batch creation -> content (subject, LIVE session, RECORDING session,
 * resource) -> publish -> discovery -> paid checkout -> enrolment -> access
 * control for enrolled vs non-enrolled -> admin direct enrolment -> cleanup.
 *
 * Every fixture it creates is deleted at the end, so it is safe to re-run.
 * Exit code is non-zero if any assertion fails.
 */
// 127.0.0.1, not localhost: the API binds 0.0.0.0 (IPv4 only) and Node fetch
// resolves localhost to ::1 first, which fails with a bare "fetch failed".
import http from "node:http";

const API = process.env.API ?? "http://127.0.0.1:6000";
const PASSWORD = "Password123!";

const results = [];
let created = { batchId: null, slug: null };

function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  const tag = pass ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
  console.log(`  ${tag}  ${name}${detail ? `  \x1b[2m${detail}\x1b[0m` : ""}`);
}

async function call(method, path, { token, body } = {}) {
  // node:http, not fetch. Port 6000 is on the WHATWG blocked-ports list (X11),
  // so fetch() rejects it with a bare 'bad port'. A browser hitting :6000
  // directly gets ERR_UNSAFE_PORT for the same reason — the apps only work
  // because Next proxies /api server-side. Worth moving the API off 6000.
  const payload = body === undefined ? null : JSON.stringify(body);
  const url = new URL(API + path);
  const opts = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search,
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
  };
  return new Promise((resolve, reject) => {
    const req = http.request(opts, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (c) => (text += c));
      res.on('end', () => {
        let data = null;
        if (text) { try { data = JSON.parse(text); } catch { data = text; } }
        resolve({ status: res.statusCode ?? 0, data });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function login(email) {
  // /auth/login is deliberately throttled. Re-running this script trips it, so
  // back off rather than reporting a false failure.
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = await call('POST', '/auth/login', { body: { email, password: PASSWORD } });
    if (r.status === 429) {
      const waitMs = 15000 * (attempt + 1);
      console.log(`  \x1b[2mthrottled, waiting ${waitMs / 1000}s…\x1b[0m`);
      await new Promise((res) => setTimeout(res, waitMs));
      continue;
    }
    const token = r.data?.accessToken ?? r.data?.access_token ?? r.data?.token ?? null;
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

const uniq = String(process.hrtime.bigint()).slice(-9);

async function main() {
  console.log(`\n\x1b[1mBatch end-to-end\x1b[0m  ${API}\n`);

  // ---------------------------------------------------------------- actors
  console.log("\x1b[1mActors\x1b[0m");
  const admin = await login("superadmin@grotutor.com");
  record("admin logs in", !!admin.token);
  const student = await login("learner1@example.com");
  record("student logs in", !!student.token);
  const other = await login("learner2@example.com");
  record("second student logs in", !!other.token);

  // ------------------------------------------------------------- creation
  console.log("\n\x1b[1mCreation\x1b[0m");
  const startDate = new Date(Date.now() + 86400_000).toISOString();
  const endDate = new Date(Date.now() + 30 * 86400_000).toISOString();

  const mk = await call("POST", "/batches", {
    token: admin.token,
    body: {
      title: `E2E Batch ${uniq}`,
      slug: `e2e-batch-${uniq}`,
      description: "Created by the end-to-end script.",
      price: 1500,
      currency: "INR",
      capacity: 3,
      startDate,
      endDate,
      language: "English",
    },
  });
  const batchId = mk.data?.batchId ?? mk.data?.batch?.batchId ?? null;
  created = { batchId, slug: `e2e-batch-${uniq}` };
  record("admin creates a batch", mk.status === 201 || mk.status === 200, `status ${mk.status}${batchId ? "" : " — " + JSON.stringify(mk.data).slice(0, 220)}`);
  if (!batchId) {
    console.log("\n\x1b[31mCannot continue without a batch id.\x1b[0m");
    return finish();
  }

  const subj = await call("POST", `/batches/${batchId}/subjects`, {
    token: admin.token,
    body: { name: "Mathematics", displayOrder: 1 },
  });
  const subjectId = subj.data?.subjectId ?? null;
  record("adds a subject", subj.status < 300, `status ${subj.status}`);

  const live = await call("POST", `/batches/${batchId}/sessions`, {
    token: admin.token,
    body: {
      title: "Live class 1",
      type: "LIVE",
      liveProvider: "GOOGLE_MEET",
      joinUrl: "https://meet.google.com/e2e-test",
      scheduledStartAt: startDate,
      scheduledEndAt: new Date(Date.now() + 90000_000).toISOString(),
      ...(subjectId ? { subjectId } : {}),
    },
  });
  record("adds a LIVE session", live.status < 300, `status ${live.status}${live.status >= 300 ? " — " + JSON.stringify(live.data).slice(0, 200) : ""}`);

  const rec = await call("POST", `/batches/${batchId}/sessions`, {
    token: admin.token,
    body: {
      title: "Recorded lecture 1",
      type: "RECORDING",
      recordingVideoId: "e2e-video-123",
      recordingDurationSeconds: 600,
      ...(subjectId ? { subjectId } : {}),
    },
  });
  record("adds a RECORDING session", rec.status < 300, `status ${rec.status}${rec.status >= 300 ? " — " + JSON.stringify(rec.data).slice(0, 200) : ""}`);

  const resrc = await call("POST", `/batches/${batchId}/resources`, {
    token: admin.token,
    body: { title: "Chapter 1 notes", type: "NOTES", fileKey: "e2e/notes.pdf", ...(subjectId ? { subjectId } : {}) },
  });
  record("uploads a resource", resrc.status < 300, `status ${resrc.status}${resrc.status >= 300 ? " — " + JSON.stringify(resrc.data).slice(0, 200) : ""}`);

  const pub = await call("PATCH", `/batches/${batchId}`, {
    token: admin.token,
    body: { status: "UPCOMING" },
  });
  record("publishes the batch", pub.status < 300, `status ${pub.status}`);

  // ------------------------------------------------------------ discovery
  console.log("\n\x1b[1mDiscovery\x1b[0m");
  const list = await call("GET", "/batches?page=1&limit=50");
  const inList = Array.isArray(list.data?.data) && list.data.data.some((b) => b.batchId === batchId);
  record("published batch appears in the public list", inList, `status ${list.status}`);

  const bySlug = await call("GET", `/batches/${created.slug}`);
  record("batch is fetchable by slug", bySlug.status === 200, `status ${bySlug.status}`);

  // ----------------------------------------------------- access, unenrolled
  console.log("\n\x1b[1mAccess control before enrolment\x1b[0m");
  const sessionsAnon = await call("GET", `/batches/${batchId}/sessions`, { token: other.token });
  record(
    "non-enrolled student cannot read sessions",
    sessionsAnon.status === 403 || sessionsAnon.status === 404,
    `status ${sessionsAnon.status} (expected 403/404)`,
  );

  // ------------------------------------------------------------- checkout
  console.log("\n\x1b[1mPaid enrolment\x1b[0m");
  const checkout = await call("POST", `/batches/${batchId}/checkout`, { token: student.token, body: {} });
  const paymentId = checkout.data?.paymentId ?? checkout.data?.payment?.paymentId ?? null;
  record("student starts checkout", checkout.status < 300, `status ${checkout.status}${checkout.status >= 300 ? " — " + JSON.stringify(checkout.data).slice(0, 200) : ""}`);
  record("checkout returns a payment to settle", !!paymentId, paymentId ? `paymentId ${String(paymentId).slice(0, 12)}…` : JSON.stringify(checkout.data).slice(0, 200));

  const dup = await call("POST", `/batches/${batchId}/checkout`, { token: student.token, body: {} });
  record("second checkout while one is pending is handled", dup.status < 500, `status ${dup.status}`);

  // --------------------------------------------------- admin direct enrol
  console.log("\n\x1b[1mAdmin direct enrolment\x1b[0m");
  const direct = await call("POST", `/batches/${batchId}/enrollments`, {
    token: admin.token,
    body: { userIds: [other.userId] },
  });
  record("admin enrols a student directly", direct.status < 300, `status ${direct.status}${direct.status >= 300 ? " — " + JSON.stringify(direct.data).slice(0, 200) : ""}`);

  const enrolled = await call("GET", `/batches/${batchId}/enrollments`, { token: admin.token });
  const count = Array.isArray(enrolled.data?.data) ? enrolled.data.data.length : null;
  record("enrolment list reflects it", count !== null && count >= 1, `count ${count}`);

  const sessionsEnrolled = await call("GET", `/batches/${batchId}/sessions`, { token: other.token });
  record("enrolled student can now read sessions", sessionsEnrolled.status === 200, `status ${sessionsEnrolled.status}`);

  const bothTypes =
    Array.isArray(sessionsEnrolled.data?.data ?? sessionsEnrolled.data) &&
    (() => {
      const rows = sessionsEnrolled.data?.data ?? sessionsEnrolled.data;
      return rows.some((s) => s.type === "LIVE") && rows.some((s) => s.type === "RECORDING");
    })();
  record("both LIVE and RECORDING sessions are returned", bothTypes);

  const resEnrolled = await call("GET", `/batches/${batchId}/resources`, { token: other.token });
  record("enrolled student can read resources", resEnrolled.status === 200, `status ${resEnrolled.status}`);

  const mine = await call("GET", "/batches/mine", { token: other.token });
  const inMine = (() => {
    const rows = mine.data?.data ?? mine.data;
    return Array.isArray(rows) && rows.some((b) => (b.batchId ?? b.batch?.batchId) === batchId);
  })();
  record("batch shows in the student's own list", inMine, `status ${mine.status}`);

  const dupEnrol = await call("POST", `/batches/${batchId}/enrollments`, {
    token: admin.token,
    body: { userIds: [other.userId] },
  });
  // Bulk enrolment is idempotent by design: it dedupes against existing rows
  // and reports the split, backed by a unique (batch_id, user_id) constraint.
  // So 201 with enrolled:0 is correct — asserting a 4xx here was wrong.
  record(
    "duplicate enrolment is a no-op, not a second row",
    dupEnrol.data?.enrolled === 0 && dupEnrol.data?.alreadyEnrolled >= 1,
    `enrolled=${dupEnrol.data?.enrolled} alreadyEnrolled=${dupEnrol.data?.alreadyEnrolled}`,
  );

  return finish();
}

async function finish() {
  // ------------------------------------------------------------- cleanup
  if (created.batchId) {
    try {
      const admin = await login("superadmin@grotutor.com");
      const del = await call("DELETE", `/batches/${created.batchId}`, { token: admin.token });
      console.log(`\n\x1b[2mcleanup: deleted test batch (status ${del.status})\x1b[0m`);
    } catch {
      console.log("\n\x1b[33mcleanup failed — remove the E2E batch by hand\x1b[0m");
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
