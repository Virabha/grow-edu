import http from "node:http";

const API = process.env.API ?? "http://127.0.0.1:6000";
const PASSWORD = "Password123!";

const results = [];
const created = { batchId: null };

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

function summarise() {
  const failed = results.filter((r) => !r.pass);
  console.log(`\n\x1b[1m${results.length - failed.length}/${results.length} checks passed\x1b[0m`);
  if (failed.length) {
    console.log("\n\x1b[31mFailures:\x1b[0m");
    for (const f of failed) console.log(`  - ${f.name}  ${f.detail}`);
    process.exit(1);
  }
}

async function cleanup(adminToken) {
  if (!created.batchId) return;
  try {
    const del = await call("DELETE", `/batches/${created.batchId}`, { token: adminToken });
    console.log(`\n\x1b[2mcleanup: deleted test batch (status ${del.status})\x1b[0m`);
  } catch {
    console.log("\n\x1b[33mcleanup failed — remove the E2E batch by hand\x1b[0m");
  }
}

async function main() {
  console.log(`\n\x1b[1mBatch quizzes end-to-end\x1b[0m  ${API}\n`);

  console.log("\x1b[1mActors\x1b[0m");
  const admin = await login("superadmin@grotutor.com");
  record("admin logs in", !!admin.token);
  const learner1 = await login("learner1@example.com");
  record("learner1 logs in", !!learner1.token);
  const learner2 = await login("learner2@example.com");
  record("learner2 logs in", !!learner2.token);
  const learner3 = await login("learner3@example.com");
  record("learner3 logs in", !!learner3.token);

  console.log("\n\x1b[1mBatch setup\x1b[0m");
  const startDate = new Date(Date.now() + 86400_000).toISOString();
  const endDate = new Date(Date.now() + 30 * 86400_000).toISOString();

  const mk = await call("POST", "/batches", {
    token: admin.token,
    body: {
      title: `E2E Quiz Batch ${uniq}`,
      slug: `e2e-quiz-batch-${uniq}`,
      description: "Quiz e2e test batch.",
      price: 0,
      currency: "INR",
      startDate,
      endDate,
      language: "English",
    },
  });
  const batchId = mk.data?.batchId ?? mk.data?.batch?.batchId ?? null;
  created.batchId = batchId;
  record("admin creates batch", mk.status === 201 || mk.status === 200, `status ${mk.status}${batchId ? "" : " — " + JSON.stringify(mk.data).slice(0, 200)}`);
  if (!batchId) {
    console.log("\n\x1b[31mCannot continue without a batch id.\x1b[0m");
    const a2 = await login("superadmin@grotutor.com");
    return cleanup(a2.token).then(summarise);
  }

  const pub = await call("PATCH", `/batches/${batchId}`, {
    token: admin.token,
    body: { status: "UPCOMING" },
  });
  record("batch published", pub.status < 300, `status ${pub.status}`);

  const enroll12 = await call("POST", `/batches/${batchId}/enrollments`, {
    token: admin.token,
    body: { userIds: [learner1.userId, learner2.userId] },
  });
  record("admin enrols learner1 and learner2", enroll12.status < 300, `status ${enroll12.status}`);

  console.log("\n\x1b[1mQuiz authoring\x1b[0m");

  const qzCreate = await call("POST", `/batches/${batchId}/quizzes`, {
    token: admin.token,
    body: {
      title: `Quiz ${uniq}`,
      durationMinutes: 60,
      maxAttempts: 1,
      negativeMarkPercent: 0,
      passingPercent: 40,
      showLeaderboard: true,
      showSolutions: true,
    },
  });
  const quizId = qzCreate.data?.quizId ?? null;
  record("admin creates quiz", qzCreate.status < 300, `status ${qzCreate.status}`);
  if (!quizId) {
    console.log("\n\x1b[31mCannot continue without quizId.\x1b[0m");
    const a2 = await login("superadmin@grotutor.com");
    return cleanup(a2.token).then(summarise);
  }

  console.log("\n\x1b[1mQuestion validation — reject cases\x1b[0m");

  const rejMcqFewOpts = await call("POST", `/batches/${batchId}/quizzes/${quizId}/questions`, {
    token: admin.token,
    body: {
      order: 0,
      type: "MCQ_SINGLE",
      prompt: "Reject me: only one option",
      options: [{ id: "x", text: "only" }],
      correctAnswer: "x",
      marks: 1,
    },
  });
  record("MCQ with < 2 options is rejected", rejMcqFewOpts.status === 400, `status ${rejMcqFewOpts.status}`);

  const rejMcqBadAns = await call("POST", `/batches/${batchId}/quizzes/${quizId}/questions`, {
    token: admin.token,
    body: {
      order: 0,
      type: "MCQ_SINGLE",
      prompt: "Reject me: correctAnswer not an option id",
      options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
      correctAnswer: "c",
      marks: 1,
    },
  });
  record("MCQ_SINGLE correctAnswer not in option ids is rejected", rejMcqBadAns.status === 400, `status ${rejMcqBadAns.status}`);

  const rejMultiEmpty = await call("POST", `/batches/${batchId}/quizzes/${quizId}/questions`, {
    token: admin.token,
    body: {
      order: 0,
      type: "MCQ_MULTI",
      prompt: "Reject me: empty correctAnswer array",
      options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
      correctAnswer: [],
      marks: 1,
    },
  });
  record("MCQ_MULTI with empty correctAnswer array is rejected", rejMultiEmpty.status === 400, `status ${rejMultiEmpty.status}`);

  const rejMultiBadId = await call("POST", `/batches/${batchId}/quizzes/${quizId}/questions`, {
    token: admin.token,
    body: {
      order: 0,
      type: "MCQ_MULTI",
      prompt: "Reject me: unknown option id in correctAnswer",
      options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
      correctAnswer: ["a", "z"],
      marks: 1,
    },
  });
  record("MCQ_MULTI with unknown option id in correctAnswer is rejected", rejMultiBadId.status === 400, `status ${rejMultiBadId.status}`);

  const rejNumericBad = await call("POST", `/batches/${batchId}/quizzes/${quizId}/questions`, {
    token: admin.token,
    body: {
      order: 0,
      type: "NUMERICAL",
      prompt: "Reject me: non-numeric value",
      options: [],
      correctAnswer: "not-a-number",
      marks: 1,
    },
  });
  record("NUMERICAL with non-numeric correctAnswer is rejected", rejNumericBad.status === 400, `status ${rejNumericBad.status}`);

  console.log("\n\x1b[1mQuestion authoring — all three types\x1b[0m");

  const mcqSingleCreate = await call("POST", `/batches/${batchId}/quizzes/${quizId}/questions`, {
    token: admin.token,
    body: {
      order: 1,
      type: "MCQ_SINGLE",
      prompt: "Which is the capital of France?",
      options: [
        { id: "opt_paris", text: "Paris" },
        { id: "opt_berlin", text: "Berlin" },
        { id: "opt_madrid", text: "Madrid" },
        { id: "opt_rome", text: "Rome" },
      ],
      correctAnswer: "opt_paris",
      marks: 2,
      explanation: "Paris is the capital of France.",
    },
  });
  const q1Id = mcqSingleCreate.data?.questionId ?? null;
  record("creates MCQ_SINGLE question", mcqSingleCreate.status < 300, `status ${mcqSingleCreate.status}`);

  const mcqMultiCreate = await call("POST", `/batches/${batchId}/quizzes/${quizId}/questions`, {
    token: admin.token,
    body: {
      order: 2,
      type: "MCQ_MULTI",
      prompt: "Which of the following are prime numbers?",
      options: [
        { id: "opt_2", text: "2" },
        { id: "opt_3", text: "3" },
        { id: "opt_4", text: "4" },
        { id: "opt_5", text: "5" },
      ],
      correctAnswer: ["opt_2", "opt_3", "opt_5"],
      marks: 2,
      explanation: "2, 3, and 5 are prime numbers.",
    },
  });
  const q2Id = mcqMultiCreate.data?.questionId ?? null;
  record("creates MCQ_MULTI question", mcqMultiCreate.status < 300, `status ${mcqMultiCreate.status}`);

  const numericalCreate = await call("POST", `/batches/${batchId}/quizzes/${quizId}/questions`, {
    token: admin.token,
    body: {
      order: 3,
      type: "NUMERICAL",
      prompt: "What is the value of pi to two decimal places × 10? (range 31 ± 2)",
      options: [],
      correctAnswer: { value: 31.4, tolerance: 2 },
      marks: 3,
      explanation: "pi ≈ 3.14, so 3.14 × 10 = 31.4",
    },
  });
  const q3Id = numericalCreate.data?.questionId ?? null;
  record("creates NUMERICAL question with tolerance", numericalCreate.status < 300, `status ${numericalCreate.status}`);

  if (!q1Id || !q2Id || !q3Id) {
    console.log("\n\x1b[31mCannot continue without all question ids.\x1b[0m");
    const a2 = await login("superadmin@grotutor.com");
    return cleanup(a2.token).then(summarise);
  }

  console.log("\n\x1b[1mQuestion update revalidates shape\x1b[0m");

  const updateToNumericBad = await call("PATCH", `/batches/${batchId}/quizzes/${quizId}/questions/${q1Id}`, {
    token: admin.token,
    body: {
      type: "NUMERICAL",
      correctAnswer: "still-a-string",
    },
  });
  record("updating MCQ_SINGLE type to NUMERICAL rejects invalid correctAnswer", updateToNumericBad.status === 400, `status ${updateToNumericBad.status}`);

  const updateMultiEmptyArr = await call("PATCH", `/batches/${batchId}/quizzes/${quizId}/questions/${q2Id}`, {
    token: admin.token,
    body: { correctAnswer: [] },
  });
  record("updating MCQ_MULTI correctAnswer to empty array is rejected", updateMultiEmptyArr.status === 400, `status ${updateMultiEmptyArr.status}`);

  console.log("\n\x1b[1mPublish quiz\x1b[0m");

  const pubQuiz = await call("PATCH", `/batches/${batchId}/quizzes/${quizId}`, {
    token: admin.token,
    body: { publish: true },
  });
  record("admin publishes quiz", pubQuiz.status < 300, `status ${pubQuiz.status}`);

  console.log("\n\x1b[1mAnswer-key leakage — student-facing GET quiz\x1b[0m");

  const quizForStudent = await call("GET", `/batches/${batchId}/quizzes/${quizId}`, {
    token: learner1.token,
  });
  record("enrolled student can GET quiz", quizForStudent.status === 200, `status ${quizForStudent.status}`);

  const studentQuestions = quizForStudent.data?.questions ?? [];
  const leaksAnswers = studentQuestions.some(
    (q) => q.correctAnswer !== null && q.correctAnswer !== undefined
  );
  record(
    "GET quiz (student) does NOT expose correctAnswer",
    studentQuestions.length > 0 && !leaksAnswers,
    leaksAnswers
      ? `LEAK: correctAnswer present on ${studentQuestions.filter((q) => q.correctAnswer !== null && q.correctAnswer !== undefined).map((q) => q.type).join(", ")} question(s)`
      : `${studentQuestions.length} questions all have correctAnswer=null`
  );

  const leaksExplanation = studentQuestions.some(
    (q) => q.explanation !== null && q.explanation !== undefined
  );
  record(
    "GET quiz (student) does NOT expose explanation",
    studentQuestions.length > 0 && !leaksExplanation,
    leaksExplanation
      ? `LEAK: explanation present on some question(s)`
      : `all explanations are null`
  );

  console.log("\n\x1b[1mAttempt rules\x1b[0m");

  const nonEnrolledAttempt = await call("POST", `/batches/${batchId}/quizzes/${quizId}/attempts`, {
    token: learner3.token,
  });
  record("non-enrolled learner3 cannot start attempt", nonEnrolledAttempt.status === 403 || nonEnrolledAttempt.status === 400, `status ${nonEnrolledAttempt.status}`);

  const startL1 = await call("POST", `/batches/${batchId}/quizzes/${quizId}/attempts`, {
    token: learner1.token,
  });
  const attemptId = startL1.data?.attemptId ?? null;
  record("enrolled learner1 can start attempt", startL1.status < 300, `status ${startL1.status}`);

  if (!attemptId) {
    console.log("\n\x1b[31mCannot continue without attemptId.\x1b[0m");
    const a2 = await login("superadmin@grotutor.com");
    return cleanup(a2.token).then(summarise);
  }

  record("attempt status is IN_PROGRESS", startL1.data?.status === "IN_PROGRESS", `status=${startL1.data?.status}`);

  console.log("\n\x1b[1mAnswer-key leakage — GET attempt while IN_PROGRESS\x1b[0m");

  const attemptInProgress = await call("GET", `/batches/${batchId}/quizzes/${quizId}/attempts/${attemptId}`, {
    token: learner1.token,
  });
  record("GET attempt while IN_PROGRESS returns 200", attemptInProgress.status === 200, `status ${attemptInProgress.status}`);

  const attemptData = attemptInProgress.data ?? {};
  const hasCorrectAnswer = "correctAnswer" in attemptData;
  const hasExplanation = "explanation" in attemptData;
  record("GET attempt (IN_PROGRESS) does NOT expose correctAnswer", !hasCorrectAnswer, hasCorrectAnswer ? "correctAnswer field present in attempt response" : "correctAnswer absent");
  record("GET attempt (IN_PROGRESS) does NOT expose explanation", !hasExplanation, hasExplanation ? "explanation field present in attempt response" : "explanation absent");

  console.log("\n\x1b[1mAttempt cross-user protection\x1b[0m");

  const l2SubmitL1Attempt = await call(
    "POST",
    `/batches/${batchId}/quizzes/${quizId}/attempts/${attemptId}/submit`,
    {
      token: learner2.token,
      body: { answers: {} },
    }
  );
  record(
    "learner2 cannot submit learner1's attempt",
    l2SubmitL1Attempt.status === 404 || l2SubmitL1Attempt.status === 403,
    `status ${l2SubmitL1Attempt.status}`
  );

  console.log("\n\x1b[1mGrading — learner1 submits correct answers\x1b[0m");

  const l1Submit = await call(
    "POST",
    `/batches/${batchId}/quizzes/${quizId}/attempts/${attemptId}/submit`,
    {
      token: learner1.token,
      body: {
        answers: {
          [q1Id]: "opt_paris",
          [q2Id]: ["opt_2", "opt_3", "opt_5"],
          [q3Id]: 32,
        },
      },
    }
  );
  record("learner1 submits attempt", l1Submit.status < 300, `status ${l1Submit.status}`);
  record("attempt status is SUBMITTED", l1Submit.data?.status === "SUBMITTED", `status=${l1Submit.data?.status}`);
  record("correctCount is 3 (all correct)", l1Submit.data?.correctCount === 3, `correctCount=${l1Submit.data?.correctCount}`);
  record("wrongCount is 0", l1Submit.data?.wrongCount === 0, `wrongCount=${l1Submit.data?.wrongCount}`);
  const l1Score = Number(l1Submit.data?.score);
  const l1MaxScore = Number(l1Submit.data?.maxScore);
  record("score equals maxScore (all correct)", l1Score === l1MaxScore && l1MaxScore === 7, `score=${l1Score} maxScore=${l1MaxScore}`);

  console.log("\n\x1b[1mNUMERICAL tolerance\x1b[0m");
  record(
    "NUMERICAL answer 32 within tolerance 2 of 31.4 scored as correct",
    l1Submit.data?.correctCount === 3,
    `q3 value=31.4 tolerance=2, answer=32, |32-31.4|=0.6 ≤ 2`
  );

  console.log("\n\x1b[1mDouble-submit protection\x1b[0m");

  const doubleSubmit = await call(
    "POST",
    `/batches/${batchId}/quizzes/${quizId}/attempts/${attemptId}/submit`,
    {
      token: learner1.token,
      body: { answers: {} },
    }
  );
  record("second submit of same attempt is rejected", doubleSubmit.status === 400, `status ${doubleSubmit.status}`);

  console.log("\n\x1b[1mMax attempts limit\x1b[0m");

  const overLimit = await call("POST", `/batches/${batchId}/quizzes/${quizId}/attempts`, {
    token: learner1.token,
  });
  record("starting another attempt when maxAttempts=1 exhausted is rejected", overLimit.status === 400, `status ${overLimit.status}`);

  console.log("\n\x1b[1mGrading — learner2 submits (wrong MCQ_SINGLE, partial MCQ_MULTI, out-of-tolerance NUMERICAL)\x1b[0m");

  const startL2 = await call("POST", `/batches/${batchId}/quizzes/${quizId}/attempts`, {
    token: learner2.token,
  });
  const attemptL2Id = startL2.data?.attemptId ?? null;
  record("learner2 starts attempt", startL2.status < 300 && !!attemptL2Id, `status ${startL2.status}`);

  if (attemptL2Id) {
    const l2Submit = await call(
      "POST",
      `/batches/${batchId}/quizzes/${quizId}/attempts/${attemptL2Id}/submit`,
      {
        token: learner2.token,
        body: {
          answers: {
            [q1Id]: "opt_berlin",
            [q2Id]: ["opt_2"],
            [q3Id]: 40,
          },
        },
      }
    );
    record("learner2 submits attempt", l2Submit.status < 300, `status ${l2Submit.status}`);
    record("all wrong: correctCount is 0", l2Submit.data?.correctCount === 0, `correctCount=${l2Submit.data?.correctCount}`);
    record("all wrong: wrongCount is 3", l2Submit.data?.wrongCount === 3, `wrongCount=${l2Submit.data?.wrongCount}`);
    record(
      "MCQ_MULTI partial answer (only 1 of 3 correct) scores as wrong",
      l2Submit.data?.wrongCount === 3,
      "partial MCQ_MULTI is not partially credited; exact set match required"
    );
    record(
      "NUMERICAL answer 40 outside tolerance 2 of 31.4 scored as wrong",
      l2Submit.data?.wrongCount === 3,
      `|40-31.4|=8.6 > 2 → wrong`
    );
    const l2Score = Number(l2Submit.data?.score);
    record("learner2 score is 0 (no negative marks, all wrong)", l2Score === 0, `score=${l2Score}`);
  }

  console.log("\n\x1b[1mList my attempts\x1b[0m");

  const myAttempts = await call("GET", `/batches/${batchId}/quizzes/${quizId}/attempts`, {
    token: learner1.token,
  });
  record("GET my attempts returns 200", myAttempts.status === 200, `status ${myAttempts.status}`);
  const attemptsArr = Array.isArray(myAttempts.data) ? myAttempts.data : myAttempts.data?.data;
  record("learner1 has exactly 1 attempt", Array.isArray(attemptsArr) && attemptsArr.length === 1, `count=${Array.isArray(attemptsArr) ? attemptsArr.length : "?"}`);

  console.log("\n\x1b[1mLeaderboard\x1b[0m");

  const lb = await call("GET", `/batches/${batchId}/quizzes/${quizId}/leaderboard`, {
    token: learner1.token,
  });
  record("GET leaderboard returns 200", lb.status === 200, `status ${lb.status}`);

  const lbArr = Array.isArray(lb.data) ? lb.data : [];
  record("leaderboard has at least 2 entries", lbArr.length >= 2, `entries=${lbArr.length}`);

  const top = lbArr[0];
  record(
    "leaderboard rank 1 is learner1 (higher score)",
    top?.userId === learner1.userId,
    `rank1 userId=${top?.userId} learner1=${learner1.userId}`
  );

  const hasDisplayName = lbArr.every((e) => typeof e.name === "string" && e.name.length > 0);
  record("leaderboard entries expose display name not just userId", hasDisplayName, `sample name="${top?.name}"`);

  const rankIsOrdered = lbArr.every((e, i) => e.rank === i + 1);
  record("leaderboard rank is sequential 1, 2, …", rankIsOrdered, `ranks=${lbArr.map((e) => e.rank).join(",")}`);

  const scoresDescending =
    lbArr.length < 2 ||
    lbArr.every((e, i) => i === 0 || Number(e.score ?? 0) <= Number(lbArr[i - 1].score ?? 0));
  record("leaderboard is ordered by score descending", scoresDescending, `scores=${lbArr.map((e) => e.score).join(",")}`);

  console.log("\n\x1b[1mAdmin GET quiz (staff sees correctAnswer)\x1b[0m");

  const quizForAdmin = await call("GET", `/batches/${batchId}/quizzes/${quizId}`, {
    token: admin.token,
  });
  const adminQuestions = quizForAdmin.data?.questions ?? [];
  const adminSeesAnswers = adminQuestions.every(
    (q) => q.correctAnswer !== null && q.correctAnswer !== undefined
  );
  record("admin GET quiz includes correctAnswer for all questions", adminSeesAnswers, `adminSeesAnswers=${adminSeesAnswers}`);

  const a2 = await login("superadmin@grotutor.com");
  await cleanup(a2.token);
  summarise();
}

main().catch((err) => {
  console.error("\n\x1b[31mE2E aborted:\x1b[0m", err.message);
  login("superadmin@grotutor.com")
    .then((a) => cleanup(a.token))
    .finally(() => {
      summarise();
    });
});
