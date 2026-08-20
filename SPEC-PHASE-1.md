# Spec — Phase 1: Foundation

**Target window:** 2026-08-19 → 2026-09-16
**Derived from:** `AUDIT.md` §7 Phase 1
**Triage label:** `ready-for-agent`
**Status:** awaiting publication — issue tracker not configured (`/setup-matt-pocock-skills`)

---

## Problem Statement

groEdu was built twice. The same product exists as two parallel implementations —
one built around **courses** (self-paced, section-and-lesson structured) and one
built around **batches** (live cohorts with subjects, schedules and capacity).
Each has its own enrolment table, its own quiz engine, its own certificate
system, its own live-session table, its own checkout, and its own learner
navigation. Nothing shares.

The owner experiences this as a codebase that feels bloated and half-finished:
every change has to be made twice or is silently made once, features appear to
exist but only work on one of the two paths, and it is impossible to say what
the product actually does without reading both branches.

Separately, the platform cannot execute the business it is being sold into. A
college wants to buy a block of seats, pay by invoice, and have its students
join. Today `companies` is four columns — a name, an email, a phone number and
an address. There is no contract, no seat count, no expiry, no roster, and no
join mechanism. Corporate payments cannot be recorded against a company at all,
and a corporate enrolment can only ever point at a *course*, never a *batch* —
so the product a college would actually buy is unreachable through the only
purchasing path that exists.

Underneath both problems, a set of features already agreed for later phases are
impossible to start: there is no job queue, no scheduler, no cache, and no error
tracking anywhere in the system.

## Solution

Collapse the two implementations into one, make the corporate purchase path
real, and lay the three pieces of infrastructure that every later phase depends
on.

After this phase there is exactly **one sellable unit**. A batch may be
delivered live, as recordings, or both; a recorded-only product is simply a
batch with no scheduled sessions. There is one enrolment model, one quiz engine,
one certificate system, one live-session model, one checkout and one "my
learning" surface.

A **corporate contract** becomes a first-class entity: a college buys a number
of seats against one or more batches, for a defined period, recorded against a
payment the owner approves. Seats are claimed through a **join link** that
enforces the purchased count, expires, and can be revoked and reissued. The
corporate's own admin can see who has joined and how many seats remain.

Every tenant-owned table gains an organization scope now, while the database is
empty, so that multi-tenancy remains possible later without a migration against
live college data. No isolation is enforced in this phase — this is preparation
only.

The owner can, from this phase onward, actually see when something breaks.

## User Stories

### Owner — the collapsed product model

1. As the platform owner, I want one place to create a sellable product, so that I do not have to decide between "course" and "batch" every time I add something to the catalogue.
2. As the platform owner, I want to mark a product as live, recorded, or both, so that I can sell a recorded-only offering and a live cohort without maintaining two systems.
3. As the platform owner, I want one enrolment record per student per product, so that "who has access to what" has a single answer.
4. As the platform owner, I want one quiz engine, so that a test I author behaves identically no matter which product it belongs to.
5. As the platform owner, I want one certificate system, so that a completion certificate looks the same regardless of how the student learned.
6. As the platform owner, I want one scheduled-session model, so that a live class appears in one place rather than two.
7. As the platform owner, I want the negative marking, per-question marks, attempt limits, open/close windows and leaderboard settings that already exist on the batch engine to survive the merge, so that I do not lose assessment capability I already have.
8. As the platform owner, I want attempt versioning preserved, so that when I edit a test after students have attempted it, historic attempts still make sense.
9. As the platform owner, I want the deleted marketplace modules gone rather than hidden, so that they stop appearing in every search, refactor and migration.

### Owner — corporate sales

