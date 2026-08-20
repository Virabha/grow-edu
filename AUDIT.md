# groEdu — Codebase Audit & Phased Plan

**Date:** 2026-08-19
**Supersedes:** `REFACTOR_TODO.md` (2026-05-30, stale)
**Scope decided in:** grilling session 2026-08-19 — ~190 features across four roles
**Status:** audit complete, no code changed

---

## 1. Headline

The codebase is **not** in the state the brief described. Three corrections up front, because they change what the work actually is:

**The premise "the APIs and DB calls are not efficient" is mostly wrong.** I swept for the usual failure modes and the code defends against them:

- `courses.service.ts:195–220` batch-fetches then joins in memory via lookup maps — a deliberate N+1 avoidance, not an accident.
- `batches.service.ts:1147` uses `inArray` for bulk email lookup rather than a query per email.
- Every loop I flagged as suspicious (`batches.service.ts:1941, 2379, 2530, 2873`, `courses.service.ts:202, 213, 540, 654`) is in-memory iteration over already-fetched rows.
- `instructor.service.ts:93` caps page size at 100.
- The Drizzle `eq(col, null)` footgun is already fixed, with explanatory comments at `analytics.service.ts:39` and `dashboard.service.ts:202`.
- **Zero** `TODO`/`FIXME`/`HACK` markers across 356 backend files.

**The real problem is structural duplication, not inefficiency.** Two parallel implementations of the same product exist side by side, and that is what makes the codebase feel bloated and half-finished.

**The frontend is the larger half and was never mentioned.** Backend is 40,398 LOC; the two frontends are **67,776 LOC** (admin 45,075, learner 22,701) — 63% of the codebase, with duplicated API clients, hooks, stores, and utilities across two apps that share nothing.

---

## 2. The central defect: one product, built twice

| Concern | `courses` implementation | `batches` implementation |
|---|---|---|
| Sellable unit | `courses` | `batches` |
| Structure | `courseSections` → `lessons` | `batchSubjects` |
| Enrolment | `enrollments` | `batchEnrollments` |
| Quiz definition | *(none — questions hang off lessons)* | `batchQuizzes` |
| Questions | `quizQuestions` | `batchQuizQuestions` |
| Attempts | `lessonQuizAttempts` | `batchQuizAttempts` |
| Certificates | `certificateTemplates` | `batchCertificates` |
| Live sessions | `liveSessions` | `batchSessions` |
| Checkout | `/checkout` | `/batches/[slug]/checkout` |
| Learner page | `/my-courses` | `/my-batches` |

**Which engine wins is not a coin flip — `batches` is materially more advanced.**

`batchQuizzes` carries `durationMinutes`, `maxAttempts`, `negativeMarkPercent`, `passingPercent`, `showLeaderboard`, `showSolutions`, `opensAt`, `closesAt`, `publishedAt`. `batchQuizQuestions` supports three types (`MCQ_SINGLE`, `MCQ_MULTI`, `NUMERICAL`), per-question `marks`, and `explanation`. There is a working leaderboard with ranking at `batches.service.ts:2530` and scoring with negative marking at `2379`.

`quizQuestions` by contrast is `lessonId`, `question`, an `answers` jsonb of `{text, isCorrect}[]`, and `order`. Single-correct only. No marks, no types, no negative marking, no timing.

**Merge direction: `batches` is the base.** The one thing worth salvaging from the courses side is `lessonQuizAttempts.quizVersion` + `attemptNo` + the `(user, lesson, attemptNo)` unique constraint — attempt versioning that the batch engine lacks.

This single collapse removes ~6 tables, two API surfaces, two checkout flows, and two learner navigation trees.

---

## 3. Security & correctness findings

### S1 — Authorization is enforced in services, not declaratively. Unauditable.

`JwtAuthGuard` is global (`app.module.ts:120`), so every route is authenticated. But **role and ownership checks live in service methods**, passed down as `user.userId, user.role` string arguments. `sections.controller.ts` has five mutating endpoints and not one `@Roles` decorator; the checks are at `sections.service.ts:25, 62, 105, 152`.

This works, but you cannot tell from a controller whether a route is protected — you must read the service. Across 49 controllers and 358 endpoints that is not a reviewable position, and it is how F2 below survived.

**Fix:** consolidate into declarative guards + a policy layer. Every endpoint's authorization must be visible at its definition.

### S2 — Incomplete ownership check in section reorder *(real bypass)*

`sections.service.ts:133–156`. The code correctly identifies the attack in its own comment — *"an attacker could pass their own courseId while submitting another course's sectionIds"* — then implements a fix that only validates **one** section:

```ts
const [sectionRecord] = await this.db
  .select({ courseId: courseSections.courseId })
  .from(courseSections)
  .where(inArray(courseSections.sectionId, sectionIds))
  .limit(1);            // <-- one arbitrary row out of N
...
if (!course || course.instructorId !== userId) throw new ForbiddenException(...)
```

It then updates **every** submitted `sectionId` in the transaction. An instructor who submits `[ownSectionId, victimSectionId]` passes the check whenever the returned row is their own — ordering is not specified, so this is reachable, and trivially so by retrying.

**Impact:** cross-instructor section reordering. Vandalism, not data theft — but it is a genuine authorization bypass, and it is exactly the class of bug S1 makes invisible.

**Fix:** verify all `sectionIds` resolve to a single course the caller owns, not one of them.

### S3 — Suspension does not revoke live sessions

There is a `DeviceRevocationModule`, but nothing ties account suspension to token invalidation. A suspended user keeps their JWT until it expires. You listed "suspend anyone" as a core admin power; today it stops future logins, not current ones.

### S4 — Device tracking is cosmetic

`userDevices` records `deviceId`, `userAgent`, `ipAddress`, `lastSeenAt`, `revokedAt`. There is **no limit enforced anywhere** — no `maxDevices`, no `deviceLimit` constant, no check. You are selling seats to a college; nothing counts devices.

### S5 — Demo mode bypasses authentication, gated by a build-time flag

4,870 LOC of mock infrastructure across both frontends. `admin/src/components/providers.tsx:10` monkey-patches global `fetch` when `MOCKS_ENABLED`. The author was aware of the risk and documented it at `mock/index.ts` — *"the adapter... lets any password sign in, so it must never default to on"* — and gated it opt-in via `NEXT_PUBLIC_USE_MOCKS === "true"`.

The gating is correct. The residual risks are: it is a build-time constant, so a misconfigured build ships an auth-bypassed app; and it is 4,870 LOC of parallel API surface to maintain.

**Fixed 2026-08-21.** Both mock layers are deleted, along with the fetch monkey-patch and the axios adapter that installed them. There is no longer a build-time flag that can ship an auth-bypassed app.

### S6 — No audit log

No record of who suspended whom, approved which payment, edited what, or impersonated whom. With four roles and money moving, an unlogged admin action is unanswerable. You selected impersonation, which makes this mandatory rather than nice-to-have.

---

## 4. Schema audit — 66 tables

### Broken or missing keys

| Finding | Location | Impact |
|---|---|---|
| `batches.teacherIds` is `jsonb` string array | `schema/batches.ts` | No FK, no referential integrity, cannot express instructor roles, cannot efficiently answer "which batches does X teach" |
| `payments` has **no** `companyId` | `schema/commerce.ts` | A corporate payment cannot be recorded against a company — the exact flow your deadline depends on |
| `payments` has **no** `batchId` | `payment.service.ts:830` | Batch purchases hide `batchId` inside a jsonb `metadata` blob. No FK, no index. "Who paid for batch X" requires a full scan with JSON extraction |
| `enrollments.courseId` is `NOT NULL` | `schema/store.ts` | Corporate enrolment can only ever point at a course, never a batch |
| `companies` is 4 columns | `schema/companies.ts` | `name`, `email`, `phone`, `address`. No seats, no contract, no status, no dates, no billing link. It is a label, not a customer account |

### Global uniques that block later multi-tenancy

`courses.slug`, `batches.slug`, `payments.invoiceNo`, `payments.idempotencyKey`, coupon codes. All must become composite on `organization_id` while the database is still empty.

### Content model gaps

`lessonTypeEnum` is `VIDEO | TEXT | QUIZ` only. No PDF, no audio, no document, no live, no assignment, no coding type — all of which you selected.

### Dead schema

`src/tenancy/` — `schema.ts`, `context.ts`, `client.ts`, `permissions.ts`, `host.ts`, `tenant.ts` plus tests. `TenancyModule` does not exist and nothing imports it. `permissions.ts` holds a hand-authored organization permission catalogue built for `[D-039]` that no code can reach. It currently reads as though tenant isolation exists. It does not.

---

## 5. Module verdicts

**Legend:** KEEP = works, carries forward · FIX = works, needs correction · MERGE = collapses into another · DELETE = removed · NEW = does not exist

