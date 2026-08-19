# Spec — Phase 4: Student Experience

**Target window:** 2027-01-21 → 2027-03-31 (10 weeks)
**Derived from:** `AUDIT.md` §7 Phase 4
**Depends on:** `SPEC-PHASE-3.md` — the question bank, practice modes and the error notebook
**Triage label:** `ready-for-agent`

---

## Problem Statement

Three phases in, the platform is operationally complete and experientially poor.

Video — the thing students spend most of their time on — is served through a
bare browser video element. There is no player library installed anywhere in the
codebase. That means no playback speed control, which is the single most-used
feature in Indian exam preparation, where students routinely watch at one and a
half times. No quality selection, on a product whose users are frequently on
weak mobile data. No reliable resume, so a student who closes a lecture and
returns starts again. The delivery underneath is correct — signed URLs straight
from the content network, which is why it scales — but everything the student
touches is missing.

Content types are similarly narrow. A lesson may be a video, plain text, or a
quiz. There is no document type, so the notes library added in Phase 2 exists
outside the curriculum rather than within it. There is no audio type, so no
listening while commuting. There is no rich lesson format with code, tables and
inline questions, which is exactly the format a programming curriculum needs and
Phase 5 will require.

The platform is a desktop website used by students on phones. There is no
installable application, no home-screen presence, and the push notifications
built in Phase 2 therefore reach only desktop browsers — the least important
place to reach a student.

Nothing brings a student back. No streak, no daily goal, no summary of what they
did, no sense of progress beyond a percentage. A student who drifts away drifts
away silently, and the first anyone knows is a renewal conversation that goes
badly.

The error notebook from Phase 3 collects mistakes but nothing schedules their
return, so a student must decide when to revise — which is the decision learners
are worst at.

And commercially, there is no way in. No catalogue, no search, no preview, and
no consumer sign-in. Every student the platform has arrives through a college
contract, because that is the only door built.

## Solution

Make the product something a student wants to open.

The **video player is rebuilt** on a proper foundation: speed, quality, reliable
cross-device resume, timestamped bookmarks with notes, and a searchable
transcript that doubles as accessibility and as a way to find the thirty seconds
that matter in a two-hour lecture.

**Content types expand** to documents, audio, and rich lessons with code and
inline questions, bringing the notes library inside the curriculum and preparing
the format Phase 5 needs.

The learner application becomes an **installable progressive web app** with
offline shell, home-screen presence and working push, plus a low-bandwidth mode
for students on weak connections.

**Study tools** turn a video library into a study product: per-lesson notes,
annotation on documents, bookmarks, a continue-learning surface, and **spaced
repetition** that decides what a student revises and when — driven by the error
notebook Phase 3 built.

**Habit mechanics** — streaks, daily goals, badges, measured study time, and a
weekly report card emailed to the student and, where linked, their parent.

**Community**, in the contained form decided: a moderated batch feed and peer
study groups, with no private messaging.

And the **commercial front door** opens: a filterable catalogue, search, free
preview lessons, a wishlist, goal-led onboarding with a diagnostic placement
test, recommendations, and consumer sign-in by phone or Google — plus a parent
account that can see progress without touching content.

**Certificates** are issued and verifiable, closing the loop for both college
contracts and individual students.

## User Stories

### Student — watching

1. As a student, I want to change playback speed, so that I can watch at the pace I actually learn.
2. As a student, I want to choose video quality, so that a weak connection does not mean an unwatchable lecture.
3. As a student, I want a lecture to resume exactly where I stopped, on any device, so that switching from laptop to phone does not cost me my place.
4. As a student, I want to bookmark a moment in a video and attach a note, so that I can return to the part I did not understand.
5. As a student, I want to jump straight to any of my bookmarks, so that revision is targeted rather than rewatching.
6. As a student, I want a transcript beside the video, so that I can read what I could not hear.
7. As a student, I want to search inside a lecture and jump to the match, so that finding one explanation in two hours takes seconds.
8. As a student, I want the player to keep playing when I lock my phone, so that I can listen while doing something else.

### Student — content

9. As a student, I want to read notes and slides inside the app, so that studying does not mean downloading files.
10. As a student, I want to highlight and annotate a document, so that my marks are there when I come back.
11. As a student, I want an audio-only version of a lecture, so that I can revise while commuting.
12. As a student, I want lessons with formatted code and inline questions, so that programming content is legible and interactive.
13. As a student, I want everything for a batch — video, notes, sessions, tests — in one curriculum, so that I am not moving between separate lists.

