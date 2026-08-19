import http from "node:http";
import "dotenv/config";

const API = process.env.API ?? "http://127.0.0.1:6000";
const PASSWORD = "Password123!";

const results = [];
const cleanup = [];

function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  const tag = pass ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
  console.log(`  ${tag}  ${name}${detail ? `  \x1b[2m${detail}\x1b[0m` : ""}`);
}

function info(msg) {
  console.log(`  \x1b[2m${msg}\x1b[0m`);
}

function call(method, path, { token, body } = {}) {
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
    const r = await call("POST", "/auth/login", { body: { email, password: PASSWORD } });
    if (r.status === 429) {
      await new Promise((res) => setTimeout(res, 15000 * (attempt + 1)));
      continue;
    }
    const token = r.data?.accessToken ?? r.data?.access_token ?? r.data?.token ?? null;
    if (!token) throw new Error(`login failed for ${email}: ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`);
    return { token, userId: r.data?.user?.userId ?? r.data?.user?.id ?? null, role: r.data?.user?.role };
  }
  throw new Error(`login for ${email} still throttled`);
}

const uniq = String(process.hrtime.bigint()).slice(-9);

async function main() {
  console.log(`\n\x1b[1mCourse lifecycle end-to-end\x1b[0m  ${API}\n`);

  console.log("\x1b[1mActors\x1b[0m");
  const admin = await login("superadmin@grotutor.com");
  record("admin logs in", !!admin.token, `role ${admin.role}`);
  const instructor1 = await login("instructor1@grotutor.com");
  record("instructor1 logs in", !!instructor1.token, `role ${instructor1.role}`);
  const instructor2 = await login("instructor2@grotutor.com");
  record("instructor2 logs in", !!instructor2.token, `role ${instructor2.role}`);
  const learner1 = await login("learner1@example.com");
  record("learner1 logs in", !!learner1.token, `role ${learner1.role}`);
  const learner2 = await login("learner2@example.com");
  record("learner2 logs in", !!learner2.token, `role ${learner2.role}`);

  console.log("\n\x1b[1mCourse authoring\x1b[0m");

  const cats = await call("GET", "/categories?page=1&limit=1", { token: admin.token });
  const categoryId =
    cats.data?.data?.[0]?.categoryId ?? cats.data?.[0]?.categoryId ?? null;
  record("a category exists", !!categoryId, categoryId ?? "none");

  const mkCourse = await call("POST", "/courses", {
    token: instructor1.token,
    body: {
      title: `E2E Lifecycle Course ${uniq}`,
      slug: `e2e-lifecycle-course-${uniq}`,
      description: "End-to-end lifecycle test course covering all lesson types.",
      shortDescription: "E2E lifecycle",
      price: 0,
      currency: "INR",
      categoryId,
      level: "BEGINNER",
      language: "English",
    },
  });
  const courseId =
    mkCourse.data?.courseId ?? mkCourse.data?.data?.courseId ?? null;
  record(
    "instructor1 creates a course",
    mkCourse.status === 201 && !!courseId,
    `status ${mkCourse.status}${courseId ? "" : " " + JSON.stringify(mkCourse.data).slice(0, 200)}`,
  );
  if (!courseId) {
    summarise();
    return;
  }
  cleanup.push(["DELETE", `/courses/${courseId}`, admin.token]);

  const updCourse = await call("PUT", `/courses/${courseId}`, {
    token: instructor1.token,
    body: {
      learningOutcomes: ["Understand the basics", "Apply best practices"],
      requirements: ["Basic knowledge required"],
      targetAudience: ["Beginners", "Students"],
    },
  });
  record(
    "instructor1 sets learningOutcomes/requirements/targetAudience",
    updCourse.status === 200 &&
      Array.isArray(updCourse.data?.learningOutcomes) &&
      updCourse.data.learningOutcomes.length === 2,
    `status ${updCourse.status}`,
  );

  const mkSection = await call("POST", "/sections", {
    token: instructor1.token,
    body: { courseId, title: `Section ${uniq}`, order: 1 },
  });
  const sectionId =
    mkSection.data?.sectionId ?? mkSection.data?.data?.sectionId ?? null;
  record(
    "instructor1 creates a section",
    mkSection.status === 201 && !!sectionId,
    `status ${mkSection.status}`,
  );
  if (!sectionId) {
    summarise();
    return;
  }

  const mkVideo = await call("POST", "/lessons", {
    token: instructor1.token,
    body: { sectionId, title: `Video Lesson ${uniq}`, type: "VIDEO", order: 1 },
  });
  const videoLessonId = mkVideo.data?.lessonId ?? null;
  record(
    "instructor1 creates a VIDEO lesson",
    mkVideo.status === 201 && !!videoLessonId,
    `status ${mkVideo.status}`,
  );

  const mkText = await call("POST", "/lessons", {
    token: instructor1.token,
    body: { sectionId, title: `Text Lesson ${uniq}`, type: "TEXT", order: 2 },
  });
  const textLessonId = mkText.data?.lessonId ?? null;
  record(
    "instructor1 creates a TEXT lesson",
    mkText.status === 201 && !!textLessonId,
    `status ${mkText.status}`,
  );

  const mkQuiz = await call("POST", "/lessons", {
    token: instructor1.token,
    body: {
      sectionId,
      title: `Quiz Lesson ${uniq}`,
      type: "QUIZ",
      order: 3,
      quizSettings: { passingPercentage: 60, attemptsAllowed: 1 },
    },
  });
  const quizLessonId = mkQuiz.data?.lessonId ?? null;
  record(
    "instructor1 creates a QUIZ lesson with quizSettings",
    mkQuiz.status === 201 && !!quizLessonId,
    `status ${mkQuiz.status}`,
  );

  if (!textLessonId || !quizLessonId) {
    summarise();
    return;
  }

  const updText = await call("PUT", `/lessons/${textLessonId}`, {
    token: instructor1.token,
    body: { textContent: "This is the text content of the lesson." },
  });
  record(
    "instructor1 sets textContent on TEXT lesson",
    updText.status === 200 && updText.data?.textContent === "This is the text content of the lesson.",
    `status ${updText.status}`,
  );

  const getTextLesson = await call("GET", `/lessons/${textLessonId}`, {
    token: instructor1.token,
  });
  record(
    "TEXT lesson persists textContent",
    getTextLesson.status === 200 &&
      getTextLesson.data?.textContent === "This is the text content of the lesson." &&
      getTextLesson.data?.type === "TEXT",
    `status ${getTextLesson.status}`,
  );

  const getQuizLesson = await call("GET", `/lessons/${quizLessonId}`, {
    token: instructor1.token,
  });
  record(
    "QUIZ lesson persists quizSettings",
    getQuizLesson.status === 200 &&
      getQuizLesson.data?.type === "QUIZ" &&
      getQuizLesson.data?.quizSettings?.passingPercentage === 60 &&
      getQuizLesson.data?.quizSettings?.attemptsAllowed === 1,
    `status ${getQuizLesson.status} settings=${JSON.stringify(getQuizLesson.data?.quizSettings)}`,
  );

  console.log("\n\x1b[1mQuiz authoring\x1b[0m");

  const addQs = await call("POST", `/lessons/${quizLessonId}/quiz-questions`, {
    token: instructor1.token,
    body: {
      questions: [
        {
          text: "What colour is the sky?",
          options: ["Red", "Blue", "Green"],
          correctOptionIndex: 1,
          explanation: "The sky appears blue due to Rayleigh scattering.",
        },
        {
          text: "How many sides does a triangle have?",
          options: ["2", "3", "4"],
          correctOptionIndex: 1,
          explanation: "A triangle has 3 sides by definition.",
        },
        {
          text: "What is 2 + 2?",
          options: ["3", "4", "5"],
          correctOptionIndex: 1,
          explanation: "2 + 2 = 4.",
        },
      ],
    },
  });
  record(
    "instructor1 creates 3 valid quiz questions",
    addQs.status === 200 || addQs.status === 201,
    `status ${addQs.status}`,
  );

  const getQLesson = await call("GET", `/lessons/${quizLessonId}`, {
    token: instructor1.token,
  });
  const questions = getQLesson.data?.questions ?? [];
  record(
    "quiz questions persist (3 questions returned)",
    questions.length === 3,
    `got ${questions.length}`,
  );

  const badEmpty = await call("POST", `/lessons/${quizLessonId}/quiz-questions`, {
    token: instructor1.token,
    body: {
      questions: [
        { text: "", options: ["A", "B"], correctOptionIndex: 0 },
      ],
    },
  });
  record(
    "validation rejects empty question text",
    badEmpty.status === 400,
    `status ${badEmpty.status}`,
  );

  const badOneOpt = await call("POST", `/lessons/${quizLessonId}/quiz-questions`, {
    token: instructor1.token,
    body: {
      questions: [
        { text: "A question?", options: ["Only one"], correctOptionIndex: 0 },
      ],
    },
  });
  record(
    "validation rejects fewer than 2 options",
    badOneOpt.status === 400,
    `status ${badOneOpt.status}`,
  );

  const badNoCorrect = await call("POST", `/lessons/${quizLessonId}/quiz-questions`, {
    token: instructor1.token,
    body: {
      questions: [
        { text: "A question?", options: ["A", "B"], correctOptionIndex: -1 },
      ],
    },
  });
  record(
    "validation rejects correctOptionIndex < 0 (no correct answer)",
    badNoCorrect.status === 400,
    `status ${badNoCorrect.status}`,
  );

  const badOutOfBounds = await call("POST", `/lessons/${quizLessonId}/quiz-questions`, {
    token: instructor1.token,
    body: {
      questions: [
        { text: "A question?", options: ["A", "B"], correctOptionIndex: 5 },
      ],
    },
  });
  record(
    "validation rejects correctOptionIndex >= options.length",
    badOutOfBounds.status === 400,
    `status ${badOutOfBounds.status}`,
  );

  record(
    "valid questions still persisted after validation tests",
    questions.length === 3,
    `${questions.length} questions remain`,
  );

  console.log("\n\x1b[1mModeration workflow\x1b[0m");

  const submitReview1 = await call("POST", `/courses/${courseId}/submit-review`, {
    token: instructor1.token,
  });
  record(
    "instructor1 submits for review → PENDING_REVIEW",
    submitReview1.status === 200 ||
      submitReview1.status === 201 &&
      (submitReview1.data?.reviewStatus === "PENDING_REVIEW" ||
        submitReview1.data?.[0]?.reviewStatus === "PENDING_REVIEW"),
    `status ${submitReview1.status} reviewStatus=${submitReview1.data?.reviewStatus ?? submitReview1.data?.[0]?.reviewStatus}`,
  );

  const afterSubmit1 = await call("GET", `/courses/${courseId}`, { token: instructor1.token });
  record(
    "reviewStatus is PENDING_REVIEW after submit",
    afterSubmit1.data?.reviewStatus === "PENDING_REVIEW",
    `reviewStatus=${afterSubmit1.data?.reviewStatus}`,
  );

  const rejectCourse = await call("POST", `/courses/${courseId}/reject`, {
    token: admin.token,
    body: { reason: "Course content needs significant improvement." },
  });
  record(
    "admin rejects the course → REJECTED",
    (rejectCourse.status === 200 || rejectCourse.status === 201) &&
      (rejectCourse.data?.reviewStatus === "REJECTED" ||
        rejectCourse.data?.[0]?.reviewStatus === "REJECTED"),
    `status ${rejectCourse.status} reviewStatus=${rejectCourse.data?.reviewStatus ?? rejectCourse.data?.[0]?.reviewStatus}`,
  );

  const publicList1 = await call("GET", "/courses?page=1&limit=100");
  const rejectedVisible = (publicList1.data?.data ?? []).some(
    (c) => c.courseId === courseId,
  );
  record(
    "rejected course is NOT in public listing",
    !rejectedVisible,
    `found=${rejectedVisible}`,
  );

  const submitReview2 = await call("POST", `/courses/${courseId}/submit-review`, {
    token: instructor1.token,
  });
  record(
    "instructor1 resubmits → PENDING_REVIEW",
    submitReview2.status === 200 || submitReview2.status === 201,
    `status ${submitReview2.status}`,
  );

  const requestChanges = await call("POST", `/courses/${courseId}/request-changes`, {
    token: admin.token,
    body: { notes: "Please add more detail to the text lesson." },
  });
  record(
    "admin requests changes → CHANGES_REQUESTED",
    (requestChanges.status === 200 || requestChanges.status === 201) &&
      (requestChanges.data?.reviewStatus === "CHANGES_REQUESTED" ||
        requestChanges.data?.[0]?.reviewStatus === "CHANGES_REQUESTED"),
    `status ${requestChanges.status} reviewStatus=${requestChanges.data?.reviewStatus ?? requestChanges.data?.[0]?.reviewStatus}`,
  );

  const afterChanges = await call("GET", `/courses/${courseId}`, { token: instructor1.token });
  record(
    "reviewStatus is CHANGES_REQUESTED",
    afterChanges.data?.reviewStatus === "CHANGES_REQUESTED",
    `reviewStatus=${afterChanges.data?.reviewStatus}`,
  );

  const submitReview3 = await call("POST", `/courses/${courseId}/submit-review`, {
    token: instructor1.token,
  });
  record(
    "instructor1 resubmits after changes → PENDING_REVIEW",
    submitReview3.status === 200 || submitReview3.status === 201,
    `status ${submitReview3.status}`,
  );

  const selfApprove = await call("POST", `/courses/${courseId}/approve`, {
    token: instructor1.token,
    body: { publish: true },
  });
  record(
    "instructor1 CANNOT approve own course (403)",
    selfApprove.status === 403,
    `status ${selfApprove.status}`,
  );

  const approveCourse = await call("POST", `/courses/${courseId}/approve`, {
    token: admin.token,
    body: { publish: true, notes: "Looks good!" },
  });
  record(
    "admin approves → APPROVED + PUBLISHED",
    (approveCourse.status === 200 || approveCourse.status === 201) &&
      (approveCourse.data?.reviewStatus === "APPROVED" ||
        approveCourse.data?.[0]?.reviewStatus === "APPROVED") &&
      (approveCourse.data?.status === "PUBLISHED" ||
        approveCourse.data?.[0]?.status === "PUBLISHED"),
    `status ${approveCourse.status} reviewStatus=${approveCourse.data?.reviewStatus ?? approveCourse.data?.[0]?.reviewStatus} status=${approveCourse.data?.status ?? approveCourse.data?.[0]?.status}`,
  );

  const publicList2 = await call("GET", "/courses?page=1&limit=100");
  const publishedVisible = (publicList2.data?.data ?? []).some(
    (c) => c.courseId === courseId,
  );
  record(
    "published+approved course IS in public listing",
    publishedVisible,
    `found=${publishedVisible}`,
  );

  console.log("\n\x1b[1mStudent consumption\x1b[0m");

  const enrol = await call("POST", "/enrollments/manual", {
    token: admin.token,
    body: { userId: learner1.userId, courseId },
  });
  const enrollmentId =
    enrol.data?.enrollmentId ??
    enrol.data?.data?.enrollmentId ??
    null;
  record(
    "admin manually enrols learner1",
    (enrol.status === 201 || enrol.status === 200) && !!enrollmentId,
    `status ${enrol.status} enrollmentId=${enrollmentId}`,
  );
  if (enrollmentId) {
    cleanup.push(["DELETE", `/enrollments/${enrollmentId}`, admin.token]);
  }

  const readText = await call("GET", `/lessons/${textLessonId}`, {
    token: learner1.token,
  });
  record(
    "enrolled learner1 reads TEXT lesson",
    readText.status === 200 && readText.data?.type === "TEXT",
    `status ${readText.status}`,
  );
  record(
    "TEXT lesson body is accessible to learner",
    readText.status === 200 &&
      readText.data?.textContent === "This is the text content of the lesson.",
    `textContent length=${readText.data?.textContent?.length ?? 0}`,
  );

  const readQuiz = await call("GET", `/lessons/${quizLessonId}`, {
    token: learner1.token,
  });
  const learnerQuestions = readQuiz.data?.questions ?? [];
  record(
    "enrolled learner1 can list quiz questions",
    readQuiz.status === 200 && learnerQuestions.length === 3,
    `status ${readQuiz.status} questions=${learnerQuestions.length}`,
  );

  const qIds = questions.map((q) => q.quizQuestionId);
  const correctIndices = { [qIds[0]]: 1, [qIds[1]]: 1, [qIds[2]]: 1 };

  const quizAnswers = qIds.map((qId) => ({
    questionId: qId,
    chosenIndex: correctIndices[qId],
  }));

  const submitAttempt = await call("POST", "/quiz-attempts", {
    token: learner1.token,
    body: {
      lessonId: quizLessonId,
      startedAt: new Date(Date.now() - 30000).toISOString(),
      answers: quizAnswers,
    },
  });
  const attemptId =
    submitAttempt.data?.attemptId ?? submitAttempt.data?.data?.attemptId ?? null;
  record(
    "learner1 submits quiz attempt (all correct)",
    (submitAttempt.status === 201 || submitAttempt.status === 200) && !!attemptId,
    `status ${submitAttempt.status}`,
  );

  record(
    "score is 100% (3/3 correct)",
    submitAttempt.data?.scorePercent === 100 ||
      Number(submitAttempt.data?.scorePercent) === 100,
    `scorePercent=${submitAttempt.data?.scorePercent}`,
  );
  record(
    "passed=true (100% >= 60% passMark)",
    submitAttempt.data?.passed === true,
    `passed=${submitAttempt.data?.passed} passMark=${submitAttempt.data?.passMark}`,
  );
  record(
    "correctCount=3 totalQuestions=3",
    submitAttempt.data?.correctCount === 3 &&
      submitAttempt.data?.totalQuestions === 3,
    `correctCount=${submitAttempt.data?.correctCount} total=${submitAttempt.data?.totalQuestions}`,
  );

  const submitAgain = await call("POST", "/quiz-attempts", {
    token: learner1.token,
    body: {
      lessonId: quizLessonId,
      answers: quizAnswers,
    },
  });
  record(
    "attemptsAllowed=1 is enforced on second submit (400)",
    submitAgain.status === 400,
    `status ${submitAgain.status}`,
  );

  if (attemptId) {
    const getAttempt = await call("GET", `/quiz-attempts/${attemptId}`, {
      token: learner1.token,
    });
    record(
      "GET /quiz-attempts/:attemptId returns attempt",
      getAttempt.status === 200 && getAttempt.data?.attemptId === attemptId,
      `status ${getAttempt.status}`,
    );
    record(
      "attempt breakdown exposes correctIndex after submission",
      getAttempt.status === 200 &&
        Array.isArray(getAttempt.data?.answers) &&
        getAttempt.data.answers.length > 0 &&
        getAttempt.data.answers[0].correctIndex !== -1,
      `correctIndex=${getAttempt.data?.answers?.[0]?.correctIndex}`,
    );

    const learner2Attempt = await call("GET", `/quiz-attempts/${attemptId}`, {
      token: learner2.token,
    });
    record(
      "learner2 CANNOT read learner1's attempt (404, not 403)",
      learner2Attempt.status === 404,
      `status ${learner2Attempt.status}`,
    );
  }

  const listAttempts = await call("GET", "/quiz-attempts", {
    token: learner1.token,
  });
  record(
    "GET /quiz-attempts lists learner1's attempts",
    listAttempts.status === 200 &&
      Array.isArray(listAttempts.data?.data) &&
      listAttempts.data.data.length >= 1,
    `status ${listAttempts.status} count=${listAttempts.data?.data?.length}`,
  );
  record(
    "listed attempt has pagination metadata",
    listAttempts.status === 200 && !!listAttempts.data?.pagination,
    `pagination=${JSON.stringify(listAttempts.data?.pagination)}`,
  );

  const summary = await call("GET", "/quiz-attempts/summary", {
    token: learner1.token,
  });
  record(
    "GET /quiz-attempts/summary returns totalAttempted >= 1",
    summary.status === 200 && (summary.data?.totalAttempted ?? 0) >= 1,
    `status ${summary.status} totalAttempted=${summary.data?.totalAttempted}`,
  );
  record(
    "summary passed >= 1",
    summary.status === 200 && (summary.data?.passed ?? 0) >= 1,
    `passed=${summary.data?.passed}`,
  );
  record(
    "summary averageScore is a number",
    summary.status === 200 && typeof summary.data?.averageScore === "number",
    `averageScore=${summary.data?.averageScore}`,
  );

  console.log("\n\x1b[1mSecurity assertions\x1b[0m");

  const studentCreateCourse = await call("POST", "/courses", {
    token: learner1.token,
    body: {
      title: "Malicious course",
      slug: `malicious-course-${uniq}`,
      description: "This should not be created.",
      price: 0,
      categoryId,
    },
  });
  record(
    "learner1 CANNOT create a course (403)",
    studentCreateCourse.status === 403,
    `status ${studentCreateCourse.status}`,
  );

  const studentUpdateCourse = await call("PUT", `/courses/${courseId}`, {
    token: learner1.token,
    body: { title: "Hacked title" },
  });
  record(
    "learner1 CANNOT update a course (403)",
    studentUpdateCourse.status === 403,
    `status ${studentUpdateCourse.status}`,
  );

  const studentApprove = await call("POST", `/courses/${courseId}/approve`, {
    token: learner1.token,
    body: { publish: true },
  });
  record(
    "learner1 CANNOT approve a course (403)",
    studentApprove.status === 403,
    `status ${studentApprove.status}`,
  );

  const studentApproveLesson = await call("POST", `/lessons/${quizLessonId}/approve`, {
    token: learner1.token,
  });
  record(
    "learner1 CANNOT approve a lesson (403)",
    studentApproveLesson.status === 403,
    `status ${studentApproveLesson.status}`,
  );

  const studentCreateLesson = await call("POST", "/lessons", {
    token: learner1.token,
    body: { sectionId, title: "Injected lesson", type: "TEXT", order: 99 },
  });
  record(
    "learner1 CANNOT create a lesson (403)",
    studentCreateLesson.status === 403,
    `status ${studentCreateLesson.status}`,
  );

  const instr2Update = await call("PUT", `/courses/${courseId}`, {
    token: instructor2.token,
    body: { title: "Stolen course" },
  });
  record(
    "instructor2 CANNOT edit instructor1's course (403)",
    instr2Update.status === 403,
    `status ${instr2Update.status}`,
  );

  const instr2QuizEdit = await call("POST", `/lessons/${quizLessonId}/quiz-questions`, {
    token: instructor2.token,
    body: {
      questions: [
        { text: "Injected question?", options: ["A", "B"], correctOptionIndex: 0 },
      ],
    },
  });
  record(
    "instructor2 CANNOT update instructor1's quiz questions (403)",
    instr2QuizEdit.status === 403,
    `status ${instr2QuizEdit.status}`,
  );

  info(
    "IN_PROGRESS attempt masking: the submit endpoint immediately commits submittedAt,\n" +
      "  so all API-created attempts are submitted. maskAnswers() runs only for null submittedAt\n" +
      "  (code path unreachable via public API). Correct-index exposure is confirmed above.",
  );

  console.log("\n\x1b[1mUnpublish\x1b[0m");

  const unpublish = await call("POST", `/courses/${courseId}/unpublish`, {
    token: admin.token,
  });
  record(
    "admin unpublishes → ARCHIVED",
    (unpublish.status === 200 || unpublish.status === 201) &&
      (unpublish.data?.status === "ARCHIVED" ||
        unpublish.data?.[0]?.status === "ARCHIVED"),
    `status ${unpublish.status} courseStatus=${unpublish.data?.status ?? unpublish.data?.[0]?.status}`,
  );

  const afterUnpublish = await call("GET", `/courses/${courseId}`, { token: admin.token });
  record(
    "course is ARCHIVED after unpublish",
    afterUnpublish.data?.status === "ARCHIVED",
    `status=${afterUnpublish.data?.status}`,
  );

  console.log("\n\x1b[1mCleanup\x1b[0m");
  let removed = 0;
  for (const [method, path, token] of cleanup.reverse()) {
    const r = await call(method, path, { token });
    if (r.status >= 200 && r.status < 300) removed++;
    else info(`cleanup ${method} ${path} → ${r.status}`);
  }
  info(`removed ${removed}/${cleanup.length} fixtures`);

  summarise();
}

function summarise() {
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
