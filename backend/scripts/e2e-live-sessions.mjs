/**
 * End-to-end exercise of the live-sessions API against a RUNNING server.
 *
 *   node scripts/e2e-live-sessions.mjs
 *   API=http://127.0.0.1:6000 node scripts/e2e-live-sessions.mjs
 *
 * Covers: create -> list (pagination + filter) -> get -> update ->
 * learner registration (idempotent) -> joinUrl gating -> unregister ->
 * admin visibility -> soft-delete -> cleanup.
 *
 * Every fixture created is deleted at the end.
 * Exit code is non-zero if any assertion fails.
 */
import http from "node:http";

const API = process.env.API ?? "http://127.0.0.1:6000";
const PASSWORD = "Password123!";

const results = [];
const created = { sessionId: null };

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

const uniq = String(process.hrtime.bigint()).slice(-9);

async function main() {
  console.log(`\n\x1b[1mLive-sessions end-to-end\x1b[0m  ${API}\n`);

  console.log("\x1b[1mActors\x1b[0m");
  const admin = await login("superadmin@grotutor.com");
  record("superadmin logs in", !!admin.token);

  const instructor = await login("instructor1@grotutor.com");
  record("instructor1 logs in", !!instructor.token);

  const other = await login("instructor2@grotutor.com");
  record("instructor2 logs in", !!other.token);

  const learner = await login("learner1@example.com");
  record("learner1 logs in", !!learner.token);

  const learner2 = await login("learner2@example.com");
  record("learner2 logs in", !!learner2.token);

  console.log("\n\x1b[1mInstructor list (empty)\x1b[0m");
  const emptyList = await call("GET", "/live-sessions?page=1&limit=10&provider=all", {
    token: instructor.token,
  });
  record(
    "GET /live-sessions returns ResourcePage envelope",
    emptyList.status === 200 &&
      Array.isArray(emptyList.data?.data) &&
      typeof emptyList.data?.pagination?.total === "number",
    `status ${emptyList.status}`,
  );

  console.log("\n\x1b[1mSession creation\x1b[0m");
  const futureDate = new Date(Date.now() + 2 * 86400_000).toISOString();

  const mk = await call("POST", "/live-sessions", {
    token: instructor.token,
    body: {
      title: `E2E Live Session ${uniq}`,
      provider: "ZOOM",
      startsAt: futureDate,
      durationMinutes: 90,
      joinUrl: "https://zoom.us/j/e2e-test-" + uniq,
      status: "SCHEDULED",
    },
  });
  const sessionId = mk.data?.id ?? null;
  created.sessionId = sessionId;
  record(
    "instructor creates a ZOOM session",
    mk.status === 201 || mk.status === 200,
    `status ${mk.status}${sessionId ? "" : " — " + JSON.stringify(mk.data).slice(0, 200)}`,
  );
  if (!sessionId) {
    console.log("\n\x1b[31mCannot continue without a session id.\x1b[0m");
    return summarise();
  }

  const pastAttempt = await call("POST", "/live-sessions", {
    token: instructor.token,
    body: {
      title: "Past session",
      provider: "GOOGLE_MEET",
      startsAt: new Date(Date.now() - 3600_000).toISOString(),
      durationMinutes: 30,
    },
  });
  record(
    "creating a session with past startsAt is rejected",
    pastAttempt.status === 400,
    `status ${pastAttempt.status}`,
  );

  console.log("\n\x1b[1mProvider filter\x1b[0m");
  const zoomList = await call("GET", "/live-sessions?provider=ZOOM", {
    token: instructor.token,
  });
  const appearsInZoom =
    Array.isArray(zoomList.data?.data) &&
    zoomList.data.data.some((s) => s.id === sessionId);
  record(
    "session appears when filtering by provider=ZOOM",
    appearsInZoom,
    `status ${zoomList.status}`,
  );

  const jitsiList = await call("GET", "/live-sessions?provider=JITSI", {
    token: instructor.token,
  });
  const absentFromJitsi =
    Array.isArray(jitsiList.data?.data) &&
    !jitsiList.data.data.some((s) => s.id === sessionId);
  record(
    "session absent when filtering by provider=JITSI",
    absentFromJitsi,
    `status ${jitsiList.status}`,
  );

  console.log("\n\x1b[1mOwnership isolation\x1b[0m");
  const otherList = await call("GET", "/live-sessions", { token: other.token });
  const notVisibleToOther =
    Array.isArray(otherList.data?.data) &&
    !otherList.data.data.some((s) => s.id === sessionId);
  record(
    "instructor2 cannot see instructor1's session",
    notVisibleToOther,
    `status ${otherList.status}`,
  );

  const adminList = await call("GET", "/live-sessions", { token: admin.token });
  const visibleToAdmin =
    Array.isArray(adminList.data?.data) &&
    adminList.data.data.some((s) => s.id === sessionId);
  record(
    "admin sees the session in the list",
    visibleToAdmin,
    `status ${adminList.status}`,
  );

  const forbiddenGet = await call("GET", `/live-sessions/${sessionId}`, {
    token: other.token,
  });
  record(
    "instructor2 gets 403 fetching instructor1's session",
    forbiddenGet.status === 403,
    `status ${forbiddenGet.status}`,
  );

  console.log("\n\x1b[1mUpdate\x1b[0m");
  const patch = await call("PATCH", `/live-sessions/${sessionId}`, {
    token: instructor.token,
    body: { durationMinutes: 120 },
  });
  record(
    "instructor updates durationMinutes",
    patch.status === 200 && patch.data?.durationMinutes === 120,
    `status ${patch.status}`,
  );

  const statusPatch = await call("PATCH", `/live-sessions/${sessionId}`, {
    token: instructor.token,
    body: { status: "COMPLETED" },
  });
  record(
    "status COMPLETED is accepted and mapped to ENDED",
    statusPatch.status === 200 && statusPatch.data?.status === "ENDED",
    `status ${statusPatch.status}, db_status=${statusPatch.data?.status}`,
  );

  const revert = await call("PATCH", `/live-sessions/${sessionId}`, {
    token: instructor.token,
    body: { status: "SCHEDULED" },
  });
  record("reverted status to SCHEDULED for registration tests", revert.status === 200, `status ${revert.status}`);

  console.log("\n\x1b[1mLearner registration\x1b[0m");
  const reg1 = await call("POST", `/live-sessions/${sessionId}/register`, {
    token: learner.token,
  });
  record(
    "learner1 registers for the session",
    reg1.status === 201 || reg1.status === 200,
    `status ${reg1.status}`,
  );

  const reg2 = await call("POST", `/live-sessions/${sessionId}/register`, {
    token: learner.token,
  });
  record(
    "second registration by learner1 is idempotent (no 500)",
    reg2.status === 200 || reg2.status === 201,
    `status ${reg2.status}`,
  );
  record(
    "idempotent registration returns the same id",
    reg1.data?.id === reg2.data?.id,
    `first=${reg1.data?.id} second=${reg2.data?.id}`,
  );

  console.log("\n\x1b[1mjoinUrl gating (session starts in 2 days, outside window)\x1b[0m");
  const learnerView = await call("GET", `/live-sessions/${sessionId}/view`, {
    token: learner.token,
  });
  record(
    "learner sees session detail",
    learnerView.status === 200,
    `status ${learnerView.status}`,
  );
  record(
    "joinUrl is hidden for registered learner outside 30-min window",
    learnerView.status === 200 && learnerView.data?.joinUrl === null,
    `joinUrl=${learnerView.data?.joinUrl}`,
  );

  const unregLearnerView = await call("GET", `/live-sessions/${sessionId}/view`, {
    token: learner2.token,
  });
  record(
    "joinUrl is hidden for unregistered learner",
    unregLearnerView.status === 200 && unregLearnerView.data?.joinUrl === null,
    `joinUrl=${unregLearnerView.data?.joinUrl}`,
  );

  console.log("\n\x1b[1mjoinUrl gating (mark session LIVE)\x1b[0m");
  await call("PATCH", `/live-sessions/${sessionId}`, {
    token: instructor.token,
    body: { status: "LIVE" },
  });
  const liveView = await call("GET", `/live-sessions/${sessionId}/view`, {
    token: learner.token,
  });
  record(
    "joinUrl is exposed when session is LIVE and learner is registered",
    liveView.status === 200 && typeof liveView.data?.joinUrl === "string",
    `joinUrl=${liveView.data?.joinUrl}`,
  );
  const unregLiveView = await call("GET", `/live-sessions/${sessionId}/view`, {
    token: learner2.token,
  });
  record(
    "joinUrl still hidden for LIVE session if learner is NOT registered",
    unregLiveView.status === 200 && unregLiveView.data?.joinUrl === null,
    `joinUrl=${unregLiveView.data?.joinUrl}`,
  );

  await call("PATCH", `/live-sessions/${sessionId}`, {
    token: instructor.token,
    body: { status: "SCHEDULED" },
  });

  console.log("\n\x1b[1mUnregister\x1b[0m");
  const unreg = await call("DELETE", `/live-sessions/${sessionId}/register`, {
    token: learner.token,
  });
  record(
    "learner unregisters from session",
    unreg.status === 200,
    `status ${unreg.status}`,
  );

  console.log("\n\x1b[1mRegisteredCount in list\x1b[0m");
  const withCount = await call("GET", "/live-sessions?page=1&limit=50", {
    token: instructor.token,
  });
  const sessionRow = (withCount.data?.data ?? []).find((s) => s.id === sessionId);
  record(
    "registeredCount is present in list response",
    sessionRow !== undefined && typeof sessionRow.registeredCount === "number",
    `registeredCount=${sessionRow?.registeredCount}`,
  );
  record(
    "courseTitle is present in list response (null OK if no course)",
    sessionRow !== undefined && "courseTitle" in sessionRow,
    `courseTitle=${sessionRow?.courseTitle}`,
  );

  return summarise();
}

async function summarise() {
  if (created.sessionId) {
    try {
      const admin = await login("superadmin@grotutor.com");
      const del = await call("DELETE", `/live-sessions/${created.sessionId}`, {
        token: admin.token,
      });
      console.log(
        `\n\x1b[2mcleanup: soft-deleted test session (status ${del.status})\x1b[0m`,
      );
    } catch {
      console.log("\n\x1b[33mcleanup failed — remove the E2E session by hand\x1b[0m");
    }
  }

  const failed = results.filter((r) => !r.pass);
  console.log(
    `\n\x1b[1m${results.length - failed.length}/${results.length} checks passed\x1b[0m`,
  );
  if (failed.length) {
    console.log("\n\x1b[31mFailures:\x1b[0m");
    for (const f of failed) console.log(`  - ${f.name}  ${f.detail}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n\x1b[31mE2E aborted:\x1b[0m", err.message);
  summarise().finally(() => process.exit(1));
});
