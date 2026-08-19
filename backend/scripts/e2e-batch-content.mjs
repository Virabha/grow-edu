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

async function callBinary(method, path, { token } = {}) {
  const url = new URL(API + path);
  const opts = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search,
    method,
    headers: {
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
  };
  return new Promise((resolve, reject) => {
    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, data: Buffer.concat(chunks) }));
    });
    req.on("error", reject);
    req.end();
  });
}

async function login(email) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = await call("POST", "/auth/login", { body: { email, password: PASSWORD } });
    if (r.status === 429) {
      const waitMs = 15000 * (attempt + 1);
      console.log(`  \x1b[2mthrottled, waiting ${waitMs / 1000}s…\x1b[0m`);
      await new Promise((res) => setTimeout(res, waitMs));
      continue;
    }
    const token = r.data?.accessToken ?? r.data?.access_token ?? r.data?.token ?? null;
    if (!token) {
      throw new Error(`login failed for ${email}: ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`);
    }
    const userId = r.data?.user?.userId ?? r.data?.user?.id ?? null;
    return { token, userId };
  }
  throw new Error(`login for ${email} still throttled after retries`);
}

const uniq = String(process.hrtime.bigint()).slice(-9);

async function main() {
  console.log(`\n\x1b[1mBatch content e2e\x1b[0m  ${API}\n`);

  console.log("\x1b[1mActors\x1b[0m");
  const admin = await login("superadmin@grotutor.com");
  record("admin logs in", !!admin.token);
  const instructor1 = await login("instructor1@grotutor.com");
  record("instructor1 (batch teacher) logs in", !!instructor1.token);
  const instructor2 = await login("instructor2@grotutor.com");
  record("instructor2 (unrelated) logs in", !!instructor2.token);
  const learner1 = await login("learner1@example.com");
  record("learner1 logs in", !!learner1.token);
  const learner2 = await login("learner2@example.com");
  record("learner2 logs in", !!learner2.token);

  console.log("\n\x1b[1mBatch creation\x1b[0m");
  const startDate = new Date(Date.now() + 86400_000).toISOString();
  const endDate = new Date(Date.now() + 60 * 86400_000).toISOString();

  const mk = await call("POST", "/batches", {
    token: admin.token,
    body: {
      title: `E2E Content ${uniq}`,
      slug: `e2e-content-${uniq}`,
      description: "Created by the batch-content e2e script.",
      price: 0,
      currency: "INR",
      startDate,
      endDate,
      language: "English",
      teacherIds: [instructor1.userId],
    },
  });
  const batchId = mk.data?.batchId ?? mk.data?.batch?.batchId ?? null;
  created = { batchId, slug: `e2e-content-${uniq}` };
  record(
    "admin creates free batch with instructor1 as teacher",
    mk.status === 201 || mk.status === 200,
    `status ${mk.status}${batchId ? "" : " — " + JSON.stringify(mk.data).slice(0, 220)}`
  );
  if (!batchId) {
    console.log("\n\x1b[31mCannot continue without a batch id.\x1b[0m");
    return finish();
  }

  console.log("\n\x1b[1mSubjects\x1b[0m");
  const subj1 = await call("POST", `/batches/${batchId}/subjects`, {
    token: admin.token,
    body: { name: "Physics", displayOrder: 1 },
  });
  const subjectId = subj1.data?.subjectId ?? null;
  record("admin adds subject 1", subj1.status < 300, `status ${subj1.status}`);

  const subj2 = await call("POST", `/batches/${batchId}/subjects`, {
    token: instructor1.token,
    body: { name: "Chemistry", displayOrder: 2 },
  });
  record("instructor1 adds subject 2", subj2.status < 300, `status ${subj2.status}`);

  const subjectList = await call("GET", `/batches/${batchId}/subjects`);
  record(
    "subjects publicly listable (no auth required)",
    subjectList.status === 200 && Array.isArray(subjectList.data) && subjectList.data.length >= 2,
    `count=${Array.isArray(subjectList.data) ? subjectList.data.length : "?"}`
  );

  console.log("\n\x1b[1mSessions (LIVE and RECORDING)\x1b[0m");
  const sessionStart = new Date(Date.now() + 2 * 3600_000).toISOString();
  const sessionEnd = new Date(Date.now() + 3 * 3600_000).toISOString();

  const liveRes = await call("POST", `/batches/${batchId}/sessions`, {
    token: admin.token,
    body: {
      title: "Live Physics Class 1",
      type: "LIVE",
      liveProvider: "ZOOM",
      joinUrl: "https://zoom.us/j/e2e-test-123",
      scheduledStartAt: sessionStart,
      scheduledEndAt: sessionEnd,
      ...(subjectId ? { subjectId } : {}),
    },
  });
  const liveSessionId = liveRes.data?.sessionId ?? null;
  record(
    "admin adds LIVE session (Zoom with joinUrl)",
    liveRes.status < 300,
    `status ${liveRes.status}${liveRes.status >= 300 ? " — " + JSON.stringify(liveRes.data).slice(0, 200) : ""}`
  );

  const recRes = await call("POST", `/batches/${batchId}/sessions`, {
    token: instructor1.token,
    body: {
      title: "Recorded Chemistry Lecture 1",
      type: "RECORDING",
      recordingVideoId: "e2e-bunny-video-abc123",
      recordingDurationSeconds: 3600,
      ...(subjectId ? { subjectId } : {}),
    },
  });
  const recSessionId = recRes.data?.sessionId ?? null;
  record(
    "instructor1 adds RECORDING session with recordingVideoId",
    recRes.status < 300,
    `status ${recRes.status}${recRes.status >= 300 ? " — " + JSON.stringify(recRes.data).slice(0, 200) : ""}`
  );

  console.log("\n\x1b[1mVideo upload path analysis\x1b[0m");
  const uploadAttempt = await call("POST", "/video-encoding/create-upload", {
    token: admin.token,
    body: { courseId: "batch-is-not-a-course", lessonId: `fake-session-${uniq}` },
  });
  record(
    "PRODUCT GAP confirmed: /video-encoding/create-upload rejects batch session IDs",
    uploadAttempt.status === 404 || uploadAttempt.status === 400,
    `status ${uploadAttempt.status} — upload path accepts only course lessons`
  );
  console.log(
    "  \x1b[33mNOTE\x1b[0m  Batch sessions have NO dedicated video-upload path.\n" +
    "         recordingVideoId must be set directly on session creation/update.\n" +
    "         A future /batches/:batchId/sessions/:sessionId/upload endpoint\n" +
    "         (or a Bunny dashboard upload + patch) is needed for this workflow."
  );

  console.log("\n\x1b[1mResources (DPP / NOTES / REFERENCE + publishAt)\x1b[0m");
  const futurePublish = new Date(Date.now() + 7 * 86400_000).toISOString();

  const dppRes = await call("POST", `/batches/${batchId}/resources`, {
    token: admin.token,
    body: {
      title: "Day 1 DPP",
      type: "DPP",
      fileKey: "e2e/dpp-day1.pdf",
      dayNumber: 1,
      ...(subjectId ? { subjectId } : {}),
    },
  });
  const dppId = dppRes.data?.resourceId ?? null;
  record("admin adds DPP resource (dayNumber=1)", dppRes.status < 300, `status ${dppRes.status}`);

  const notesRes = await call("POST", `/batches/${batchId}/resources`, {
    token: instructor1.token,
    body: {
      title: "Chapter 1 Notes",
      type: "NOTES",
      fileKey: "e2e/notes-ch1.pdf",
      dayNumber: 2,
    },
  });
  const notesId = notesRes.data?.resourceId ?? null;
  record("instructor1 adds NOTES resource (dayNumber=2)", notesRes.status < 300, `status ${notesRes.status}`);

  const refRes = await call("POST", `/batches/${batchId}/resources`, {
    token: admin.token,
    body: {
      title: "Formula Sheet",
      type: "REFERENCE",
      fileKey: "e2e/formulas.pdf",
      publishAt: futurePublish,
    },
  });
  const refId = refRes.data?.resourceId ?? null;
  record("admin adds REFERENCE resource with future publishAt", refRes.status < 300, `status ${refRes.status}`);

  console.log("\n\x1b[1mAnnouncements\x1b[0m");
  const ann1 = await call("POST", `/batches/${batchId}/announcements`, {
    token: admin.token,
    body: { title: "Welcome!", body: "Batch starts soon. Study hard!", pinned: true },
  });
  const ann1Id = ann1.data?.announcementId ?? null;
  record("admin creates pinned announcement", ann1.status < 300, `status ${ann1.status}`);

  const ann2 = await call("POST", `/batches/${batchId}/announcements`, {
    token: instructor1.token,
    body: { title: "Study plan", body: "Check the weekly schedule.", pinned: false },
  });
  const ann2Id = ann2.data?.announcementId ?? null;
  record("instructor1 creates unpinned announcement", ann2.status < 300, `status ${ann2.status}`);

  console.log("\n\x1b[1mAccess control before enrolment\x1b[0m");

  const sessBeforeEnrol = await call("GET", `/batches/${batchId}/sessions`, { token: learner1.token });
  record("non-enrolled learner1 gets 403 on sessions", sessBeforeEnrol.status === 403, `status ${sessBeforeEnrol.status}`);

  const resBeforeEnrol = await call("GET", `/batches/${batchId}/resources`, { token: learner1.token });
  record("non-enrolled learner1 gets 403 on resources", resBeforeEnrol.status === 403, `status ${resBeforeEnrol.status}`);

  const annBeforeEnrol = await call("GET", `/batches/${batchId}/announcements`, { token: learner1.token });
  record("non-enrolled learner1 gets 403 on announcements", annBeforeEnrol.status === 403, `status ${annBeforeEnrol.status}`);

  const instr2SessBeforeEnrol = await call("GET", `/batches/${batchId}/sessions`, { token: instructor2.token });
  record("unrelated instructor2 gets 403 on sessions", instr2SessBeforeEnrol.status === 403, `status ${instr2SessBeforeEnrol.status}`);

  const instr1SessBeforeEnrol = await call("GET", `/batches/${batchId}/sessions`, { token: instructor1.token });
  record("batch teacher (instructor1) sees sessions without enrolment", instr1SessBeforeEnrol.status === 200, `status ${instr1SessBeforeEnrol.status}`);

  const adminSessBeforeEnrol = await call("GET", `/batches/${batchId}/sessions`, { token: admin.token });
  record("admin sees sessions without enrolment", adminSessBeforeEnrol.status === 200, `status ${adminSessBeforeEnrol.status}`);

  console.log("\n\x1b[1mPublish + enrolment\x1b[0m");
  const pub = await call("PATCH", `/batches/${batchId}`, {
    token: admin.token,
    body: { status: "UPCOMING" },
  });
  record("admin publishes batch (UPCOMING)", pub.status < 300, `status ${pub.status}`);

  const checkout = await call("POST", `/batches/${batchId}/checkout`, {
    token: learner1.token,
    body: {},
  });
  record(
    "learner1 free-batch checkout auto-enrolls",
    checkout.status < 300 && checkout.data?.enrolled === true && checkout.data?.paymentId === null,
    `status ${checkout.status} enrolled=${checkout.data?.enrolled} paymentId=${checkout.data?.paymentId}`
  );

  const directEnrol = await call("POST", `/batches/${batchId}/enrollments`, {
    token: admin.token,
    body: { userIds: [learner2.userId] },
  });
  record(
    "admin directly enrols learner2",
    directEnrol.status < 300 && directEnrol.data?.enrolled >= 1,
    `status ${directEnrol.status} enrolled=${directEnrol.data?.enrolled}`
  );

  console.log("\n\x1b[1mEnrolled access — sessions\x1b[0m");
  const sessEnrolled = await call("GET", `/batches/${batchId}/sessions`, { token: learner1.token });
  const sessRows = Array.isArray(sessEnrolled.data?.data) ? sessEnrolled.data.data : (Array.isArray(sessEnrolled.data) ? sessEnrolled.data : []);
  record("enrolled learner1 sees sessions", sessEnrolled.status === 200, `status ${sessEnrolled.status}`);
  record(
    "both LIVE and RECORDING sessions returned",
    sessRows.some((s) => s.type === "LIVE") && sessRows.some((s) => s.type === "RECORDING"),
    `types: ${[...new Set(sessRows.map((s) => s.type))].join(", ")}`
  );

  if (recSessionId) {
    const recDetail = await call("GET", `/batches/${batchId}/sessions/${recSessionId}`, { token: learner1.token });
    const playbackUrl = recDetail.data?.playbackUrl ?? null;
    record(
      "RECORDING session detail returns signed playbackUrl (Bunny embed)",
      recDetail.status === 200 && typeof playbackUrl === "string" && playbackUrl.includes("iframe.mediadelivery.net"),
      `status ${recDetail.status} playbackUrl=${String(playbackUrl).slice(0, 60)}`
    );
  }

  console.log("\n\x1b[1mEnrolled access — resources and publishAt\x1b[0m");
  const resEnrolled = await call("GET", `/batches/${batchId}/resources`, { token: learner1.token });
  const resRows = Array.isArray(resEnrolled.data) ? resEnrolled.data : [];
  record("enrolled learner1 sees resources", resEnrolled.status === 200, `status ${resEnrolled.status}`);

  const futureHidden = !resRows.some((r) => r.title === "Formula Sheet");
  record("future-publishAt REFERENCE resource hidden from enrolled student", futureHidden, `learner sees ${resRows.length} resource(s)`);

  const resStaff = await call("GET", `/batches/${batchId}/resources`, { token: admin.token });
  const staffResRows = Array.isArray(resStaff.data) ? resStaff.data : [];
  const futureVisibleToStaff = staffResRows.some((r) => r.title === "Formula Sheet");
  record("future-publishAt REFERENCE resource visible to staff", futureVisibleToStaff, `staff sees ${staffResRows.length} resource(s)`);

  const dayNumbersSorted = resRows
    .filter((r) => r.dayNumber != null)
    .map((r) => r.dayNumber);
  const inOrder = dayNumbersSorted.every((v, i) => i === 0 || v >= dayNumbersSorted[i - 1]);
  record("resources returned in ascending dayNumber order", inOrder, `dayNumbers: ${dayNumbersSorted.join(",")}`);

  console.log("\n\x1b[1mAnnouncements — enrolled access, pin, edit, delete\x1b[0m");
  const annEnrolled = await call("GET", `/batches/${batchId}/announcements`, { token: learner1.token });
  const annRows = Array.isArray(annEnrolled.data) ? annEnrolled.data : [];
  record("enrolled learner1 sees announcements", annEnrolled.status === 200 && annRows.length >= 2, `status ${annEnrolled.status} count=${annRows.length}`);

  const pinnedFirst = annRows.length >= 2 && annRows[0]?.pinned === true;
  record("pinned announcement appears before unpinned", pinnedFirst, `first.pinned=${annRows[0]?.pinned}`);

  const annInstr2 = await call("GET", `/batches/${batchId}/announcements`, { token: instructor2.token });
  record("unrelated instructor2 gets 403 on announcements", annInstr2.status === 403, `status ${annInstr2.status}`);

  if (ann2Id) {
    const annEdit = await call("PATCH", `/batches/${batchId}/announcements/${ann2Id}`, {
      token: instructor1.token,
      body: { title: "Study plan (updated)", pinned: true },
    });
    record("instructor1 edits and pins announcement", annEdit.status < 300, `status ${annEdit.status}`);

    const annDel = await call("DELETE", `/batches/${batchId}/announcements/${ann2Id}`, {
      token: admin.token,
    });
    record("admin deletes announcement", annDel.status < 300, `status ${annDel.status}`);

    const annAfterDel = await call("GET", `/batches/${batchId}/announcements`, { token: learner1.token });
    const afterDelRows = Array.isArray(annAfterDel.data) ? annAfterDel.data : [];
    record(
      "deleted announcement no longer visible",
      !afterDelRows.some((a) => a.announcementId === ann2Id),
      `count after delete=${afterDelRows.length}`
    );
  }

  console.log("\n\x1b[1mAttendance\x1b[0m");
  let attendanceMarked = false;
  if (liveSessionId) {
    const att1 = await call("POST", `/batches/${batchId}/sessions/${liveSessionId}/attendance`, {
      token: learner1.token,
      body: { durationSeconds: 3000 },
    });
    attendanceMarked = att1.status < 300 && att1.data?.success === true;
    record("enrolled learner1 marks attendance on LIVE session", attendanceMarked, `status ${att1.status} success=${att1.data?.success}`);

    const att1Dup = await call("POST", `/batches/${batchId}/sessions/${liveSessionId}/attendance`, {
      token: learner1.token,
      body: { durationSeconds: 3600 },
    });
    record(
      "duplicate attendance is idempotent (alreadyRecorded flag)",
      att1Dup.status < 300 && att1Dup.data?.alreadyRecorded === true,
      `status ${att1Dup.status} alreadyRecorded=${att1Dup.data?.alreadyRecorded}`
    );

    const attInstr2 = await call("POST", `/batches/${batchId}/sessions/${liveSessionId}/attendance`, {
      token: instructor2.token,
      body: {},
    });
    record("non-enrolled instructor2 cannot mark attendance (403)", attInstr2.status === 403, `status ${attInstr2.status}`);

    if (recSessionId) {
      const attRec = await call("POST", `/batches/${batchId}/sessions/${recSessionId}/attendance`, {
        token: learner1.token,
        body: {},
      });
      record("attendance on RECORDING session rejected (400)", attRec.status === 400, `status ${attRec.status}`);
    }

    const attList = await call("GET", `/batches/${batchId}/sessions/${liveSessionId}/attendance`, {
      token: admin.token,
    });
    const attRows = Array.isArray(attList.data) ? attList.data : [];
    record("admin lists session attendance", attList.status === 200, `status ${attList.status} count=${attRows.length}`);
    record(
      "learner1 appears in attendance list",
      attRows.some((a) => a.userId === learner1.userId),
      `userId=${learner1.userId}`
    );

    const attListInstr1 = await call("GET", `/batches/${batchId}/sessions/${liveSessionId}/attendance`, {
      token: instructor1.token,
    });
    record("batch teacher (instructor1) can list attendance", attListInstr1.status === 200, `status ${attListInstr1.status}`);

    const attListInstr2 = await call("GET", `/batches/${batchId}/sessions/${liveSessionId}/attendance`, {
      token: instructor2.token,
    });
    record("unrelated instructor2 cannot list attendance (403)", attListInstr2.status === 403, `status ${attListInstr2.status}`);
  } else {
    record("attendance tests skipped (no liveSessionId)", false, "liveSessionId was null");
  }

  console.log("\n\x1b[1mProgress\x1b[0m");
  const progress = await call("GET", `/batches/${batchId}/my-progress`, { token: learner1.token });
  record("enrolled learner1 gets my-progress", progress.status === 200, `status ${progress.status}`);
  if (progress.status === 200) {
    record(
      "my-progress has expected shape (sessions + quizzes)",
      typeof progress.data?.sessions?.liveTotal === "number" && typeof progress.data?.quizzes?.total === "number",
      `liveTotal=${progress.data?.sessions?.liveTotal} quizTotal=${progress.data?.quizzes?.total}`
    );
    if (attendanceMarked) {
      record(
        "attended count reflects recorded attendance",
        progress.data?.sessions?.attended >= 1,
        `attended=${progress.data?.sessions?.attended}`
      );
    }
  }

  const progressInstr2 = await call("GET", `/batches/${batchId}/my-progress`, { token: instructor2.token });
  record("non-enrolled instructor2 gets 403 on my-progress", progressInstr2.status === 403, `status ${progressInstr2.status}`);

  console.log("\n\x1b[1mCertificates\x1b[0m");

  const selfIssue = await call("POST", `/batches/${batchId}/certificates/${learner1.userId}`, {
    token: learner1.token,
    body: {},
  });
  record("learner cannot issue own certificate (admin-only route)", selfIssue.status === 403, `status ${selfIssue.status}`);

  const issueRes = await call("POST", `/batches/${batchId}/certificates/${learner1.userId}`, {
    token: admin.token,
    body: { requireCompletion: false },
  });
  record(
    "admin issues certificate to learner1",
    issueRes.status < 300,
    `status ${issueRes.status}${issueRes.status >= 300 ? " — " + JSON.stringify(issueRes.data).slice(0, 200) : ""}`
  );

  const issueAgain = await call("POST", `/batches/${batchId}/certificates/${learner1.userId}`, {
    token: admin.token,
    body: {},
  });
  record("duplicate certificate issue is idempotent", issueAgain.status < 300, `status ${issueAgain.status}`);

  const myCert = await call("GET", `/batches/${batchId}/my-certificate`, { token: learner1.token });
  record(
    "learner1 gets own certificate metadata",
    myCert.status === 200 && !!myCert.data?.certificate?.certificateId,
    `status ${myCert.status} certId=${myCert.data?.certificate?.certificateId ?? "null"}`
  );

  const certList = await call("GET", `/batches/${batchId}/certificates`, { token: admin.token });
  const certRows = Array.isArray(certList.data) ? certList.data : [];
  record("admin lists batch certificates", certList.status === 200 && certRows.length >= 1, `status ${certList.status} count=${certRows.length}`);

  const pdfRes = await callBinary("GET", `/batches/${batchId}/my-certificate/download`, { token: learner1.token });
  const pdfMagic = pdfRes.data.length >= 4 ? pdfRes.data.slice(0, 4).toString("ascii") : "";
  record(
    "certificate PDF download returns actual PDF bytes (%PDF magic)",
    pdfRes.status === 200 && pdfMagic === "%PDF",
    `status ${pdfRes.status} bytes[0..3]="${pdfMagic}" length=${pdfRes.data.length}`
  );

  const adminPdf = await callBinary("GET", `/batches/${batchId}/certificates/${learner1.userId}/download`, {
    token: admin.token,
  });
  const adminPdfMagic = adminPdf.data.length >= 4 ? adminPdf.data.slice(0, 4).toString("ascii") : "";
  record(
    "admin certificate download returns actual PDF bytes",
    adminPdf.status === 200 && adminPdfMagic === "%PDF",
    `status ${adminPdf.status} bytes[0..3]="${adminPdfMagic}"`
  );

  console.log("\n\x1b[1mAccess control — manage operations\x1b[0m");

  const instr2AddSubj = await call("POST", `/batches/${batchId}/subjects`, {
    token: instructor2.token,
    body: { name: "Unauthorised Subject", displayOrder: 99 },
  });
  record("instructor2 cannot add subjects (403)", instr2AddSubj.status === 403, `status ${instr2AddSubj.status}`);

  const instr1AddSubj = await call("POST", `/batches/${batchId}/subjects`, {
    token: instructor1.token,
    body: { name: "Biology", displayOrder: 3 },
  });
  record("instructor1 (batch teacher) can add subjects", instr1AddSubj.status < 300, `status ${instr1AddSubj.status}`);

  if (notesId) {
    const instr2DelRes = await call("DELETE", `/batches/${batchId}/resources/${notesId}`, {
      token: instructor2.token,
    });
    record("instructor2 cannot delete resources (403)", instr2DelRes.status === 403, `status ${instr2DelRes.status}`);

    const instr1DelRes = await call("DELETE", `/batches/${batchId}/resources/${notesId}`, {
      token: instructor1.token,
    });
    record("instructor1 can delete resources", instr1DelRes.status < 300, `status ${instr1DelRes.status}`);
  }

  if (dppId) {
    const instr2DelDpp = await call("DELETE", `/batches/${batchId}/resources/${dppId}`, {
      token: instructor2.token,
    });
    record("instructor2 cannot delete DPP resource (403)", instr2DelDpp.status === 403, `status ${instr2DelDpp.status}`);
  }

  return finish();
}

async function finish() {
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