10. As the platform owner, I want to record a corporate contract with a named organisation, a seat count, a start date and an end date, so that I know exactly what a college has bought.
11. As the platform owner, I want to attach one or more batches to a contract, so that a college's seats can be used across the products they paid for.
12. As the platform owner, I want to record a corporate payment against a contract and mark it approved, so that seats only activate once the college has actually paid.
13. As the platform owner, I want to see how many of a contract's seats are claimed and how many remain, so that I never oversell or under-deliver.
14. As the platform owner, I want to be warned before a contract expires, so that a renewal conversation happens before access lapses.
15. As the platform owner, I want to generate a join link for a contract, so that a college can distribute one link rather than me creating hundreds of accounts.
16. As the platform owner, I want the join link to stop working once the purchased seat count is reached, so that a leaked link cannot give a whole campus free access to content sold by the seat.
17. As the platform owner, I want the join link to expire on a date I set, so that a leak has a bounded blast radius.
18. As the platform owner, I want to revoke a join link and issue a new one, so that a leak can be contained without disturbing students who already joined legitimately.
19. As the platform owner, I want to reclaim a seat from a student who has left, so that the college can reassign it to someone else.

### Owner — trust and control

20. As the platform owner, I want a limit on how many devices one student account can use, so that a single login cannot be shared across a campus and undercut the seats a college paid for.
21. As the platform owner, I want authorization to be visible at each endpoint rather than buried in a service, so that I can tell whether something is protected without reading the whole call chain.

### Instructor

22. As an instructor, I want to be assigned to a batch by an explicit relationship, so that the system knows which batches are mine without guessing.
23. As an instructor, I want to hold a defined role on a batch, so that a lead instructor, a subject instructor and a teaching assistant are distinguishable.
24. As an instructor, I want to see only the batches I am assigned to, so that my workspace reflects my actual responsibilities.
25. As an instructor, I want to author content in draft, so that nothing reaches a paying student before the owner has approved it.
26. As an instructor, I want to be prevented from modifying another instructor's content, so that a mistake or a bad actor cannot damage a colleague's batch.

### Corporate admin

27. As a corporate admin, I want to see my organisation's contract, so that I know what we bought and when it ends.
28. As a corporate admin, I want to see how many seats are claimed and how many remain, so that I can manage distribution.
29. As a corporate admin, I want to see the list of my students who have joined, so that I can chase the ones who have not.
30. As a corporate admin, I want to see only my own organisation's students, so that another customer's roster is never visible to me.
31. As a corporate admin, I want to distribute a join link to my students, so that onboarding does not require me to collect and submit their details.

### Student

32. As a student, I want to redeem a join link and land in the batch my college bought, so that I can start learning without a purchase step.
33. As a student, I want to be told clearly when a join link is full, expired or revoked, so that I know to contact my college rather than assuming the platform is broken.
34. As a student, I want one place that lists everything I have access to, so that I do not have to check two separate pages.
35. As a student, I want my access to a completed batch to continue, so that I keep the recordings and results I paid for.
36. As a student, I want to see which devices are signed in to my account and sign one out, so that hitting the device limit does not require a support request.
37. As a student, I want to be told why a sign-in was refused when I exceed the device limit, so that I can resolve it myself.

### Purchasing and payment

38. As a student, I want to buy a batch and upload my payment proof, so that I can pay by the method I actually use.
39. As the platform owner, I want to see pending payment proofs in one queue with the amount, the student and the product, so that approving payments is a short daily task rather than an inbox search.
40. As the platform owner, I want an approved payment to grant access automatically, so that a student is not left waiting after I have confirmed their money.
41. As the platform owner, I want every payment to record which batch and which corporate contract it relates to, so that I can answer "who paid for this batch" without reconstructing it from unstructured data.

### Platform readiness

42. As the platform owner, I want a job queue in place, so that video encoding, scheduled reports, expiry warnings and lifecycle transitions can be built in later phases without re-architecting.
43. As the platform owner, I want the database prepared for multiple organisations, so that choosing to go multi-tenant later does not mean a migration against live college data.
44. As a developer, I want automated checks to run before anything merges, so that a large volume of new code does not silently degrade the codebase.
45. As a developer, I want tests that survive a rewrite of the code underneath them, so that collapsing two implementations into one does not mean rewriting the test suite at the same time.