### Student — on a phone

14. As a student, I want to install the app to my home screen, so that it is where my other apps are.
15. As a student, I want the app to open and show me something useful without a connection, so that a brief signal loss is not a blank screen.
16. As a student, I want push notifications on my phone, so that class reminders reach me where I actually am.
17. As a student, I want a low-bandwidth mode, so that the app is usable on the connection I actually have.

### Student — studying

18. As a student, I want to take notes against a lesson, so that my notes live with the thing they are about.
19. As a student, I want to bookmark any lesson, so that I can build my own revision list.
20. As a student, I want a continue-learning surface, so that opening the app resumes what I was doing rather than asking me to navigate.
21. As a student, I want the system to tell me what to revise today, so that I do not have to decide.
22. As a student, I want revision to bring back what I got wrong before I forget it, so that my mistakes actually get fixed.
23. As a student, I want to export my notes, so that my work is mine.

### Student — motivation

24. As a student, I want a streak for consecutive days of study, so that showing up becomes a habit.
25. As a student, I want a daily goal, so that I know when I have done enough.
26. As a student, I want badges for milestones, so that progress is visible beyond a percentage.
27. As a student, I want to see how much time I have studied, by subject, so that I can see where my effort went.
28. As a student, I want a weekly summary of what I did and what to revise, so that I get a nudge without opening the app.

### Student — community

29. As a student, I want a discussion feed for my batch, so that I can talk to the people learning the same thing.
30. As a student, I want to join a small study group, so that I have people to work with rather than a crowd.
31. As a student, I want to report something inappropriate, so that a bad post is dealt with.
32. As a student, I want instructors visible in the feed, so that discussion is guided rather than unmoderated.

### Student — finding and joining

33. As a prospective student, I want to browse the catalogue filtered by goal, subject, language and start date, so that I can find something relevant.
34. As a prospective student, I want to search, so that I can find a specific batch or instructor directly.
35. As a prospective student, I want to watch a free preview lesson, so that I know what I am buying.
36. As a prospective student, I want to save a batch for later, so that I can decide without losing it.
37. As a new student, I want to state my goal when I sign up, so that what I am shown is relevant from the first screen.
38. As a new student, I want a short diagnostic test, so that I start at the right level rather than guessing.
39. As a new student, I want recommendations based on my goal and level, so that I am not choosing from everything.
40. As a student, I want to sign in with my phone number, so that I do not need an email address I never check.
41. As a student, I want to sign in with Google, so that signing up takes one tap.

### Parent

42. As a parent, I want an account linked to my child, so that I can follow their progress.
43. As a parent, I want to see attendance, test scores and study time, so that I know whether the money is doing anything.
44. As a parent, I want to receive the weekly summary, so that I stay informed without asking.
45. As a parent, I want to be unable to access course content, so that my access is oversight and not a second seat.

### Completion

46. As a student, I want a certificate when I complete a batch, so that I have proof of what I did.
47. As a student, I want my certificate to carry a public verification link, so that an employer or institution can confirm it.
48. As the platform owner, I want to design the certificate, so that it carries our identity.
49. As a corporate admin, I want my students' certificates issued on completion, so that our contract delivers something tangible.

## Implementation Decisions

### The video player

- **A player library is adopted rather than built.** The current bare video element is replaced with an established player supporting adaptive streaming, speed and quality control, and a plugin surface for bookmarks and transcripts.
- **The player is lazy-loaded.** It is a heavy dependency and must not enter the bundle of any route that does not play video — particularly relevant given the learner application is becoming installable and its initial payload matters.
- **Signed content-network delivery is unchanged and must not regress.** Video never passes through the application. This is the property that makes concurrency tractable and it is the easiest thing to break while rebuilding the player.
- **Resume position is server-held, not local.** Cross-device resume is the requirement; local storage cannot satisfy it. Position updates are batched client-side and buffered before persistence, per the progress-write decision made in Phase 1 — this is the phase where that buffering earns its keep.
- **Transcripts are generated asynchronously** by a queued job after upload, stored as timed segments rather than a text blob so that search can seek. Transcription runs once per video, not per view.

### Content types

