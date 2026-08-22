# Spec — Phase 6: AI Layer & Enterprise

**Target window:** 2027-07-01 → 2027-09-30 (13 weeks)
**Derived from:** `AUDIT.md` §7 Phase 6
**Depends on:** `SPEC-PHASE-5.md` — the coding track, projects, paths and portfolios
**Triage label:** `ready-for-agent`

---

## Problem Statement

Two problems remain, and they are unrelated to each other except in timing.

**The first is that the platform does not scale past the people it employs.**
Every doubt is answered by an instructor. Every question in the bank is written
by an instructor. Every project is reviewed by an instructor. Every study plan
is a student guessing what to do next. This is the model the reference product
uses, and it is why that product employs a large doubt-solving operation as a
cost centre. Each new cohort adds proportional human cost, which means margin
does not improve with scale and quality degrades whenever demand outruns
staffing. The question bank, in particular, needs thousands of tagged questions
that nobody has time to write, and the coding track needs feedback on approach
and readability that test cases cannot give.

**The second is that the platform cannot be sold to a large institution.**
A college's IT department expects students to sign in with their existing
institutional accounts; there is no single sign-on. It expects grades and
attendance to flow into its own systems; there is no integration API. It expects
its students to see its brand; there is a shared portal. The owner cannot answer
a question the product has not anticipated, because every report is hardcoded
and there is no way to compose a new one. And there is no acquisition channel at
all beyond direct sales — no marketing site, no content, no organic traffic.

Meanwhile the career track built in Phase 5 delivers projects and a portfolio
but nothing that turns a graduate into a hire. No mentorship, no interview
practice, no employer connection. For a programme sold on outcomes, the outcome
step is missing.

## Solution

Add an **AI layer** that multiplies the staff rather than replacing them, and
the **enterprise and growth surface** the business needs to sell and to be found.

Students ask a doubt and get an **immediate answer grounded in their own course
content**, with citations to the lesson it came from. If the answer does not
help, it escalates to an instructor — who receives it with a **drafted reply**
they edit rather than write. Instructors **generate question drafts, summaries
and practice problems** from existing lessons and review them before they enter
the bank, turning content authoring from writing into editing. Coding
submissions receive **feedback on approach, complexity and readability** beyond
pass or fail, and **hints that nudge rather than solve**. Every student gets a
**study plan** composed from their goal, weak topics, available time and
upcoming deadlines. Every lecture gets an **automatic summary with timestamped
chapters**, derived from the transcripts Phase 4 already produces.

For institutions: **single sign-on** against their identity provider, an
**integration API** that pushes attendance and grades into their systems, and a
**branded portal** carrying their identity. For the owner: a **report builder**
that answers questions nobody anticipated, plus **funnel and retention
analytics**. For acquisition: the **page builder, blog and SEO surface**.

And for the career track: **mentors** with scheduled one-to-ones, **mock
interviews** with structured feedback, and a **job board** connecting graduates
to employers.

## User Stories

### Student — help that arrives immediately

1. As a student, I want an immediate answer to my doubt, so that I am not blocked until an instructor is free.
2. As a student, I want that answer to cite the lesson it came from, so that I can check it and go deeper.
3. As a student, I want to say an answer did not help and reach a human, so that the automation is a first step rather than a wall.
4. As a student, I want to know when an answer came from automation rather than my instructor, so that I can judge it appropriately.
5. As a student, I want the answer to be grounded in what my course actually taught, so that I am not given a method my instructor has not covered.

### Student — guidance

6. As a student, I want a daily plan that tells me what to study, so that I do not waste time deciding.
7. As a student, I want my plan to account for my weak topics, so that my effort goes where it is needed.
8. As a student, I want my plan to account for how much time I actually have, so that it is achievable rather than aspirational.
9. As a student, I want my plan to adjust when I fall behind or race ahead, so that it stays useful.
10. As a student, I want my plan to prioritise around an upcoming test, so that revision is timed rather than generic.

### Student — learning from long content

11. As a student, I want a summary of each lecture, so that I can decide whether to watch or revise it.
12. As a student, I want timestamped chapters on a lecture, so that I can jump to the part I need.
13. As a student, I want key points extracted from a lecture, so that revision does not mean rewatching two hours.

### Student — the coding track

14. As a student, I want feedback on my approach and not only whether my tests passed, so that I learn to write better code rather than merely working code.
15. As a student, I want to know the complexity of what I wrote and how it compares to the model solution, so that I learn to reason about efficiency.
16. As a student, I want a hint when I am stuck that points me in a direction without giving me the answer, so that I make progress without losing the learning.
17. As a student, I want feedback on readability and structure in my project, so that I learn what a reviewer looks for.
18. As a student, I want automated feedback before my human review, so that my mentor's time goes to what matters.