## Implementation Decisions

### The collapsed product model

- **`batches` is the base, not `courses`.** This is decided on capability, not preference: the batch quiz engine already carries duration, attempt limits, negative marking, passing percentage, leaderboard and solution visibility toggles, open/close windows, three question types and per-question marks. The course engine stores single-correct answers in an unstructured blob with no marks and no timing.
- **The sellable unit is a Batch** carrying a **delivery mode** rather than a bare boolean. Three values: live, recorded, hybrid. A recorded-only product is a batch with a delivery mode of recorded and no scheduled sessions. This is the concrete form of the "one product with a live flag" decision — an enum is chosen over a boolean because hybrid is a real case and a boolean cannot express it.
- **Course sections and lessons fold into the batch content hierarchy.** Batch subjects become the top-level grouping; existing lesson content attaches beneath them.
- **Attempt versioning is salvaged from the course engine.** The batch engine has no equivalent of the course engine's quiz version, attempt number, and the uniqueness constraint over student-plus-lesson-plus-attempt-number. That behaviour carries across; the rest of the course quiz path is deleted.
- **One enrolment model.** The corporate-facing enrolment table's non-nullable course reference is the reason corporate purchases cannot reach batches today; the merged model references the batch and carries the enrolment source and granting actor.
- **One scheduled-session model.** The course-attached live session table and the batch-attached session table become one, keyed to the batch, retaining the provider, join URL, meeting identifiers, start time, duration and status.

### Instructor assignment

- **The jsonb array of teacher identifiers is replaced by a join table** carrying batch, instructor and role. Roles: lead, subject instructor, assistant. This is what makes "which batches does this instructor teach" answerable by index rather than by scan, and it is the prerequisite for the per-instructor permissions later phases assume.

### Corporate contracts and seats

- **Three new concepts**, replacing the four-column company record:
  - a **Corporate** — the organisation itself, with the admins who belong to it;
  - a **Contract** — seat count, period, status, linked payment, and the set of batches its seats may be spent on;
  - a **Seat** — the claim of one contract seat by one student, which can be released and reassigned.
- **A contract's seats are spendable across every batch attached to that contract**, not locked to one. This follows from the decision that a seat pool spans multiple batches.
- **Seat allocation is transactional and must hold under concurrency.** The failure mode being designed against is two students redeeming the last seat simultaneously. The count of claimed seats is derived from seat records under a lock or a constraint, never from a cached counter on the contract.
- **Contract lifecycle:** draft → awaiting payment → active → expiring → expired, plus a terminal cancelled. Seats may only be claimed while active.

### Join links

- A join link belongs to a contract and carries a token, an expiry, a revoked flag, and a generation counter so that reissuing invalidates the previous link without deleting its history.
- **Four refusal reasons are distinguishable to the student:** seat pool exhausted, link expired, link revoked, already claimed. A single generic error is not acceptable — the student's next action differs in each case.
- Redemption creates the account if needed, claims a seat, and enrols the student into every batch on the contract, as one transaction.

### Payments

- The payment record gains a **batch reference as a real column with a foreign key and an index**, replacing the current practice of hiding the batch identifier inside an unstructured metadata field.
- The payment record gains a **corporate contract reference**, so a corporate payment can be recorded at all.
- Manual proof-based payment remains the individual purchase path. The disabled card-gateway integration stays disabled and is not removed in this phase.
- **Approving a payment grants access as part of the same transaction** that marks it approved. An approved payment that has not granted access is a defect, not a state.

### Organization scoping preparation