- **The lesson type set expands** to include document, audio, rich content, and live session — the last unifying the timetable with the curriculum, as decided in Phase 2.
- **Each type declares its own completion semantics.** A video completes at a watched threshold, a document at a viewed-pages threshold, a quiz at submission, a live session at attendance. Progress is not a single percentage computed the same way for everything.
- **The notes library from Phase 2 becomes a view over document lessons**, not a parallel store. Two places holding the same file is the duplication this project already paid for once.
- **Audio renditions are produced by the existing encoding pipeline**, not uploaded separately.
- **Rich content is stored structurally**, consistent with the decision made for question content in Phase 3, and uses the same renderer. Programming curriculum in Phase 5 depends on this format existing.

### Progressive web app

- **The learner application becomes installable**; the administrative application does not. A student on a phone should never receive the authoring bundle, and this is the same reasoning that keeps the two applications separate.
- **The offline shell covers navigation, the continue-learning surface and cached text content.** It does not cover video. Offline video download was considered and declined — it requires either digital rights management or an encrypted local store, and is not securely achievable on the web. It remains the strongest argument for native applications should that decision ever be revisited.
- **Push subscription is per-device** and reuses the device records that Phase 1 made authoritative for the device limit.
- **Low-bandwidth mode is an explicit user setting**, not an inference. It forces the lowest video rendition, suppresses image loading above a threshold, and prefers the audio rendition where one exists.

### Study tools and spaced repetition

- **Notes and annotations are per student and private.** Annotation anchors to a document position and must survive the document being replaced by a corrected version, or degrade visibly rather than silently pointing at the wrong place.
- **Spaced repetition schedules review items, and its item source is the error notebook** built in Phase 3 plus explicitly bookmarked questions. It does not schedule content the student has never got wrong.
- **The scheduling algorithm is an implementation detail behind a stable interface.** It will be tuned. Nothing outside the scheduler may depend on its intervals.
- **The daily review surface is one queue combining spaced-repetition items and the day's practice set**, not two competing daily obligations. A student presented with two separate daily duties completes neither.

### Habit mechanics

- **Study time is measured, not inferred from page presence.** An idle tab does not accrue time. Measurement is event-driven with an inactivity cutoff, because this figure feeds both student motivation and a college's proof-of-engagement reporting, and an inflated number is worse than none.
- **A streak is defined by meeting a daily goal**, not by opening the application. The goal is configurable and defaults are owner-managed configuration.
- **Weekly report cards are queued jobs** producing an email to the student and, where a parent account is linked, to the parent. They reuse the notification template system from Phase 2.

### Community

- **A batch feed and study groups; no direct messaging.** This is the decided position and it is a safeguarding decision, not a feature preference: private contact between students, some of whom may be minors on a college roster, makes the platform responsible for conversations it cannot see.
- **All community content is visible to instructors and administrators of that batch**, which is what makes moderation possible at all.
- **Reporting routes into the moderation queue** established in Phase 2, alongside automated filtering and image screening. No new moderation mechanism is built.
- **Study groups are bounded in size and scoped to a batch.** A group spanning batches has no owner responsible for moderating it.

### Catalogue, onboarding and sign-in

- **Search requires a real index**, not pattern matching. Full-text indexing in the database is sufficient at the stated scale; a dedicated search service is not warranted and would be premature.
- **A free preview lesson is a flag on a curriculum item plus an access-check exception**, evaluated by the single access module from Phase 1. It is not a separate content path.
- **Goal selection is the hook everything personal hangs from** — recommendations, daily practice topic selection, and the catalogue's default filter. It is captured at sign-up and editable afterwards.
- **The diagnostic test is an ordinary test assembled from the bank by criteria**, distinguished by what is done with the result: it produces a level and a recommendation rather than a score and a rank.
- **Phone sign-in and Google sign-in are additional identity methods on one account**, not separate accounts. Account merging, built in Phase 1, is what makes this safe — a student who signs up by phone and later by Google must not become two students. Rate limiting on one-time-code endpoints is mandatory, since each unrated request has a direct monetary cost.
- **A parent account is a distinct account with a link to a student**, carrying read access to progress, attendance and results, and no content access whatsoever. It is not a role on the student's account and it does not consume a seat.

### Certificates

- **Issuance is triggered by defined completion criteria** on the batch, evaluated by a queued job, not by a student requesting one.
- **Verification is a public endpoint keyed by an unguessable identifier**, disclosing only what the certificate asserts — holder name, batch, date, issuer. It reveals nothing else about the holder.
- **A revoked certificate remains verifiable and reports itself revoked.** A verification link that goes dead is indistinguishable from a broken system.