| Module | LOC | Endpoints | Tests | Verdict |
|---|--:|--:|:--:|---|
| `batches` | 4,863 | 58 | yes | **KEEP — becomes the core.** Largest and most complete module. Split: 2,899-LOC service is a god object |
| `courses` | 1,303 | 11 | yes | **MERGE into batches.** Salvage attempt versioning |
| `cms` | 1,601 | 44 | no | **KEEP.** Spared from the cut. Page-builder depth assessed in §6 |
| `coupons` | 1,104 | 8 | no | **DELETE.** Pricing decided: corporate custom + early-bird, no codes |
| `lookups` | 1,083 | 20 | yes | **DELETE.** Currencies (INR only), locations, languages, badges — three tables serving no decision made |
| `payment` | 987 | 11 | yes | **FIX.** Add `companyId` + `batchId`. Razorpay dead behind `:720`. Refunds have columns, no logic |
| `orders` | 808 | 6 | yes | **FIX.** Overlaps `payment` and `enrollments` |
| `enrollments` | 770 | 8 | no | **MERGE.** Becomes one enrolment model with `batchEnrollments` |
| `blog` | 798 | 12 | yes | **KEEP.** Reversed — you selected SEO pages |
| `reviews` | 724 | 9 | yes | **DELETE.** Replaced by lightweight session ratings |
| `settings` | 711 | 2 | no | **KEEP + EXTEND.** Becomes feature flags + business rules |
| `admin-resources` | 707 | 15 | yes | **PARTIAL DELETE.** Badges/brands/social-links go with lookups and CMS trim |
| `dashboard` | 610 | 1 | yes | **FIX.** Rebuild on merged model |
| `books` | 608 | 10 | no | **DELETE** |
| `announcements` | 554 | 8 | yes | **KEEP.** Becomes targeted broadcast |
| `analytics` | 540 | 8 | no | **FIX.** Rebuild for the reporting you selected |
| `payouts` | 497 | 7 | yes | **DELETE.** You employ instructors directly |
| `assignments` | 504 | 10 | yes | **KEEP.** Becomes the unified submission+grading model |
| `teacher-applications` | 395 | 5 | no | **DELETE** |
| `withdraw-methods` | 289 | 5 | yes | **DELETE** |
| `subscribers` | 278 | 5 | yes | **DELETE** |
| `companies` | 255 | 5 | no | **REWRITE.** Becomes contracts + seats + roster |
| `certificate-template` | 170 | 2 | yes | **KEEP.** Merges with `batchCertificates` |
| `contact` | 104 | 1 | no | **DELETE** |
| `subscribe` | 81 | 1 | no | **DELETE** |
| `tenancy` | — | 0 | yes | **DELETE.** Unreachable |
| `live-sessions` | — | 9 | yes | **MERGE** with `batchSessions` |
| `quiz-attempts` | — | 4 | yes | **MERGE** into one engine |
| `sections`, `lessons` | — | 14 | partial | **MERGE + FIX S2** |

**Deletion total: ~3,800 backend LOC across 10 modules, plus `tenancy`, plus ~9 admin sections.**

---

## 6. What does not exist at all

You selected ~190 features. These are the subsystems with **zero** implementation today — not partial, not broken, absent:

**Infrastructure:** job queue and scheduler (no BullMQ, no Redis, no cron — eight-plus selected features are impossible without it) · caching layer · structured logging · uptime monitoring · tested backups · CI pipeline · staging environment · audit log

**Assessment:** central question bank with topic + difficulty tagging · bulk question import · auto-generated tests · question groups (passage sets) · subjective/image answers · rubric grading · bulk grading queue · regrade workflow · exam UX (palette, save-resume, sectional timers) · results analysis · weak-topic mapping · error notebook · adaptive difficulty · spaced repetition

**Coding track:** code execution judge · Monaco editor · problem/test-case authoring · submission model · cloud dev environments · project briefs and milestones · automated repo checks · plagiarism detection · learning paths · skill maps · portfolios

**Corporate:** contracts · seat pools · seat allocation and reclaim · join links · roster management · sub-groups · corporate reporting · scheduled reports · SSO · LMS API

**Student experience:** video player (no library installed — bare `<video>`) · transcripts · PDF viewer/annotation · PWA · web push · study tools · gamification · community feed and groups · catalogue search · certificates delivery

**AI layer:** everything — doubt answering, code review, content generation, study plans, lecture summaries

**Admin:** approval queue surface (`PENDING_APPROVAL` exists in the enum, nothing renders it) · version history · batch cloning · waitlists · student transfers · lifecycle automation · moderation queue · image moderation · 2FA · session management · privacy export/deletion · report builder · GST invoicing

**Realistic assessment: ~25 new subsystems.** This is why the honest estimate is 12–18 months solo, not four weeks.

---

## 7. Phased plan

Phase 1 ends at your mid-September target. Everything after is sequenced by dependency — each phase unblocks the next.

### Phase 1 — Foundation · 2026-08-19 → 2026-09-16 (4 weeks)

**This phase is mostly structural.** It is the phase that makes every later phase possible, and it is the one where your college contract path becomes real.