- Every tenant-owned table gains a **non-nullable organization reference**, populated with a single default organisation.
- **Global uniqueness constraints become composite** on the organisation: batch slug, product slug, invoice number, and any other value currently unique platform-wide.
- **No row-level security, no subdomain resolution, no organisation switcher, and no request-scoped organisation context is built.** This is schema preparation only, taken now because the database is empty and this is the cheapest it will ever be.
- The existing unwired tenancy module — including its unreachable permission catalogue — is **deleted**. It currently reads as though isolation exists when nothing enforces it, which is worse than its absence.

### Authorization

- Authorization moves from ad-hoc service-layer argument passing to **declarative guards at the endpoint, backed by a policy layer** for ownership checks. The requirement is that whether an endpoint is protected, and by what, is answerable by reading the endpoint.
- **The section reorder ownership bypass is fixed** as part of this: ownership must be verified for *every* submitted identifier resolving to a single owned parent, not for one arbitrarily selected member of the set.
- Account suspension must **invalidate live sessions**, not merely prevent future sign-ins.

### Device limit

- A configurable maximum concurrent device count per student, enforced at authentication. The existing device records already carry the revocation field needed; only enforcement is missing.
- The student can revoke their own device. Exceeding the limit produces a distinguishable, actionable refusal rather than a generic authentication failure.

### Decomposing the batch service

- The batch service is **2,899 lines and the single largest file in the codebase**. It is split during the collapse rather than after it. Carrying a god object through five subsequent phases compounds: every later feature either adds to it or works around it, and the collapse is the one moment when its internals are being rewritten anyway.
- **Split by concern, not by table.** Six modules, each with a narrow interface over a deep implementation:
  - **Catalogue and lifecycle** — creating, updating, publishing and archiving a batch, and its delivery mode.
  - **Enrolment and access** — who holds access to what, and the single authoritative answer to "may this student see this content".
  - **Scheduling and attendance** — sessions, timetable and attendance records.
  - **Assessment** — quizzes, questions, attempts, scoring, negative marking and leaderboards.
  - **Engagement** — announcements, resources and doubt threads.
  - **Certificates** — issuance and verification.
- **Enrolment and access is the module that matters most.** Every other module asks it the same question, and today that question is answered in several places with slightly different logic. It must expose one entry point for access checks, and no other module may reimplement one.
- The split is judged by whether a later feature can be added inside one module without touching the other five. If a change routinely spans four of them, the seam is in the wrong place and should be revisited before Phase 2 builds on it.

### Infrastructure

- **A Redis-backed job queue and scheduler** is introduced. It is not used heavily in this phase — it exists because eight or more features committed in later phases are impossible without it, and retrofitting a queue after those features are half-built is the expensive path.
- Continuous integration runs type checking, linting and the test suite before merge.

### Deletions

Ten modules are removed outright rather than hidden: the reviews, books, subscriber, newsletter, contact, teacher-application, instructor-payout, withdrawal-method, coupon and lookup modules, together with the unwired tenancy module. Hidden code still compiles, still carries migrations, and still surfaces in every future refactor. The content-management and blog modules are explicitly **retained** — this reverses an earlier deletion decision.

## Testing Decisions

### What makes a good test here

A test asserts on **externally observable behaviour only** — the HTTP status code and the response body a client actually receives, and the observable consequences of a request. It must not reference service method names, internal query shapes, or the structure of the modules under test.

This matters unusually much for this phase. The entire point of Phase 1 is that two implementations become one, which means nearly every service, method signature and query is rewritten. Any test coupled to those internals is rewritten alongside the code it was supposed to be guarding, and therefore guards nothing. A test that survives the collapse untouched is the only kind worth writing here.

### The seam

**One seam: HTTP, against a booted application and a real ephemeral Postgres.**

This replaces the existing pattern, in which every specification file constructs a testing module and substitutes a hand-written stub for the database connection. That pattern is unsuitable for this work: the phase is overwhelmingly schema and data-access change — collapsing enrolment models, merging quiz engines, allocating seats under concurrency, verifying ownership — and a stub that returns what the test told it to return proves none of it. No existing test touches a real database and none exercises the HTTP layer.

