# Spec — Phase 2: The Cohort Product

**Target window:** 2026-09-17 → 2026-11-11 (8 weeks)
**Derived from:** `AUDIT.md` §7 Phase 2
**Depends on:** `SPEC-PHASE-1.md` — the collapsed batch model, the contract/seat/join-link path, the job queue, and the decomposed batch modules
**Triage label:** `ready-for-agent`

---

## Problem Statement

At the end of Phase 1 a college can buy seats, its students can claim them, and
the data model underneath is coherent. What they cannot do is **learn**.

A student who redeems a join link lands in a batch and finds a list of content
with no sense of when anything happens. There is no timetable, so the single
question a cohort student asks every day — *what is on today, and when* — has no
answer in the product. Live classes exist as records but nobody is notified when
one is rescheduled, attendance is marked by hand if at all, and the recording of
a session someone missed is attached manually or not at all. Notes and resources
exist in the data model but are not surfaced. A student who does not understand
something has nowhere to ask.

The owner's position is no better. Instructors author content in draft, but
nothing renders the queue of things awaiting approval, so the publishing gate
that the whole content model depends on is invisible. Running a second cohort
means rebuilding it by hand. Nothing records who approved which payment or
suspended which account.

And the college — the customer whose contract set the deadline — can see its
seats and its roster, and nothing else. It cannot see whether its students are
attending, whether they are passing, or whether the money it spent is producing
anything. That is the artefact a renewal conversation runs on, and it does not
exist.

## Solution

Make the cohort product actually work, end to end, for all four roles.

The student gets a **timetable** as the primary surface of a batch: what is on
today, what is coming, what was missed and where its recording is. Live sessions
are generated from a recurring schedule rather than created one at a time,
recordings attach themselves when a class ends, attendance is captured from the
provider rather than marked by hand, and any reschedule or cancellation notifies
every enrolled student. Notes and resources are a browsable library. Doubts can
be asked against a specific lesson or question, with an image attached, and
answered by an instructor.

The owner gets the **approval queue** the publishing model presupposes, the
ability to clone a batch for the next cohort, waitlists, student transfers,
automatic lifecycle transitions, and a complete **audit log** of every
administrative action.

The college gets **reporting** — attendance per student and per session, test
performance, and both on-demand export and a scheduled email summary.

Payments become an operational routine rather than an ad-hoc task: a queue, a
refund path with access revocation, and compliant invoicing.

**At the end of this phase a real college cohort can run end to end.** That is
the completion test for Phase 2, and nothing in it should be judged by any other
standard.

## User Stories

### Student — the daily surface

1. As a student, I want to see what classes I have today, so that I know when to show up.
2. As a student, I want to see my batch's schedule for the coming weeks, so that I can plan around it.
3. As a student, I want to see which sessions I have missed, so that I know what to catch up on.
4. As a student, I want a missed session's recording to appear in the same place as the session, so that catching up does not mean hunting through a separate library.
5. As a student, I want to be notified when a class is about to start, so that I do not miss it because I lost track of time.
6. As a student, I want to be notified when a class is rescheduled or cancelled, so that I do not arrive to an empty room.
7. As a student, I want to join a live class in one click from the timetable, so that I am not searching for a link.
8. As a student, I want to see my own attendance record, so that I know where I stand if my college asks.
9. As a student, I want to browse my batch's notes, slides and resources in one place, so that I can revise without asking the instructor for files.
10. As a student, I want to download a resource where it is permitted, so that I can study without a connection.

### Student — asking for help

11. As a student, I want to ask a doubt against a specific lesson, so that whoever answers has the context.
12. As a student, I want to ask a doubt against a specific question in a test, so that I can query a particular answer rather than a whole paper.
13. As a student, I want to attach a photograph or screenshot to my doubt, so that I can show my working instead of describing it.
14. As a student, I want to see when my doubt has been answered without checking repeatedly, so that I can get on with something else.
15. As a student, I want to see doubts other students have asked in my batch, so that I do not wait for an answer to a question already answered.
16. As a student, I want a notification when something relevant to me happens, so that the platform tells me rather than me polling it.

### Instructor — running a cohort