## Testing Decisions

### The seam

Unchanged: **one seam, at HTTP, against a booted application and a real
ephemeral Postgres**, with an injected clock and inline job execution.

This phase introduces significant client-side behaviour — the player, offline
shell, annotation, and time measurement — which the HTTP seam cannot reach. The
decision is **not** to open a second seam for it. Client behaviour is verified
by its server-observable consequences: that a resume position was persisted,
that a bookmark exists at the recorded timestamp, that measured study time
excludes idle periods, that a push subscription registered against the right
device. Where behaviour has no server-observable consequence, it is not
automatically tested in this phase, and that limitation is accepted rather than
solved by introducing a browser-automation seam whose maintenance cost would
exceed its value at this stage.

### What is tested

- **Resume position** — persisted, retrievable across devices, and correct under out-of-order updates from a batched client.
- **Free preview access** — that a preview lesson is reachable without enrolment and that no adjacent content becomes reachable with it. This is a paywall boundary and it is the highest-risk item in this phase.
- **Parent scoping** — that a parent account reaches progress and results and receives the same response as for a non-existent record when reaching for content.
- **Identity linking** — that phone and Google sign-in resolve to one account, and that a second method cannot claim an account belonging to someone else.
- **Rate limiting on one-time codes** — that repeated requests are refused, since each has a direct cost.
- **Spaced repetition scheduling** — that items derive from the error notebook, that a resolved item leaves the schedule, and that intervals advance as the algorithm defines, tested through the queue rather than the algorithm.
- **Study time measurement** — that idle periods do not accrue, since this figure appears in a customer-facing report.
- **Certificate issuance and verification** — that issuance requires completion criteria to be met, that verification discloses only the asserted fields, and that a revoked certificate verifies as revoked rather than failing.
- **Community scoping** — that a student cannot read another batch's feed or a study group they do not belong to.

### Prior art

Phases 1 through 3. The access-check tests from Phase 1 are the direct pattern
for preview and parent scoping; the queue and clock patterns from Phase 2 apply
to scheduling and report generation.

## Out of Scope

- **Native mobile applications.** The progressive web app is the decided approach. Offline video download is out of scope with it and is the one capability genuinely sacrificed.
- **Offline video.** See above — not securely achievable on the web.
- **The coding and projects track** in its entirety, including the in-browser editor and any executed code. Phase 5. The rich content format built here is a prerequisite for it.
- **All AI features** — recommendations in this phase are rule-based on goal and level, not model-driven. Phase 6.
- **Direct messaging between students.** Declined on safeguarding grounds.
- **Instructor-facing improvements.** This phase is student-facing; instructor tooling is unchanged from Phase 3.
- **The public marketing site, blog and page builder.** Phase 6. The catalogue built here is a product surface, not a marketing site.
- **Discount codes and any consumer promotional mechanism.** Deleted; pricing is corporate-negotiated and time-based.
- **Payment gateway integration.** Manual proof-based payment remains the individual path.
- **Single sign-on and the branded corporate portal.** Phase 6.

## Further Notes

- **This is the phase where the product stops feeling like an internal tool.** Everything before it was structure, operations and correctness. A student's opinion of the platform is formed almost entirely by what this phase delivers.
- **The commercial front door opens here, three phases after the college contract.** That ordering is deliberate — the contracted customer was served first — but it means no self-serve revenue exists until this phase completes. If individual sales matter sooner, the catalogue, preview and sign-in items are the ones to pull forward, and they are comparatively separable from the rest.
- **Transcription is the one item with a recurring external cost** proportional to content volume. It should be priced before commitment, and it may be worth restricting to content that justifies it rather than every upload.
- **Progress-write buffering, decided in Phase 1, is exercised properly for the first time here.** The rebuilt player produces far more position updates than the current one. If the buffering is inadequate this is where it surfaces.
- **Two items in this phase have safeguarding weight** — community and parent accounts — and both involve minors. The decided positions are conservative; they should not be relaxed for engagement reasons without a deliberate revisit.
- The error notebook and spaced repetition together are, on the evidence of comparable platforms, the strongest differentiator in the entire plan and the least commonly implemented well. They are cheap relative to their effect and should not be the items cut if this phase runs long.
