/**
 * End-to-end proof of the batch paid-enrolment path against a RUNNING server.
 *
 *   node scripts/e2e-batch-payment.mjs   (expects API on :6000)
 *
 * Covers:
 *   PAID BATCH  → checkout creates PENDING payment, no enrolment yet
 *               → second checkout reuses the same payment (no duplicate row)
 *               → upload proof → PROOF_UPLOADED
 *               → admin approve → COMPLETED + ACTIVE enrolment
 *               → student can read sessions & resources
 *               → batch appears in /batches/mine
 *
 *   FREE BATCH  → checkout immediately enrols (price 0, no payment step)
 *               → batch appears in /batches/mine
 *
 * Every fixture created here is deleted at the end — safe to re-run.
 * Exit code non-zero if any assertion fails.
 */
import http from "node:http";

const API = process.env.API ?? "http://127.0.0.1:6000";
const PASSWORD = "Password123!";

const results = [];
/** @type {{ paidBatchId: string|null, freeBatchId: string|null }} */
let created = { paidBatchId: null, freeBatchId: null };

function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  const tag = pass ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
  console.log(`  ${tag}  ${name}${detail ? `  \x1b[2m${detail}\x1b[0m` : ""}`);
}

async function call(method, path, { token, body } = {}) {
  // node:http, not fetch. Port 6000 is on the WHATWG blocked-ports list (X11),
  // so fetch() rejects with "bad port". The apps only work through Next's proxy.
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
        if (text) { try { data = JSON.parse(text); } catch { data = text; } }
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
        `login failed for ${email}: ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`
      );
    }
    const userId = r.data?.user?.userId ?? r.data?.user?.id ?? null;
    return { token, userId };
  }
  throw new Error(`login for ${email} still throttled after retries`);
}

const uniq = String(process.hrtime.bigint()).slice(-9);