17. As an instructor, I want to define a recurring schedule once, so that I do not create sixty sessions by hand.
18. As an instructor, I want to reschedule or cancel a session and have every student notified, so that communicating a change is not a separate manual task.
19. As an instructor, I want attendance captured automatically from the meeting provider, so that I am not transcribing a join list every week.
20. As an instructor, I want to correct attendance where the automatic capture is wrong, so that a student is not marked absent for a provider glitch.
21. As an instructor, I want a session's recording attached to the batch automatically once it ends, so that nobody has to download and re-upload it.
22. As an instructor, I want one inbox of every unanswered doubt across all my batches, so that the oldest question does not rot because I never saw it.
23. As an instructor, I want to see how long a doubt has been waiting, so that I answer in the order that matters.
24. As an instructor, I want to reassign a doubt to a colleague, so that a question outside my subject reaches the person who can answer it.
25. As an instructor, I want to publish a good answer to the whole batch, so that the same question is not asked fifty times.
26. As an instructor, I want to upload notes and resources to my batch, so that students have what I referred to in class.
27. As an instructor, I want to see which of my students are falling behind, so that I can intervene before the end of the cohort.

### Owner — publishing and content operations

28. As the platform owner, I want one queue of everything awaiting my approval, so that the publishing gate is a task I can complete rather than a state I have to go looking for.
29. As the platform owner, I want to send something back with a comment instead of silently rejecting it, so that the instructor knows what to change.
30. As the platform owner, I want to publish content on a schedule, so that a batch starting on a Monday does not need me at my desk on Monday morning.
31. As the platform owner, I want content to unlock progressively where I choose, so that students follow the cohort rather than racing ahead of the live classes.
32. As the platform owner, I want to clone a batch for the next cohort, so that running "older batches and newer batches" does not mean rebuilding everything by hand.
33. As the platform owner, I want a batch to move between upcoming, ongoing and completed automatically, so that its state does not depend on someone remembering.
34. As the platform owner, I want to cap a batch's enrolment and queue the overflow, so that I never oversell a cohort or a college's seats.
35. As the platform owner, I want to move a student from one batch to another, so that a wrong placement is fixed in the product rather than in the database.

### Owner — money and accountability

36. As the platform owner, I want one queue of pending payment proofs showing the amount, the student and the product, so that approving payments is a short daily routine.
37. As the platform owner, I want to reject a payment with a reason the student can see, so that a bad proof does not become an email exchange.
38. As the platform owner, I want to process a refund and have access revoked in the same action, so that a refunded student does not keep what they were refunded for.
39. As the platform owner, I want a compliant invoice generated for every purchase, so that a college's finance department accepts it.
40. As the platform owner, I want every administrative action recorded — who suspended whom, who approved which payment, who edited what, who signed in as whom — so that when something goes wrong the question of who did it is answerable.
41. As the platform owner, I want to require a second factor on staff sign-in, so that one compromised password is not a compromise of every student's data.
42. As the platform owner, I want suspending an account to end its live sessions immediately, so that suspension means suspension.

### Owner — reaching people

43. As the platform owner, I want to broadcast to a batch, a corporate, a sub-group or a filtered segment, so that a message reaches the people it concerns and nobody else.
44. As the platform owner, I want to reach students by push notification, so that class reminders do not depend on anyone reading email.
45. As the platform owner, I want to edit the wording of automated messages myself, so that changing a sentence is not a deployment.
46. As the platform owner, I want to leave written feedback on a student's performance that they can see, so that "giving feedback" is part of the product rather than something I do over the phone.

### Corporate admin — proof of value

47. As a corporate admin, I want an attendance report per student and per session, so that I can satisfy my institution's own attendance requirements.
48. As a corporate admin, I want to see how my students performed in tests, so that I know whether the programme is working.
49. As a corporate admin, I want reports broken down by department, section or year, so that the numbers match how my institution is organised.
50. As a corporate admin, I want to export any report, so that I can use it in my own systems and internal reviews.
51. As a corporate admin, I want a summary emailed to me on a schedule, so that I stay informed without logging in.
52. As a corporate admin, I want to add and remove students from my roster myself, so that a joiner or a leaver does not require an email to the platform owner.
53. As a corporate admin, I want to upload a list of students in bulk, so that onboarding five hundred people does not depend on five hundred of them clicking a link.
54. As a corporate admin, I want to organise my roster into sub-groups, so that reporting reflects my institution's structure.

## Implementation Decisions

### The timetable is the batch's primary surface

- The **timetable is a view over scheduled sessions, not a new entity.** It composes the batch's sessions, its published tests with their open and close windows, and any dated deadlines into one chronological surface.
- **A live session and a recorded lesson are both curriculum items.** A session that has ended and acquired a recording becomes playable in place rather than moving to a separate library. This is the concrete form of the earlier decision that a live class is a lesson type.
- The student's default landing surface for a batch is *today and next*, not the full curriculum tree.