### Student — outcomes

19. As a student, I want an assigned mentor, so that someone knows how I am doing.
20. As a student, I want scheduled one-to-one sessions, so that I have a regular point of contact.
21. As a student, I want a mock interview with structured feedback, so that I know how I would perform before it counts.
22. As a student, I want to see openings relevant to my skills, so that finishing the programme leads somewhere.
23. As a student, I want to apply through the platform and track my applications, so that I am not managing it in a spreadsheet.

### Instructor

24. As an instructor, I want doubts to arrive with a drafted answer, so that I edit rather than write.
25. As an instructor, I want to see what the automated answer told the student before escalation, so that I do not contradict it without knowing.
26. As an instructor, I want to generate draft questions from a lesson, so that building the bank is editing rather than authoring.
27. As an instructor, I want generated questions clearly marked as unreviewed, so that nothing unchecked reaches a student.
28. As an instructor, I want to generate practice problems at a target difficulty and topic, so that gaps in the bank can be filled deliberately.
29. As an instructor, I want an automated first pass on project submissions, so that my review starts from something informed.
30. As an instructor, I want to override or discard any automated output, so that I remain accountable for what students receive.

### Owner — reaching institutions

31. As the platform owner, I want a college's students to sign in with their institutional accounts, so that a common procurement requirement is met.
32. As the platform owner, I want to configure sign-on per corporate, so that each institution uses its own provider.
33. As the platform owner, I want to push attendance and grades into a college's own systems, so that our data reaches where they already work.
34. As the platform owner, I want a college's students to see the college's brand, so that the programme feels like theirs.
35. As the platform owner, I want to issue scoped API credentials to a college, so that integration does not mean sharing an administrator account.

### Owner — understanding the business

36. As the platform owner, I want to build a report by choosing what to measure and how to break it down, so that a new question does not require a developer.
37. As the platform owner, I want to save and share a report I built, so that it becomes a routine rather than a one-off.
38. As the platform owner, I want to see where prospective students drop out of the funnel, so that I know whether the problem is traffic, price or checkout.
39. As the platform owner, I want to see retention by joining month and by source, so that I can tell which cohorts are healthy.
40. As the platform owner, I want to compare instructors on attendance, results and responsiveness, so that I can manage a teaching team on evidence.
41. As the platform owner, I want to see what the AI layer is costing me, broken down by feature, so that a runaway cost is visible before it is a bill.

### Owner — being found

42. As the platform owner, I want to compose landing pages from blocks without a developer, so that campaigns do not require a deployment.
43. As the platform owner, I want to publish articles, so that we have something to rank for.
44. As the platform owner, I want control of page metadata and structured data, so that our pages are indexed properly.
45. As the platform owner, I want pages to load fast enough to rank, so that the content effort is not wasted.

### Owner — the career programme

46. As the platform owner, I want to assign mentors to students, so that responsibility is explicit.
47. As the platform owner, I want to see mentor engagement, so that I know whether sessions are actually happening.
48. As the platform owner, I want to post openings and see which students applied, so that placement is measurable.

## Implementation Decisions

### Model choice and cost posture

- **Claude Opus 5 (`claude-opus-5`) is the default model** for every feature where quality is the point: doubt answering, code review, question generation, and project feedback. Its one-million-token context is what makes grounding a doubt in a whole course's material tractable.
- **Claude Haiku 4.5 (`claude-haiku-4-5`) is used for high-volume, low-judgement work** — lecture summarisation, chapter segmentation and classification. This is a deliberate, per-feature choice, not a blanket cost downgrade.
- **Every AI call is a queued job**, never inline with a request, using the queue built in Phase 1. A student's doubt returns immediately with a pending state and the answer arrives by notification.
- **Prompt caching is the primary cost control and is a design constraint, not an optimisation.** Doubt answering sends the same course material on every question in a batch. That material must sit as a stable cached prefix with the volatile part — the student's actual question — after it. Caching is a prefix match, so anything varying (a timestamp, a session identifier, an unsorted list) placed before the cache boundary silently invalidates it and multiplies cost. This must be verified by observing cache-read token counts, not assumed.
- **Offline bulk work uses the Batch API**, which runs asynchronously at half cost — lecture summarisation and bulk question generation are both natural fits, since neither is latency-sensitive.
- **Structured output is used wherever a response is parsed** rather than shown to a person. Generated questions, extracted chapters and review verdicts all have defined shapes and must not be parsed out of prose.
- **Cost is attributed per feature and per organisation** and surfaced in the owner's reporting. An AI feature whose cost cannot be attributed cannot be managed.
- **The provider is abstracted behind an internal interface**, consistent with the execution and environment abstractions in Phase 5.

