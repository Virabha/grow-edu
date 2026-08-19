import http from 'node:http';

const API = process.env.API ?? 'http://127.0.0.1:6000';
const PASSWORD = 'Password123!';

const results = [];
const created = { batchId: null, courseId: null, reviewId: null };
const actors = {
  admin: { token: null, userId: null },
  instructor1: { token: null, userId: null },
  instructor2: { token: null, userId: null },
  learner1: { token: null, userId: null },
  learner2: { token: null, userId: null },
  learner3: { token: null, userId: null },
};

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  const tag = pass ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  console.log(`  ${tag}  ${name}${detail ? `  \x1b[2m${detail}\x1b[0m` : ''}`);
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
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = await call('POST', '/auth/login', { body: { email, password: PASSWORD } });
    if (r.status === 429) {
      const waitMs = 15000 * (attempt + 1);
      console.log(`  \x1b[2mthrottled (${email}), waiting ${waitMs / 1000}s…\x1b[0m`);
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
  console.log(`\n\x1b[1mDoubts + Reviews end-to-end\x1b[0m  ${API}\n`);

  console.log('\x1b[1mActors\x1b[0m');
  const adminCreds = await login('superadmin@grotutor.com');
  actors.admin = adminCreds;
  record('admin logs in', !!adminCreds.token);

  const inst1Creds = await login('instructor1@grotutor.com');
  actors.instructor1 = inst1Creds;
  record('instructor1 logs in', !!inst1Creds.token);

  const inst2Creds = await login('instructor2@grotutor.com');
  actors.instructor2 = inst2Creds;
  record('instructor2 logs in', !!inst2Creds.token);

  const l1Creds = await login('learner1@example.com');
  actors.learner1 = l1Creds;
  record('learner1 logs in', !!l1Creds.token);

  const l2Creds = await login('learner2@example.com');
  actors.learner2 = l2Creds;
  record('learner2 logs in', !!l2Creds.token);

  const l3Creds = await login('learner3@example.com');
  actors.learner3 = l3Creds;
  record('learner3 logs in', !!l3Creds.token);

  const { admin, instructor1, instructor2, learner1, learner2, learner3 } = actors;

  // ================================================================ PART A
  console.log('\n\x1b[1mPart A — Doubts\x1b[0m');
  console.log('\n\x1b[1mSetup — batch\x1b[0m');

  const startDate = new Date(Date.now() + 86400_000).toISOString();
  const endDate = new Date(Date.now() + 30 * 86400_000).toISOString();

  const mkBatch = await call('POST', '/batches', {
    token: admin.token,
    body: {
      title: `E2E Doubts Batch ${uniq}`,
      slug: `e2e-doubts-batch-${uniq}`,
      description: 'Created by e2e-doubts-reviews script.',
      price: 0,
      capacity: 10,
      startDate,
      endDate,
      language: 'English',
      teacherIds: instructor1.userId ? [instructor1.userId] : [],
      status: 'UPCOMING',
    },
  });
  const batchId = mkBatch.data?.batchId ?? mkBatch.data?.batch?.batchId ?? null;
  created.batchId = batchId;
  record(
    'admin creates batch with instructor1 as teacher',
    mkBatch.status < 300 && !!batchId,
    `status ${mkBatch.status}${batchId ? '' : ' — ' + JSON.stringify(mkBatch.data).slice(0, 220)}`,
  );

  if (batchId) {
    const enrL1 = await call('POST', `/batches/${batchId}/enrollments`, {
      token: admin.token,
      body: { userIds: [learner1.userId] },
    });
    record('admin enrolls learner1 in batch', enrL1.status < 300, `status ${enrL1.status}`);

    const enrL2 = await call('POST', `/batches/${batchId}/enrollments`, {
      token: admin.token,
      body: { userIds: [learner2.userId] },
    });
    record('admin enrolls learner2 in batch', enrL2.status < 300, `status ${enrL2.status}`);

    console.log('\n\x1b[1mDoubts — core flow\x1b[0m');

    const mkDoubt = await call('POST', `/batches/${batchId}/doubts`, {
      token: learner1.token,
      body: { title: 'Why is the sky blue?', body: 'I do not understand Rayleigh scattering.' },
    });
    const doubtId = mkDoubt.data?.doubtId ?? null;
    record('enrolled student posts a doubt', mkDoubt.status < 300, `status ${mkDoubt.status}`);

    const doubtList = await call('GET', `/batches/${batchId}/doubts`, { token: learner1.token });
    const listRows = Array.isArray(doubtList.data) ? doubtList.data : (doubtList.data?.data ?? []);
    const firstRow = listRows.find((r) => r.doubtId === doubtId) ?? listRows[0];
    record(
      'doubt list returns author name (not a raw userId)',
      !!(firstRow?.author?.firstName),
      `firstName=${firstRow?.author?.firstName ?? 'MISSING'}`,
    );

    const instReply = doubtId
      ? await call('POST', `/batches/${batchId}/doubts/${doubtId}/replies`, {
          token: instructor1.token,
          body: { body: 'Rayleigh scattering causes shorter wavelengths to scatter more.' },
        })
      : { status: 0, data: null };
    const replyId1 = instReply.data?.replyId ?? null;
    record(
      'batch teacher replies to the doubt',
      instReply.status < 300,
      `status ${instReply.status}`,
    );

    const doubtAfterTeacher = doubtId
      ? await call('GET', `/batches/${batchId}/doubts/${doubtId}`, { token: learner1.token })
      : { data: null };
    record(
      'doubt status auto-transitions to ANSWERED after teacher reply',
      doubtAfterTeacher.data?.status === 'ANSWERED',
      `status=${doubtAfterTeacher.data?.status}`,
    );

    const studentReply = doubtId
      ? await call('POST', `/batches/${batchId}/doubts/${doubtId}/replies`, {
          token: learner2.token,
          body: { body: 'This helped me too, thanks!' },
        })
      : { status: 0, data: null };
    const replyId2 = studentReply.data?.replyId ?? null;
    record(
      'another enrolled student can also reply',
      studentReply.status < 300,
      `status ${studentReply.status}`,
    );

    const doubtWithReplies = doubtId
      ? await call('GET', `/batches/${batchId}/doubts/${doubtId}`, { token: learner1.token })
      : { data: null };
    const replyCount = Array.isArray(doubtWithReplies.data?.replies)
      ? doubtWithReplies.data.replies.length
      : 0;
    record('student sees all replies on their doubt', replyCount >= 2, `replies=${replyCount}`);

    console.log('\n\x1b[1mDoubts — access control\x1b[0m');

    const l3ListDoubts = await call('GET', `/batches/${batchId}/doubts`, { token: learner3.token });
    record(
      'non-enrolled student cannot read doubts',
      l3ListDoubts.status === 403,
      `status ${l3ListDoubts.status}`,
    );

    const l3PostDoubt = await call('POST', `/batches/${batchId}/doubts`, {
      token: learner3.token,
      body: { title: 'Sneaky post', body: 'I am not enrolled at all.' },
    });
    record(
      'non-enrolled student cannot post a doubt',
      l3PostDoubt.status === 403,
      `status ${l3PostDoubt.status}`,
    );

    const i2ReadDoubts = await call('GET', `/batches/${batchId}/doubts`, {
      token: instructor2.token,
    });
    record(
      'unrelated instructor (not in teacherIds) cannot read doubts',
      i2ReadDoubts.status === 403,
      `status ${i2ReadDoubts.status}`,
    );

    console.log('\n\x1b[1mDoubts — ownership\x1b[0m');

    const l1EditOwn = doubtId
      ? await call('PATCH', `/batches/${batchId}/doubts/${doubtId}`, {
          token: learner1.token,
          body: { title: 'Why is the sky blue? (edited)' },
        })
      : { status: 0 };
    record('student edits their own doubt', l1EditOwn.status < 300, `status ${l1EditOwn.status}`);

    const l2EditOther = doubtId
      ? await call('PATCH', `/batches/${batchId}/doubts/${doubtId}`, {
          token: learner2.token,
          body: { title: 'Hijacked title' },
        })
      : { status: 403 };
    record(
      'student cannot edit someone else\'s doubt',
      l2EditOther.status === 403,
      `status ${l2EditOther.status}`,
    );

    console.log('\n\x1b[1mDoubts — status transitions\x1b[0m');

    const closeDoubt = doubtId
      ? await call('PATCH', `/batches/${batchId}/doubts/${doubtId}`, {
          token: admin.token,
          body: { status: 'CLOSED' },
        })
      : { status: 0, data: null };
    record(
      'admin can close a doubt (ANSWERED → CLOSED)',
      closeDoubt.status < 300 && closeDoubt.data?.status === 'CLOSED',
      `status=${closeDoubt.data?.status}`,
    );

    console.log('\n\x1b[1mDoubts — reply deletion\x1b[0m');

    const delOwnReply = replyId1 && doubtId
      ? await call('DELETE', `/batches/${batchId}/doubts/${doubtId}/replies/${replyId1}`, {
          token: instructor1.token,
        })
      : { status: 0 };
    record(
      'reply author can delete their own reply',
      replyId1 ? delOwnReply.status < 300 : false,
      `status ${delOwnReply.status}`,
    );

    const delOtherReply = replyId2 && doubtId
      ? await call('DELETE', `/batches/${batchId}/doubts/${doubtId}/replies/${replyId2}`, {
          token: admin.token,
        })
      : { status: 0 };
    record(
      'admin (staff) can delete another user\'s reply',
      replyId2 ? delOtherReply.status < 300 : false,
      `status ${delOtherReply.status}`,
    );

    const delOwnDoubt = doubtId
      ? await call('DELETE', `/batches/${batchId}/doubts/${doubtId}`, { token: learner1.token })
      : { status: 0 };
    record(
      'student can delete their own doubt',
      delOwnDoubt.status < 300,
      `status ${delOwnDoubt.status}`,
    );
  }

  // ================================================================ PART B
  console.log('\n\x1b[1mPart B — Reviews\x1b[0m');
  console.log('\n\x1b[1mSetup — course\x1b[0m');

  const catList = await call('GET', '/categories');
  const categoryRows = Array.isArray(catList.data)
    ? catList.data
    : (catList.data?.data ?? []);
  const categoryId =
    categoryRows[0]?.categoryId ?? categoryRows[0]?.id ?? '5169eaf2-18a6-4902-8536-2546d927abc6';

  const mkCourse = await call('POST', '/courses', {
    token: instructor1.token,
    body: {
      title: `E2E Review Course ${uniq}`,
      slug: `e2e-review-course-${uniq}`,
      description: 'Created by e2e-doubts-reviews script for review lifecycle testing.',
      price: 0,
      categoryId,
    },
  });
  const courseId = mkCourse.data?.courseId ?? null;
  created.courseId = courseId;
  record(
    'instructor1 creates a test course',
    mkCourse.status < 300 && !!courseId,
    `status ${mkCourse.status}${courseId ? '' : ' — ' + JSON.stringify(mkCourse.data).slice(0, 200)}`,
  );

  if (!courseId) {
    console.log('\n\x1b[31mNo courseId — skipping reviews section.\x1b[0m');
    return finish();
  }

  const enrCL1 = await call('POST', '/enrollments/manual', {
    token: admin.token,
    body: { userId: learner1.userId, courseId },
  });
  record(
    'admin manually enrolls learner1 in the course',
    enrCL1.status < 300,
    `status ${enrCL1.status}`,
  );

  const enrCL3 = await call('POST', '/enrollments/manual', {
    token: admin.token,
    body: { userId: learner3.userId, courseId },
  });
  record(
    'admin manually enrolls learner3 in the course',
    enrCL3.status < 300,
    `status ${enrCL3.status}`,
  );

  console.log('\n\x1b[1mReviews — pre-review gates\x1b[0m');

  const reviewable = await call('GET', '/reviews/reviewable', { token: learner1.token });
  const reviewableList = Array.isArray(reviewable.data)
    ? reviewable.data
    : (reviewable.data?.data ?? []);
  const courseInReviewable = reviewableList.some((c) => c.courseId === courseId);
  record(
    'enrolled student sees the course in /reviews/reviewable',
    courseInReviewable,
    `found=${courseInReviewable}`,
  );

  const notEnrolledReview = await call('POST', '/reviews', {
    token: learner2.token,
    body: { courseId, rating: 4, body: 'Great course!' },
  });
  record(
    'non-enrolled student cannot post a review',
    notEnrolledReview.status === 403,
    `status ${notEnrolledReview.status}`,
  );

  const badRating = await call('POST', '/reviews', {
    token: learner1.token,
    body: { courseId, rating: 6, body: 'Too high rating test.' },
  });
  record(
    'rating > 5 is rejected with 400 (no raw DB error)',
    badRating.status === 400,
    `status ${badRating.status}`,
  );

  const zeroRating = await call('POST', '/reviews', {
    token: learner1.token,
    body: { courseId, rating: 0, body: 'Zero rating test.' },
  });
  record(
    'rating < 1 is rejected with 400 (no raw DB error)',
    zeroRating.status === 400,
    `status ${zeroRating.status}`,
  );

  console.log('\n\x1b[1mReviews — lifecycle\x1b[0m');

  const mkReview = await call('POST', '/reviews', {
    token: learner1.token,
    body: { courseId, rating: 4, body: 'Really enjoyed this course overall.' },
  });
  const reviewId = mkReview.data?.reviewId ?? null;
  created.reviewId = reviewId;
  record(
    'enrolled student creates a review (starts PENDING)',
    mkReview.status < 300 && mkReview.data?.status === 'PENDING',
    `status=${mkReview.data?.status}`,
  );

  const reviewableAfter = await call('GET', '/reviews/reviewable', { token: learner1.token });
  const reviewableListAfter = Array.isArray(reviewableAfter.data)
    ? reviewableAfter.data
    : (reviewableAfter.data?.data ?? []);
  record(
    'course disappears from /reviews/reviewable after submitting a review',
    !reviewableListAfter.some((c) => c.courseId === courseId),
    `stillThere=${reviewableListAfter.some((c) => c.courseId === courseId)}`,
  );

  const publicBefore = await call('GET', `/reviews?courseId=${courseId}`);
  const publicCountBefore =
    publicBefore.data?.pagination?.total ??
    (Array.isArray(publicBefore.data?.data) ? publicBefore.data.data.length : 0);
  record(
    'PENDING review is not publicly visible',
    publicCountBefore === 0,
    `count=${publicCountBefore}`,
  );

  const adminQueue = await call('GET', `/admin/reviews?status=PENDING&courseId=${courseId}`, {
    token: admin.token,
  });
  const adminRows = Array.isArray(adminQueue.data?.data) ? adminQueue.data.data : [];
  const inAdminQueue = adminRows.some((r) => r.reviewId === reviewId);
  record(
    'PENDING review appears in admin moderation queue',
    inAdminQueue,
    `found=${inAdminQueue}`,
  );

  const publishRes = reviewId
    ? await call('PATCH', `/admin/reviews/${reviewId}/status`, {
        token: admin.token,
        body: { status: 'PUBLISHED' },
      })
    : { status: 0, data: null };
  record(
    'admin publishes the review',
    publishRes.status < 300 && publishRes.data?.status === 'PUBLISHED',
    `status=${publishRes.data?.status}`,
  );

  const publicAfter = await call('GET', `/reviews?courseId=${courseId}`);
  const publicRows = Array.isArray(publicAfter.data?.data) ? publicAfter.data.data : [];
  const publishedInPublic = publicRows.some((r) => r.reviewId === reviewId);
  record(
    'PUBLISHED review is publicly visible',
    publishedInPublic,
    `found=${publishedInPublic}`,
  );

  const publicReviewRow = publicRows.find((r) => r.reviewId === reviewId);
  record(
    'public review includes reviewer name fields',
    !!(publicReviewRow?.reviewerFirstName),
    `reviewerFirstName=${publicReviewRow?.reviewerFirstName ?? 'MISSING'}`,
  );

  console.log('\n\x1b[1mReviews — instructor reply\x1b[0m');

  const instrReply = reviewId
    ? await call('POST', `/reviews/${reviewId}/reply`, {
        token: instructor1.token,
        body: { reply: 'Thank you for your kind words!' },
      })
    : { status: 0 };
  record(
    'course instructor replies to the review',
    instrReply.status < 300,
    `status ${instrReply.status}`,
  );

  const instrReply2 = reviewId
    ? await call('POST', `/reviews/${reviewId}/reply`, {
        token: instructor2.token,
        body: { reply: 'Piggybacking!' },
      })
    : { status: 403 };
  record(
    'unrelated instructor cannot reply to a review on another instructor\'s course',
    instrReply2.status === 403,
    `status ${instrReply2.status}`,
  );

  console.log('\n\x1b[1mReviews — moderation controls\x1b[0m');

  const editReview = reviewId
    ? await call('PATCH', `/reviews/${reviewId}`, {
        token: learner1.token,
        body: { body: 'Updated: still a great course, five stars on reflection.' },
      })
    : { status: 0, data: null };
  record(
    'editing a published review resets it to PENDING',
    editReview.status < 300 && editReview.data?.status === 'PENDING',
    `status=${editReview.data?.status}`,
  );

  const studentTryModerate = reviewId
    ? await call('PATCH', `/admin/reviews/${reviewId}/status`, {
        token: learner1.token,
        body: { status: 'PUBLISHED' },
      })
    : { status: 403 };
  record(
    'student cannot access admin moderation endpoint',
    studentTryModerate.status === 403,
    `status ${studentTryModerate.status}`,
  );

  const rejectRes = reviewId
    ? await call('PATCH', `/admin/reviews/${reviewId}/status`, {
        token: admin.token,
        body: { status: 'REJECTED' },
      })
    : { status: 0, data: null };
  record(
    'admin can reject a review',
    rejectRes.status < 300 && rejectRes.data?.status === 'REJECTED',
    `status=${rejectRes.data?.status}`,
  );

  console.log('\n\x1b[1mReviews — soft-delete and revival\x1b[0m');

  const delReview = reviewId
    ? await call('DELETE', `/reviews/${reviewId}`, { token: learner1.token })
    : { status: 0 };
  record(
    'student can soft-delete their own review',
    delReview.status < 300,
    `status ${delReview.status}`,
  );

  const reviewableAfterDel = await call('GET', '/reviews/reviewable', { token: learner1.token });
  const reviewableListAfterDel = Array.isArray(reviewableAfterDel.data)
    ? reviewableAfterDel.data
    : (reviewableAfterDel.data?.data ?? []);
  record(
    'course reappears in /reviews/reviewable after soft-delete',
    reviewableListAfterDel.some((c) => c.courseId === courseId),
    `found=${reviewableListAfterDel.some((c) => c.courseId === courseId)}`,
  );

  const reviveReview = await call('POST', '/reviews', {
    token: learner1.token,
    body: { courseId, rating: 5, body: 'On reflection this is a five-star course!' },
  });
  const revivedId = reviveReview.data?.reviewId ?? null;
  if (revivedId) created.reviewId = revivedId;
  record(
    'soft-deleted review can be re-created (revival, not 409)',
    reviveReview.status < 300 && reviveReview.data?.status === 'PENDING',
    `status=${reviveReview.data?.status}`,
  );

  record(
    'revival reuses the same row (same reviewId)',
    revivedId !== null && revivedId === reviewId,
    `original=${reviewId} revived=${revivedId}`,
  );

  const dupActiveReview = await call('POST', '/reviews', {
    token: learner1.token,
    body: { courseId, rating: 3, body: 'Duplicate active review attempt.' },
  });
  record(
    'creating a second active review returns 409',
    dupActiveReview.status === 409,
    `status ${dupActiveReview.status}`,
  );

  return finish();
}

async function finish() {
  console.log('\n\x1b[2mCleanup…\x1b[0m');
  try {
    const adminToken = actors.admin?.token;
    const learner1Token = actors.learner1?.token;

    if (learner1Token && created.reviewId) {
      await call('DELETE', `/reviews/${created.reviewId}`, { token: learner1Token }).catch(() => null);
    }

    if (created.courseId && adminToken) {
      await call('DELETE', `/courses/${created.courseId}`, { token: adminToken }).catch(() => null);
    }

    if (created.batchId && adminToken) {
      const del = await call('DELETE', `/batches/${created.batchId}`, { token: adminToken });
      console.log(`  \x1b[2mdeleted test batch (status ${del.status})\x1b[0m`);
    }

    if (created.courseId) {
      console.log(`  \x1b[2mdeleted test course ${created.courseId}\x1b[0m`);
    }
  } catch {
    console.log('  \x1b[33mcleanup failed — remove test data by hand\x1b[0m');
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n\x1b[1m${results.length - failed.length}/${results.length} checks passed\x1b[0m`);
  if (failed.length) {
    console.log('\n\x1b[31mFailures:\x1b[0m');
    for (const f of failed) console.log(`  - ${f.name}  ${f.detail}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\n\x1b[31mE2E aborted:\x1b[0m', err.message);
  finish().finally(() => process.exit(1));
});