### Session scheduling and lifecycle

- **A recurrence definition generates concrete sessions.** The recurrence is stored, and materialised sessions are generated ahead by a scheduled job. Generated sessions are individually editable — editing one does not detach it from the series, but the edit survives regeneration.
- **Reschedule and cancel are first-class operations**, each notifying every enrolled student across in-app and push. They are not an update to a start time with a separate manual announcement.
- **Recording attachment is driven by the provider's completion webhook**, queued, and retried. Where a provider offers no webhook, a scheduled reconciliation job polls for recordings after a session's expected end.
- **Attendance is captured from the provider's participation log where available**, and is correctable by an instructor. The corrected value wins and records who corrected it. Manual marking remains available for providers with no participation data.

### Notifications

- **Three delivery channels**: in-app, email, and web push. Web push is available because the progressive web app is planned; it is the channel that replaces the SMS and messaging integrations explicitly declined.
- **Delivery is polled by the client in this phase, not streamed.** No websocket, no server-sent events. This is the standing decision and it is revisited only if a later phase introduces a genuine real-time requirement.
- **Every notification type is a template with editable copy**, held in configuration rather than in code, so that wording changes do not require a deployment.
- **Notification generation is queued**, never inline with the request that caused it. A class reschedule that must notify four hundred students may not block the instructor's response.

### Doubts

- A doubt is **anchored to a target** — a batch, a lesson, or a specific question — rather than existing only at batch level. The anchor determines both the context shown to the answerer and who sees it.
- **Image attachment is supported on both the question and the answer.** Most of the doubts a student cannot express in text are the ones worth answering.
- **The instructor inbox is a queue across all assigned batches**, ordered by age, showing elapsed time against a configurable response target. Reassignment moves a doubt to another instructor assigned to the same batch.
- **Promotion to a batch-wide answer** converts a resolved doubt into published content visible to the whole cohort, without exposing the asker unless they consent.

### Publishing and content operations

- The **approval queue** renders the pending state that already exists in the content model but has never had a surface. Approval, rejection with a comment, and scheduled publication are its three actions.
- **Drip release** is expressed as an unlock rule on a curriculum item — a fixed date, or an offset from the student's enrolment. It is evaluated at access-check time by the single access module established in Phase 1, not reimplemented per content type.
- **Cloning a batch copies structure and settings, never the roster or any student data.** The clone starts in draft. Content is copied by reference where the reusable content library allows it, so that correcting a lesson corrects it everywhere it is used.
- **Lifecycle transitions are scheduled jobs**, not request-triggered. A batch becomes ongoing on its start date whether or not anyone signs in.
- **Waitlist promotion is transactional** and reuses the seat-allocation concurrency guarantees established in Phase 1 rather than inventing a second mechanism.

### Payments and finance

- The **payment queue** surfaces the proof, amount, product and payer together, with approve and reject-with-reason as its two actions. Approval grants access atomically — established in Phase 1 and unchanged here.
- **Refund is a state on the payment plus a revocation of the access it granted, in one transaction.** The refund columns exist today with no logic behind them; this phase supplies the logic. Partial refunds are supported; a partial refund does not revoke access unless explicitly chosen.
- **Invoices are generated, numbered sequentially without gaps, and immutable once issued.** A correction is a credit note, never an edit. Corporate invoices reference the contract; individual invoices reference the payment.

### Reporting for the corporate

- Corporate reporting is **scoped by contract**, and a corporate admin can never observe the existence of another organisation's data. A request for a record outside their scope returns the same response as a request for a record that does not exist.
- **Sub-groups are a grouping over the contract's roster**, applied as a dimension to every corporate report.
- **Scheduled reports are queued jobs** producing an emailed summary plus a link to the live view.
- **Exports are generated asynchronously** for anything beyond a trivial row count, delivered by notification when ready, rather than blocking a request.

### Security and accountability

- **The audit log records actor, action, target, before-and-after where meaningful, timestamp, and request context.** It is append-only and is not editable through any interface. Impersonation, suspension, payment approval, refunds, content edits and permission changes are all recorded.
- **Second factor is required for staff roles** — owner, admin and instructor — and optional for students.
- **Session invalidation on suspension** completes the work begun in Phase 1: suspending an account terminates its live sessions rather than only preventing future sign-in.
- **Rate limiting** covers sign-in, password reset, join-link redemption and any endpoint that sends a message, since each is a cost-bearing abuse target.