### Grounding, and the boundary of what AI may do

- **Answers are grounded in the organisation's own content** — lesson text, transcripts, notes and published doubt answers — retrieved and supplied as context, with citations to the source. An ungrounded answer, however fluent, may contradict what the instructor taught, and in exam preparation that is worse than no answer.
- **Citations are required on every student-facing answer.** A student must be able to open the lesson an answer came from.
- **Automated answers are visibly labelled as such.** A student always knows whether they are reading their instructor or a machine.
- **Escalation to a human is always one action away**, and the escalated doubt carries the automated answer so the instructor does not contradict it unknowingly.
- **No AI output is published to a student without a human in the loop, except doubt answers and lecture summaries.** Generated questions enter the bank in an unreviewed state and cannot be served until an instructor approves them. Project feedback is drafted for a reviewer, not sent.
- **AI never assigns a mark.** It may draft feedback, flag issues and suggest a rubric score; a human commits it. This extends the position already taken on plagiarism flags in Phase 5, for the same reason.
- **Hints are graduated and rate-limited**, and taking a hint is recorded on the submission. A hint system that will produce the answer on the fourth press is a solution system with extra steps.

### The AI features

- **Doubt answering** retrieves relevant content for the student's batch, answers with citations, and offers escalation. Answers marked unhelpful are collected — that set is the highest-value signal available about where content or teaching is weak, and it should be surfaced to the owner rather than discarded.
- **Instructor draft replies** run on escalation, so an instructor's queue arrives pre-drafted.
- **Question generation** produces drafts from a lesson at a specified topic and difficulty, entering the bank unreviewed and mandatorily tagged, consistent with Phase 3's tagging rule.
- **Code review** comments on approach, complexity, naming and structure. It runs after the judge, never instead of it: test cases decide correctness, the model comments on quality.
- **Study plans** compose from the goal captured at onboarding, the weak-topic map from Phase 3, spaced-repetition items from Phase 4, declared available time, and upcoming test dates. Regeneration is scheduled, not on demand, so that the plan is stable enough to follow.
- **Lecture summaries and chapters** derive from the transcripts Phase 4 already generates, at no additional transcription cost.

### Enterprise integration

- **Single sign-on is configured per corporate**, supporting the mainstream institutional identity providers. Account linking on first sign-in reuses the merge mechanism built in Phase 1 — a student who already has an account must not acquire a second one.
- **A student's role and access continue to come from their membership and enrolments**, never from claims asserted by the institution's identity provider. Authentication is delegated; authorisation is not.
- **The integration API is scoped, credentialed and versioned** per corporate, exposing attendance, results and progress for that corporate's own students only. Credentials are issued and revoked independently of any user account.
- **The branded portal applies the corporate's identity to what its students see.** This is the first real use of the organisation columns added in Phase 1 and it is deliberately styling only — no data isolation is being claimed or enforced.

### Reporting

- **The report builder exposes a defined set of dimensions and measures**, not arbitrary query access. Saved reports are shareable, schedulable through the existing job queue, and exportable.
- **Funnel analysis requires event capture** — page views, catalogue views, checkout starts and completions — which does not exist today and must be built as part of this phase.
- **Retention cohorts are computed on a schedule and materialised**, not computed per request.

### Growth surface

- **The page builder composes pages from a defined block palette.** `specs/DECISIONS.md` records an unresolved conflict about whether the reference product's palette exists as documented; that conflict is resolved by defining our own palette rather than recovering theirs.
- **Public pages are server-rendered with metadata and structured data under owner control.** Performance is a functional requirement of this feature, not a quality attribute — a slow page does not rank, and an unranked page defeats the purpose of writing it.

### Mentorship and placement

- **A mentor is an instructor role scoped to specific students within a path**, reusing the per-batch instructor role model built in Phase 1 rather than inventing a parallel one.
- **One-to-one sessions reuse the scheduling and session machinery from Phase 2**, with a private feedback record per session.
- **Mock interviews are a scheduled session plus a structured feedback form against defined competencies**, feeding the skill map from Phase 5.
- **The job board is deliberately minimal**: openings, applications, status tracking, and employer visibility into portfolios students have published. Anything beyond this — employer accounts, screening, placement fees — is a different business with different obligations and is explicitly not being built.

## Testing Decisions

### The seam

Unchanged: **one seam, at HTTP, against a booted application and a real
ephemeral Postgres**, with an injected clock and inline job execution.

**The model provider is stubbed at the network boundary**, as with the execution
provider in Phase 5. Tests exercise the real retrieval, prompt assembly, queue,
parsing and persistence path with only the outbound call intercepted. Stubbing
at the service boundary would leave the pipeline — which is where the defects
are — untested.