1. Execute the cut list — delete 10 modules + `tenancy` + ~9 admin sections (~3,800 backend LOC)
2. Collapse `batches` + `courses` into one product with a live flag; `batches` engine as base, salvage attempt versioning
3. Merge `liveSessions` + `batchSessions`; merge both quiz engines; merge both enrolment models
4. `organization_id` on all tenant-owned tables + composite uniques (cheapest it will ever be — database is empty)
5. Fix `batches.teacherIds` → join table with per-instructor roles
6. Fix `payments`: add `companyId`, add real `batchId` column, drop the metadata blob
7. **Redis + BullMQ** — the foundation eight later features sit on
8. Rewrite `companies` → contracts + seat pools + roster
9. Join link: seat cap, expiry, admin revoke/regenerate
10. Enforce the device limit
11. Fix S2; consolidate authorization into declarative guards (S1)
13. CI pipeline; tests on money + access paths

**Not in phase 1:** most student-visible features. If that is not acceptable, say so and I will rebalance toward demo-visible work — at the cost of the foundation.

### Phase 2 — The cohort product · 2026-09-17 → 2026-11-11 (8 weeks)

Timetable · per-batch notes library · live sessions with recurring schedules, auto-record, auto-attendance, reschedule-notify · one quiz engine with full exam UX · doubts with images and lesson-level threads · notifications + web push · corporate reporting (attendance, performance, exports, scheduled email) · admin approval queue · audit log · batch cloning, waitlists, transfers, lifecycle automation · CSV import · manual payment queue, refunds, GST invoicing · 2FA, session management, rate limiting

**End of phase 2 is the first point a college cohort can run end to end.**

### Phase 3 — Assessment depth · 2026-11-12 → 2027-01-20 (10 weeks)

Central question bank with topic + difficulty tags · bulk import · rich media and LaTeX · auto-generate from criteria · multi-select, numeric, passage, subjective, image questions · rubric grading, bulk queue, audio/video feedback, regrade · solution explanations · time-per-question · weak-topic map · topper comparison · DPP · **error notebook** · topic practice · previous-year papers · adaptive difficulty · AI anomaly detection

### Phase 4 — Student experience · 2027-01-21 → 2027-03-31 (10 weeks)

Video player rebuild (speed, quality, resume, timestamped notes) · transcripts and search-in-video · PDF/audio/rich-text/live lesson types · PWA · low-bandwidth mode · personal notes, PDF annotation, bookmarks · spaced repetition · streaks, badges, weekly report cards, study time · batch feed + study groups + moderation · catalogue, search, free previews, wishlist · goal selection, diagnostic test, recommendations · OTP + Google login, parent view · certificates

### Phase 5 — Coding & projects track · 2027-04-01 → 2027-06-30 (13 weeks)

Managed judge with hidden/visible test cases · multi-language · HTML/CSS live preview · editorials · Monaco + starter templates + sample runs · **cloud dev environments** (the most expensive single item selected — per-student containers, persistent storage, idle management) · project briefs, milestones, automated repo checks, plagiarism · learning paths with prerequisites · skill maps · capstones · portfolios

### Phase 6 — AI layer & enterprise · 2027-07-01 → 2027-09-30 (13 weeks)

AI code review and hints · AI content generation · AI study plans · AI lecture summaries · AI-first doubt answering with human fallback · SSO · LMS API · branded corporate portal · custom report builder · enrolment funnel and retention cohorts · CMS page builder · blog and SEO · mentor assignment and 1:1s · mock interviews · job board

**Total: ~13.5 months, completing ~2027-09-30.**

---

## 8. Open items needing your decision

1. **Phase 1 shape.** It is structural, not demo-visible. Confirm or ask me to rebalance.
2. **CMS page-builder depth.** You deferred this to the audit. My finding: `cms` is 1,601 LOC and 44 endpoints with **no tests**. `specs/DECISIONS.md` flags an unresolved conflict — the changelog claims 84 blocks across 17 categories, the reference screenshots show a single rich-text field. **Recommendation:** ship the landing-page *section* builder (reorder/show/hide predefined sections) rather than free-form drag-and-drop. Same user outcome, a fraction of the cost and risk.
3. ~~**Demo mode (S5).** Keep the 4,870-LOC mock layer, or delete it now that a staging environment is planned?~~ **Resolved 2026-08-21: deleted.** The collapse left it faking an API that no longer exists.
4. **`batches.service.ts` at 2,899 LOC.** I intend to split it during the phase-1 collapse rather than carry a god object into every later phase. Confirm.

---

*Audit performed 2026-08-19 against commit `1d7e5cf`. All line references verified at that commit.*