async function main() {
  console.log(`\n\x1b[1mBatch payment end-to-end\x1b[0m  ${API}\n`);

  // ─── actors ───────────────────────────────────────────────────────────────
  console.log("\x1b[1mActors\x1b[0m");
  const admin = await login("superadmin@grotutor.com");
  record("admin logs in", !!admin.token);
  const student = await login("learner1@example.com");
  record("student logs in", !!student.token);

  // ─── create paid batch ────────────────────────────────────────────────────
  console.log("\n\x1b[1mSetup — paid batch\x1b[0m");
  const startDate = new Date(Date.now() + 86400_000).toISOString();
  const endDate = new Date(Date.now() + 30 * 86400_000).toISOString();

  const paidBatch = await call("POST", "/batches", {
    token: admin.token,
    body: {
      title: `E2E Payment Paid ${uniq}`,
      slug: `e2e-pay-paid-${uniq}`,
      description: "Paid batch for the payment e2e script.",
      price: 999,
      currency: "INR",
      capacity: 10,
      startDate,
      endDate,
      language: "English",
    },
  });
  const paidBatchId =
    paidBatch.data?.batchId ?? paidBatch.data?.batch?.batchId ?? null;
  created.paidBatchId = paidBatchId;
  record(
    "admin creates paid batch",
    paidBatch.status < 300 && !!paidBatchId,
    `status ${paidBatch.status}`
  );
  if (!paidBatchId) {
    console.log("\n\x1b[31mCannot continue without a paid batch id.\x1b[0m");
    return finish();
  }

  // Add a session and resource so access-control checks are meaningful
  const live = await call("POST", `/batches/${paidBatchId}/sessions`, {
    token: admin.token,
    body: {
      title: "Payment E2E Live Session",
      type: "LIVE",
      liveProvider: "GOOGLE_MEET",
      joinUrl: "https://meet.google.com/pay-e2e",
      scheduledStartAt: startDate,
      scheduledEndAt: endDate,
    },
  });
  record("adds a session to paid batch", live.status < 300, `status ${live.status}`);

  const resrc = await call("POST", `/batches/${paidBatchId}/resources`, {
    token: admin.token,
    body: { title: "Pay E2E notes", type: "NOTES", fileKey: "e2e/pay-notes.pdf" },
  });
  record("adds a resource to paid batch", resrc.status < 300, `status ${resrc.status}`);

  const pub = await call("PATCH", `/batches/${paidBatchId}`, {
    token: admin.token,
    body: { status: "UPCOMING" },
  });
  record("publishes paid batch", pub.status < 300, `status ${pub.status}`);

  // ─── create free batch ────────────────────────────────────────────────────
  console.log("\n\x1b[1mSetup — free batch\x1b[0m");
  const freeBatch = await call("POST", "/batches", {
    token: admin.token,
    body: {
      title: `E2E Payment Free ${uniq}`,
      slug: `e2e-pay-free-${uniq}`,
      description: "Free batch for the payment e2e script.",
      price: 0,
      currency: "INR",
      capacity: 10,
      startDate,
      endDate,
      language: "English",
    },
  });
  const freeBatchId =
    freeBatch.data?.batchId ?? freeBatch.data?.batch?.batchId ?? null;
  created.freeBatchId = freeBatchId;
  record(
    "admin creates free batch (price 0)",
    freeBatch.status < 300 && !!freeBatchId,
    `status ${freeBatch.status}`
  );

  if (freeBatchId) {
    const freePub = await call("PATCH", `/batches/${freeBatchId}`, {
      token: admin.token,
      body: { status: "UPCOMING" },
    });
    record("publishes free batch", freePub.status < 300, `status ${freePub.status}`);
  }

  // ─── paid enrolment path ──────────────────────────────────────────────────
  console.log("\n\x1b[1mPaid enrolment\x1b[0m");

  // Step 1: verify student cannot access content before enrolment
  const sessionsAnon = await call(
    "GET",
    `/batches/${paidBatchId}/sessions`,
    { token: student.token }
  );
  record(
    "student cannot read sessions before enrolment",
    sessionsAnon.status === 403 || sessionsAnon.status === 404,
    `status ${sessionsAnon.status}`
  );

  // Step 2: first checkout → PENDING payment, no enrolment
  const checkout1 = await call("POST", `/batches/${paidBatchId}/checkout`, {
    token: student.token,
    body: {},
  });
  const paymentId =
    checkout1.data?.paymentId ?? checkout1.data?.payment?.paymentId ?? null;
  record(
    "first checkout returns a paymentId",
    checkout1.status < 300 && !!paymentId,
    `status ${checkout1.status}${paymentId ? ` paymentId ${String(paymentId).slice(0, 12)}…` : " — " + JSON.stringify(checkout1.data).slice(0, 200)}`
  );
  record(
    "first checkout reports enrolled: false (no immediate enrolment for paid batch)",
    checkout1.data?.enrolled === false,
    `enrolled=${checkout1.data?.enrolled}`
  );

  // Step 3: second checkout must reuse the existing PENDING payment
  const checkout2 = await call("POST", `/batches/${paidBatchId}/checkout`, {
    token: student.token,
    body: {},
  });
  const paymentId2 =
    checkout2.data?.paymentId ?? checkout2.data?.payment?.paymentId ?? null;
  record(
    "second checkout does not return a 5xx",
    checkout2.status < 500,
    `status ${checkout2.status}`
  );
  record(
    "second checkout reuses the same paymentId (no duplicate PENDING row)",
    checkout2.status < 300 && paymentId2 === paymentId,
    `first=${String(paymentId).slice(0, 12)} second=${String(paymentId2).slice(0, 12)}`
  );

  if (!paymentId) {
    console.log("\n\x1b[31mCannot continue money path without a paymentId.\x1b[0m");
    return finish();
  }

  // Step 4: student uploads payment proof
  const txnId = `E2ETXN${uniq}`;
  const proof = await call(
    "POST",
    `/payments/${paymentId}/upload-proof`,
    {
      token: student.token,
      body: {
        proofUrl: "http://example.com/fake-proof.png",
        transactionId: txnId,
        payerName: "E2E Test Student",
      },
    }
  );
  record(
    "student uploads payment proof",
    proof.status < 300,
    `status ${proof.status}${proof.status >= 300 ? " — " + JSON.stringify(proof.data).slice(0, 200) : ""}`
  );
  record(
    "payment status is PROOF_UPLOADED after upload",
    proof.data?.status === "PROOF_UPLOADED",
    `status=${proof.data?.status}`
  );

  // Step 5: admin approves the payment
  const approve = await call(
    "POST",
    `/payments/${paymentId}/approve`,
    {
      token: admin.token,
      body: { notes: "E2E test approval" },
    }
  );
  record(
    "admin approves the payment",
    approve.status < 300 && approve.data?.success === true,
    `status ${approve.status}${approve.status >= 300 ? " — " + JSON.stringify(approve.data).slice(0, 200) : ""}`
  );

  // Step 6: after approval, student should be enrolled
  const sessionsAfter = await call(
    "GET",
    `/batches/${paidBatchId}/sessions`,
    { token: student.token }
  );
  record(
    "student can read sessions after payment approval",
    sessionsAfter.status === 200,
    `status ${sessionsAfter.status}`
  );

  const resourcesAfter = await call(
    "GET",
    `/batches/${paidBatchId}/resources`,
    { token: student.token }
  );
  record(
    "student can read resources after payment approval",
    resourcesAfter.status === 200,
    `status ${resourcesAfter.status}`
  );

  const mine = await call("GET", "/batches/mine", { token: student.token });
  const inMine = (() => {
    const rows = mine.data?.data ?? mine.data;
    return (
      Array.isArray(rows) &&
      rows.some((b) => (b.batchId ?? b.batch?.batchId) === paidBatchId)
    );
  })();
  record(
    "paid batch appears in student's /batches/mine after approval",
    inMine,
    `status ${mine.status}`
  );

  // Step 7: verify the payment record is now COMPLETED
  const paymentRecord = await call(`GET`, `/payments/my/${paymentId}`, {
    token: student.token,
  });
  record(
    "payment record shows status COMPLETED",
    paymentRecord.data?.status === "COMPLETED",
    `status=${paymentRecord.data?.status}`
  );

  // ─── free batch path ───────────────────────────────────────────────────────
  console.log("\n\x1b[1mFree enrolment\x1b[0m");

  if (!freeBatchId) {
    record("free batch checkout skipped (batch creation failed)", false, "");
  } else {
    const freeCheckout = await call(
      "POST",
      `/batches/${freeBatchId}/checkout`,
      { token: student.token, body: {} }
    );
    record(
      "free batch checkout succeeds",
      freeCheckout.status < 300,
      `status ${freeCheckout.status}${freeCheckout.status >= 300 ? " — " + JSON.stringify(freeCheckout.data).slice(0, 200) : ""}`
    );
    record(
      "free batch checkout immediately enrols (enrolled: true, no payment step)",
      freeCheckout.data?.enrolled === true,
      `enrolled=${freeCheckout.data?.enrolled}`
    );

    const mineFree = await call("GET", "/batches/mine", { token: student.token });
    const inMineFree = (() => {
      const rows = mineFree.data?.data ?? mineFree.data;
      return (
        Array.isArray(rows) &&
        rows.some((b) => (b.batchId ?? b.batch?.batchId) === freeBatchId)
      );
    })();
    record(
      "free batch appears in student's /batches/mine",
      inMineFree,
      `status ${mineFree.status}`
    );
  }

  return finish();
}

async function finish() {
  // ─── cleanup ──────────────────────────────────────────────────────────────
  if (created.paidBatchId || created.freeBatchId) {
    try {
      const admin = await login("superadmin@grotutor.com");
      for (const [label, id] of [
        ["paid", created.paidBatchId],
        ["free", created.freeBatchId],
      ]) {
        if (!id) continue;
        const del = await call("DELETE", `/batches/${id}`, { token: admin.token });
        console.log(
          `\n\x1b[2mcleanup: deleted ${label} batch (status ${del.status})\x1b[0m`
        );
      }
    } catch {
      console.log(
        "\n\x1b[33mcleanup failed — remove the E2E batches by hand\x1b[0m"
      );
    }
  }

  const failed = results.filter((r) => !r.pass);
  console.log(
    `\n\x1b[1m${results.length - failed.length}/${results.length} checks passed\x1b[0m`
  );
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