The existing specification files remain in place until the module each covers is rewritten, at which point they are deleted rather than migrated. No new tests are written at the old seam.

### What is tested

Coverage is deliberately limited to the money and access paths, per the standing decision that comprehensive coverage is not affordable against this scope:

- **Seat allocation** — claiming, exhaustion, release and reassignment, including concurrent redemption of the final seat.
- **Join link redemption** — success, and each of the four distinguishable refusals.
- **Payment approval** — that approval grants access atomically, and that an unapproved payment grants nothing.
- **Access checks** — that an enrolled student can reach batch content and a non-enrolled student receives the same response as for content that does not exist.
- **Authorization** — that each role reaches only what it should, including the cross-instructor ownership cases and specifically the reorder bypass.
- **Device limit** — that the cap is enforced, that self-revocation frees a slot, and that the refusal is distinguishable.
- **Contract lifecycle** — that seats cannot be claimed outside the active state.

### Prior art

There is no prior art for this seam in the codebase — it is new. The closest existing reference is the batch checkout specification, which is the only test that exercises a purchase flow end to end, albeit against a stubbed database. Its scenario coverage is a useful starting list; its mechanism is not.

## Out of Scope

Everything in Phases 2 through 6 of `AUDIT.md`, and specifically:

- **All student-facing feature work.** No timetable, no notes library, no player rebuild, no doubts, no notifications, no progressive web app. This phase is structural and will not look like product progress.
- **Enforced multi-tenancy.** Organization columns are added and populated; nothing resolves, scopes or isolates by them. No row-level security, no subdomains.
- **The question bank.** Topic and difficulty tagging, bulk import and test generation are Phase 3. The merged quiz engine in this phase carries forward existing capability only.
- **Assessment depth.** No exam interface work, no new question types, no results analysis, no practice modes.
- **The coding and projects track** in its entirety.
- **The AI layer** in its entirety.
- **Corporate reporting.** The corporate admin sees their contract, seat usage and roster. Attendance reports, performance reports, exports and scheduled emails are Phase 2.
- **Card payments.** The disabled gateway integration remains disabled.
- **Instructor revenue share and payouts** — deleted, not deferred.
- **Discount codes** — deleted. Corporate custom pricing and time-based pricing are later.
- **The content-management page builder.** The module is retained and audited; its depth is an open decision recorded in `AUDIT.md` §8.
- **Frontend consolidation.** The two applications duplicate their API clients, hooks, stores and utilities. Real, and not this phase.

## Further Notes

- **This phase will not look like progress to a non-technical observer.** It deletes roughly 3,800 lines, rewrites the data model, and adds infrastructure that nothing visibly uses yet. The owner has accepted this, but it is worth restating at the midpoint.
- **The window is four weeks and the scope is large.** Of the fourteen workstreams, the collapse and the corporate contract path are the two that must land; the organization preparation must land in the same window or not at all, because it is only cheap while the database is empty. Decomposing the batch service is now inside this phase, which widens it further — it is the right call structurally, but it is not free and it competes with the corporate path for the same weeks.
- **The database is empty and may be freely reshaped.** No migration path, backfill or downtime planning is required. This is the single largest thing making the phase feasible.
- **The audit contradicted the original premise.** The codebase is not inefficient — no N+1 patterns, no missing pagination, no unfinished markers, and a known Drizzle null-comparison footgun already fixed with explanatory comments. The problem is duplication. Work planned on the assumption of pervasive inefficiency should be reconsidered.
- **One decision from `AUDIT.md` §8 remains open and touches this phase:** whether the demo-mode mock layer — 4,870 lines across both frontends, which monkey-patches global fetch and permits any password to sign in — is deleted now that a staging environment is planned. It is correctly gated opt-in and the risk is documented, so this is a maintenance-cost question rather than a security one.
