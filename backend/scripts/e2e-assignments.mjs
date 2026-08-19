/**
 * End-to-end exercise of the assignments API against a RUNNING server.
 *
 *   node scripts/e2e-assignments.mjs            (expects API on :6000)
 *   API=http://127.0.0.1:6000 node scripts/e2e-assignments.mjs
 *
 * Covers: create assignment -> publish -> submit (learner) -> grade (instructor)
 * -> resubmission enforcement -> late submission enforcement -> cleanup.
 *
 * Every fixture it creates is deleted at the end, so it is safe to re-run.
 * Exit code is non-zero if any assertion fails.
 */
import http from "node:http";

const API = process.env.API ?? "http://127.0.0.1:6000";
const PASSWORD = "Password123!";

const results = [];
const created = { assignmentId: null, courseId: null, submissionId: null, enrollmentId: null };

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
  console.log(`\n\x1b[1mAssignments end-to-end\x1b[0m  ${API}\n`);

  console.log("\x1b[1mActors\x1b[0m");
  const admin = await login("superadmin@grotutor.com");
  record("admin logs in", !!admin.token);
  const instructor = await login("instructor1@grotutor.com");
  record("instructor1 logs in", !!instructor.token);
  const instructor2 = await login("instructor2@grotutor.com");
  record("instructor2 logs in", !!instructor2.token);
  const learner1 = await login("learner1@example.com");
  record("learner1 logs in", !!learner1.token);
  const learner2 = await login("learner2@example.com");
  record("learner2 logs in", !!learner2.token);

  console.log("\n\x1b[1mPre-flight: resolve a course owned by instructor1\x1b[0m");
  const courseList = await call("GET", "/instructor/courses?limit=1", {
    token: instructor.token,
  });
  const courseId =
    courseList.data?.data?.[0]?.courseId ?? courseList.data?.[0]?.courseId ?? null;
  created.courseId = courseId;
  record(
    "instructor has at least one course",
    !!courseId,
    courseId ? `courseId ${courseId.slice(0, 12)}…` : JSON.stringify(courseList.data).slice(0, 200),
  );
  if (!courseId) {
    console.log("\n\x1b[31mCannot continue without a course.\x1b[0m");
    return finish();
  }

  console.log("\n\x1b[1mPre-flight: enrol learner1 in the course\x1b[0m");
  const enrolRes = await call("POST", "/enrollments/manual", {
    token: admin.token,
    body: { userId: learner1.userId, courseId },
  });
  const enrollmentId = enrolRes.data?.enrollmentId ?? enrolRes.data?.enrollment?.enrollmentId ?? null;
  created.enrollmentId = enrollmentId;
  record(
    "admin enrols learner1 in course (or already enrolled)",
    enrolRes.status < 300 || enrolRes.status === 409,
    `status ${enrolRes.status}`,
  );

  console.log("\n\x1b[1mAssignment CRUD\x1b[0m");

  const mk = await call("POST", "/assignments", {
    token: instructor.token,
    body: {
      title: `E2E Assignment ${uniq}`,
      courseId,
      instructions: "Submit a written answer.",
      submissionType: "TEXT",
      maxMarks: 100,
      passMarks: 40,
      allowResubmission: true,
      isPublished: false,
    },
  });
  const assignmentId = mk.data?.id ?? null;
  created.assignmentId = assignmentId;
  record(
    "instructor creates assignment",
    mk.status === 200 || mk.status === 201,
    `status ${mk.status}${assignmentId ? "" : " — " + JSON.stringify(mk.data).slice(0, 220)}`,
  );
  if (!assignmentId) {
    console.log("\n\x1b[31mCannot continue without an assignmentId.\x1b[0m");
    return finish();
  }

  const listBefore = await call(
    "GET",
    `/assignments?page=1&limit=10&submissionType=all`,
    { token: instructor.token },
  );
  const inList =
    Array.isArray(listBefore.data?.data) &&
    listBefore.data.data.some((a) => a.id === assignmentId);
  record("assignment appears in instructor list", inList, `status ${listBefore.status}`);
  const hasPagination =
    listBefore.data?.pagination?.page !== undefined &&
    listBefore.data?.pagination?.total !== undefined;
  record("list response has pagination envelope", hasPagination);

  const getOne = await call("GET", `/assignments/${assignmentId}`, {
    token: instructor.token,
  });
  record(
    "instructor fetches assignment by id",
    getOne.status === 200 && getOne.data?.id === assignmentId,
    `status ${getOne.status}`,
  );

  const patch = await call("PATCH", `/assignments/${assignmentId}`, {
    token: instructor.token,
    body: { title: `E2E Assignment ${uniq} (updated)` },
  });
  record(
    "instructor updates assignment title",
    patch.status === 200,
    `status ${patch.status}`,
  );

  console.log("\n\x1b[1mAccess control\x1b[0m");
  const otherGet = await call("GET", `/assignments/${assignmentId}`, {
    token: instructor2.token,
  });
  record(
    "instructor2 cannot see instructor1 assignment",
    otherGet.status === 403 || otherGet.status === 404,
    `status ${otherGet.status}`,
  );

  const adminGet = await call("GET", `/assignments/${assignmentId}`, {
    token: admin.token,
  });
  record("admin can see any assignment", adminGet.status === 200, `status ${adminGet.status}`);

  console.log("\n\x1b[1mPublish & learner submission\x1b[0m");
  const publish = await call("PATCH", `/assignments/${assignmentId}`, {
    token: instructor.token,
    body: { isPublished: true },
  });
  record("instructor publishes assignment", publish.status === 200, `status ${publish.status}`);

  const submitLearner = await call(
    "POST",
    `/assignments/${assignmentId}/submissions`,
    {
      token: learner1.token,
      body: { textAnswer: "My first answer to this assignment." },
    },
  );
  const submissionId = submitLearner.data?.id ?? null;
  created.submissionId = submissionId;
  record(
    "learner1 submits assignment",
    submitLearner.status === 200 || submitLearner.status === 201,
    `status ${submitLearner.status}${submissionId ? "" : " — " + JSON.stringify(submitLearner.data).slice(0, 200)}`,
  );

  const submitUnrolled = await call(
    "POST",
    `/assignments/${assignmentId}/submissions`,
    {
      token: learner2.token,
      body: { textAnswer: "I am not enrolled." },
    },
  );
  record(
    "unenrolled learner2 is rejected",
    submitUnrolled.status === 403,
    `status ${submitUnrolled.status}`,
  );

  console.log("\n\x1b[1mResubmission enforcement\x1b[0m");

  const noResubAssignment = await call("POST", "/assignments", {
    token: instructor.token,
    body: {
      title: `E2E NoResub ${uniq}`,
      courseId,
      submissionType: "TEXT",
      maxMarks: 50,
      passMarks: 20,
      allowResubmission: false,
      isPublished: true,
    },
  });
  const noResubId = noResubAssignment.data?.id ?? null;
  record(
    "creates no-resubmission assignment",
    noResubAssignment.status === 200 || noResubAssignment.status === 201,
    `status ${noResubAssignment.status}`,
  );

  if (noResubId) {
    const firstSub = await call(
      "POST",
      `/assignments/${noResubId}/submissions`,
      {
        token: learner1.token,
        body: { textAnswer: "First attempt." },
      },
    );
    record(
      "first submission to no-resub assignment succeeds",
      firstSub.status === 200 || firstSub.status === 201,
      `status ${firstSub.status}`,
    );

    const secondSub = await call(
      "POST",
      `/assignments/${noResubId}/submissions`,
      {
        token: learner1.token,
        body: { textAnswer: "Second attempt." },
      },
    );
    record(
      "second submission to no-resub assignment is rejected",
      secondSub.status === 400,
      `status ${secondSub.status}`,
    );

    await call("DELETE", `/assignments/${noResubId}`, { token: instructor.token });
  }

  console.log("\n\x1b[1mLate submission enforcement\x1b[0m");

  const pastDueAssignment = await call("POST", "/assignments", {
    token: instructor.token,
    body: {
      title: `E2E PastDue ${uniq}`,
      courseId,
      submissionType: "TEXT",
      maxMarks: 50,
      passMarks: 20,
      allowResubmission: false,
      isPublished: true,
      dueAt: new Date(Date.now() - 3600_000).toISOString(),
    },
  });
  const pastDueId = pastDueAssignment.data?.id ?? null;
  record(
    "creates past-due assignment",
    pastDueAssignment.status === 200 || pastDueAssignment.status === 201,
    `status ${pastDueAssignment.status}`,
  );

  if (pastDueId) {
    const lateSub = await call(
      "POST",
      `/assignments/${pastDueId}/submissions`,
      {
        token: learner1.token,
        body: { textAnswer: "Late answer." },
      },
    );
    record(
      "late submission is rejected (422)",
      lateSub.status === 422,
      `status ${lateSub.status}`,
    );

    await call("DELETE", `/assignments/${pastDueId}`, { token: instructor.token });
  }

  console.log("\n\x1b[1mGrading\x1b[0m");

  if (submissionId) {
    const grade = await call(
      "PATCH",
      `/assignments/${assignmentId}/submissions/${submissionId}/grade`,
      {
        token: instructor.token,
        body: { marks: 85, feedback: "Excellent work." },
      },
    );
    record(
      "instructor grades submission via nested route",
      grade.status === 200 && grade.data?.status === "GRADED",
      `status ${grade.status}`,
    );

    const gradeViaFlat = await call(
      "PATCH",
      `/assignment-submissions/${submissionId}`,
      {
        token: instructor.token,
        body: { marks: 90, feedback: "Updated feedback.", status: "GRADED" },
      },
    );
    record(
      "instructor grades via flat assignment-submissions route",
      gradeViaFlat.status === 200,
      `status ${gradeViaFlat.status}`,
    );

    const badMarks = await call(
      "PATCH",
      `/assignment-submissions/${submissionId}`,
      {
        token: instructor.token,
        body: { marks: 150 },
      },
    );
    record(
      "marks exceeding maxMarks are rejected",
      badMarks.status === 400,
      `status ${badMarks.status}`,
    );
  }

  console.log("\n\x1b[1mSubmissions views\x1b[0m");

  const subList = await call(
    "GET",
    `/assignments/${assignmentId}/submissions`,
    { token: instructor.token },
  );
  const hasSubData = Array.isArray(subList.data?.data);
  record(
    "per-assignment submissions list (staff)",
    subList.status === 200 && hasSubData,
    `status ${subList.status}`,
  );

  const flatList = await call("GET", "/assignment-submissions?limit=25", {
    token: instructor.token,
  });
  const hasFlatData = Array.isArray(flatList.data?.data);
  record(
    "flat assignment-submissions list (staff)",
    flatList.status === 200 && hasFlatData,
    `status ${flatList.status}`,
  );

  if (hasFlatData && flatList.data.data.length > 0) {
    const row = flatList.data.data[0];
    record(
      "flat list row has learnerName field",
      typeof row.learnerName === "string",
      `learnerName=${String(row.learnerName)}`,
    );
  }

  const resubmit = await call(
    "POST",
    `/assignments/${assignmentId}/submissions`,
    {
      token: learner1.token,
      body: { textAnswer: "My second (resubmitted) answer." },
    },
  );
  record(
    "learner1 resubmits (allowResubmission=true)",
    resubmit.status === 200 || resubmit.status === 201,
    `status ${resubmit.status} attempt=${resubmit.data?.attemptNo}`,
  );
  if (resubmit.status === 200 || resubmit.status === 201) {
    record(
      "second submission has attemptNo=2",
      resubmit.data?.attemptNo === 2,
      `attemptNo=${resubmit.data?.attemptNo}`,
    );
  }

  return finish();
}

async function finish() {
  try {
    const admin = await login("superadmin@grotutor.com");
    if (created.assignmentId) {
      const del = await call("DELETE", `/assignments/${created.assignmentId}`, {
        token: admin.token,
      });
      console.log(
        `\n\x1b[2mcleanup: deleted test assignment (status ${del.status})\x1b[0m`,
      );
    }
    if (created.enrollmentId) {
      const delEnrol = await call("DELETE", `/enrollments/${created.enrollmentId}`, {
        token: admin.token,
      });
      console.log(
        `\x1b[2mcleanup: removed test enrollment (status ${delEnrol.status})\x1b[0m`,
      );
    }
  } catch {
    console.log(
      "\n\x1b[33mcleanup failed — remove E2E fixtures by hand\x1b[0m",
    );
  }

  const failed = results.filter((r) => !r.pass);
  console.log(
    `\n\x1b[1m${results.length - failed.length}/${results.length} checks passed\x1b[0m`,
  );
  if (failed.length) {
    console.log("\n\x1b[31mFailures:\x1b[0m");
    for (const f of failed)
      console.log(`  - ${f.name}  ${f.detail}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n\x1b[31mE2E aborted:\x1b[0m", err.message);
  finish().finally(() => process.exit(1));
});