## Testing Decisions

### The seam

Unchanged from Phase 1: **one seam, at HTTP, against a booted application and a
real ephemeral Postgres.** Tests assert on status codes and response bodies and
on observable consequences. No test references a service method, a query shape,
or a module's internal structure.

Two additions specific to this phase:

- **Time is injected, never read from the system clock.** Recurring schedule
  generation, drip unlock rules, contract expiry, lifecycle transitions and
  scheduled reports are all time-dependent, and a test that waits for real time
  to pass is not a test. A controllable clock is a testing requirement of this
  phase, not an optional nicety.
- **The job queue runs inline in tests.** A queued notification or a queued
  lifecycle transition must be assertable within the test that triggered it,
  without polling or sleeping. External providers — meeting platforms, email,
  push — are stubbed at the network boundary, not at the service boundary, so
  that the code under test is the real code.

### What is tested

Coverage remains limited to money and access paths, extended to cover the
correctness properties this phase introduces that are expensive to get wrong:

- **Drip and scheduling access** — that a student cannot reach content before its unlock rule permits it, evaluated through the single access module rather than per content type.
- **Waitlist promotion** — including two students being promoted into one freed place concurrently.
- **Refund** — that a refund revokes exactly the access its payment granted, and that a partial refund behaves as chosen.
- **Invoice numbering** — that numbers are sequential and gapless under concurrent issuance, and that an issued invoice cannot be mutated.
- **Corporate report scoping** — that a corporate admin cannot reach another organisation's data, and that the refusal is indistinguishable from the record not existing.
- **Audit log completeness** — that each privileged action produces exactly one record with the correct actor.
- **Notification fan-out** — that a reschedule notifies every enrolled student exactly once, and that the triggering request does not block on it.
- **Suspension** — that suspension terminates live sessions and not merely future sign-in.

### Prior art

The Phase 1 suite is the prior art. Its seat-allocation concurrency tests are
the pattern to follow for waitlist promotion and invoice numbering; its access-check
tests are the pattern for drip and corporate scoping.

## Out of Scope

- **The question bank.** Topic and difficulty tagging, bulk import, test generation and rich media in questions are Phase 3. The quiz engine in this phase is the merged engine from Phase 1 with its existing capability and the exam interface — nothing more.
- **Assessment analysis.** No weak-topic mapping, no time-per-question breakdown, no topper comparison, no adaptive difficulty, no practice modes, no error notebook.
- **Solution explanations** beyond the per-question explanation field the merged engine already carries.
- **Grading of subjective work.** Rubrics, the bulk grading queue, audio and video feedback and the regrade workflow are Phase 3.
- **The video player rebuild, transcripts, the progressive web app itself, and all study tools.** Phase 4. Note the tension: web push is delivered in this phase and the progressive web app that carries it is Phase 4, so push reaches desktop browsers first and mobile installs later.
- **Community.** No batch feed, no study groups. Doubts are the only student-visible discussion surface in this phase.
- **Gamification**, catalogue and search, the public storefront, and all consumer sign-in methods.
- **The coding and projects track**, and the entire **AI layer** — including any automated doubt answering. Doubts in this phase are answered by humans.
- **Single sign-on, the learning-management integration API, and the branded corporate portal.** Phase 6.
- **Embedded live video.** Sessions remain external links to a meeting provider.

## Further Notes

- **This is the phase where the product becomes visible.** Phase 1 deliberately produced nothing a non-technical observer would recognise as progress. Phase 2 produces a running cohort, and it is the correct moment to put a real college on it.
- **The eight-week window contains two genuinely large items** — the session scheduling and attendance chain, and corporate reporting. The scheduling chain has the most external dependencies of anything in the plan: two or three meeting providers, each with different webhook behaviour and different participation data. Provider integration is where this phase will slip if it slips.
- **The job queue built in Phase 1 does most of its first real work here** — recurrence generation, recording attachment, notification fan-out, lifecycle transitions, scheduled reports and export generation. If the queue proves inadequate, this is where it shows, and that is the argument for having built it a phase early rather than alongside.
- **Web push arriving before the progressive web app is a deliberate ordering choice**, not an oversight. The alternative is a phase of class reminders that only reach email, having already declined messaging and SMS integrations.
- The audit log is listed among the security items but is better understood as a **product** decision: with impersonation available and money moving, it is the record that makes any dispute answerable.