**Model output quality is not unit-tested.** It is non-deterministic and testing
it at the seam produces flaky tests that get disabled. What *is* tested is
everything deterministic around it: that retrieval selects content from the right
organisation and batch, that citations resolve to real lessons the student may
access, that malformed output is rejected rather than persisted, that failures
degrade to the human path, and that no generated content reaches a student
without review where review is required. Output quality is managed by a separate
evaluation set run outside the test suite, not by assertions in continuous
integration.

### What is tested

- **Retrieval scoping** — that grounding context is drawn only from content the asking student may access, and never from another organisation or an unenrolled batch. This is a data-leak boundary and is the highest-value test in the phase.
- **Citation integrity** — that every citation resolves to a real, accessible lesson, and that an answer citing content the student cannot access is rejected rather than shown.
- **Review gating** — that a generated question cannot be served in any test until approved, and that unreviewed content is unreachable through every path including practice generation and daily sets.
- **Escalation** — that marking an answer unhelpful reaches a human, and that the automated answer is carried with it.
- **Degradation** — that a provider outage, timeout or malformed response leaves the student on the human path with a clear state, never a broken one or a silent failure.
- **Marking boundary** — that no automated path can commit a mark, a rubric score, or a pass verdict.
- **Hint rate limiting** — that hints are bounded and that hint use is recorded against the submission.
- **Single sign-on** — that a returning student links to their existing account rather than creating a second, and that role and access derive from membership rather than from provider claims. This is an authorisation boundary and warrants the same rigour as Phase 1's access tests.
- **Integration API scoping** — that a corporate's credentials reach only that corporate's students, and that a request beyond scope is indistinguishable from a request for a non-existent record.
- **Report builder scoping** — that a saved report respects the viewer's scope rather than the author's.
- **Cost attribution** — that every model call records its feature and organisation.

### Prior art

Phases 1 through 5. The Phase 5 provider-stubbing pattern applies directly; the
Phase 1 access tests and Phase 2 corporate-scoping tests are the pattern for
retrieval and integration scoping.

## Out of Scope

- **Fine-tuning or training on student data.** Retrieval over the organisation's own content is the entire approach. Training on student work raises consent questions with minors that are not worth opening.
- **AI-assigned marks or verdicts.** A human commits every mark. Non-negotiable.
- **AI-generated video, audio or lecture content.** Summaries and chapters are derived from existing lectures; nothing new is generated as teaching material.
- **A conversational tutor.** Doubt answering is question-and-answer with escalation, not an open-ended chat companion. That is a distinct product with distinct safety obligations, particularly with minors.
- **Automated proctoring or AI invigilation.** Declined in Phase 3 and still declined.
- **Employer accounts, screening tools and placement fees.** The job board is openings and applications only.
- **Custom per-college integrations.** One versioned API is offered; bespoke work per institution is a services engagement, not a product feature.
- **Multi-tenancy enforcement.** The branded portal is styling. Organisation columns exist from Phase 1 and are still not an isolation boundary — nothing in this phase should be read as claiming otherwise.
- **Native mobile applications, offline video, and student-to-student messaging.** All previously declined and unchanged.

## Further Notes

- **This phase is where margin is decided.** Every prior phase adds cost proportional to students. The AI layer is the only thing in the plan that breaks that relationship — but only if grounding, caching and batching are done properly. A naive implementation that resends full course content uncached on every question will cost more than the instructors it was meant to relieve, and the failure will be invisible until the invoice arrives. **Verify cache-read token counts early and continuously; treat a zero cache-read rate as an incident.**
- **The AI features and the enterprise features share nothing.** They are in the same phase because they are both last, not because they are related. They can and probably should be built in parallel by different people, and either can slip without blocking the other.
- **The doubt-answering feedback signal is undervalued.** The set of answers students marked unhelpful is a direct map of where teaching and content are weakest. It is nearly free to collect and it should be surfaced to the owner as a first-class report, not left in a table.
- **Single sign-on is frequently the item that unblocks a large deal**, and it is comparatively small. If a specific institutional opportunity appears earlier in the plan, this is the item most worth pulling forward — it has few dependencies beyond the account-merge mechanism from Phase 1.
- **The page builder carries the most uncertainty of anything remaining.** `specs/DECISIONS.md` flags a contradiction in the source material about whether its block palette exists as described. Defining our own palette resolves this, and the temptation to reverse-engineer the reference product's should be resisted.
- **Thirteen weeks, two unrelated workstreams, and the most cost-sensitive feature set in the plan.** If this phase runs long, the growth surface — page builder, blog and search optimisation — is the most deferrable, because it serves an acquisition channel that does not yet exist. The AI layer is not deferrable, because it is what makes the preceding five phases affordable to operate.
