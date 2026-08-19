# Spec — Phase 3: Assessment Depth

**Target window:** 2026-11-12 → 2027-01-20 (10 weeks)
**Derived from:** `AUDIT.md` §7 Phase 3
**Depends on:** `SPEC-PHASE-2.md` — a running cohort, the exam interface, corporate reporting and the notification layer
**Triage label:** `ready-for-agent`

---

## Problem Statement

By the end of Phase 2 a cohort runs: students attend, watch, ask doubts, and sit
tests. But the tests are the weakest part of the product, and for an exam-prep
platform that is the wrong weakness to have.

Every question in the system belongs to exactly one test. There is no question
bank. A question written for one paper cannot be reused in another, cannot be
found by topic, and carries no record of how hard it is or how students have
performed on it. Authoring a test means typing questions in one at a time,
which puts a hard ceiling on how much assessment content can exist — and every
practice feature the platform has committed to needs thousands of questions,
not dozens.

The consequences compound. Daily practice problems need questions selected by
topic and difficulty, and there is nothing to select from. A weak-topic map
needs every question tagged, and none are. Adaptive difficulty needs calibration
data, and none is collected. An error notebook needs to know which question a
student got wrong and why, and the attempt record does not retain enough to say.
Previous-year papers need bulk import, and there is no import path at all.

Meanwhile a student who submits a test receives a score and nothing else. No
explanation of what they got wrong, no sense of where their time went, no
comparison against the cohort, and no indication of what to revise. A score
without an explanation teaches nothing, and it is the most-requested thing after
every test anyone has ever sat.

And any question type beyond a multiple choice is unanswerable. Written answers,
photographed working, and passage-based sets — all standard in the exams these
students are preparing for — have neither an authoring path nor a grading path.

## Solution

Build the question bank, and build everything that becomes possible once it
exists.

Questions become **independent, reusable, tagged entities**. Each carries its
subject, topic, sub-topic and difficulty, supports formatted mathematics, code
and images, and can be imported in bulk. Tests are assembled by selecting from
the bank or by describing what is wanted — thirty questions, mixed difficulty,
these five topics — and letting the system compose it.

Assessment gains the **question types the exams actually use**: multiple-correct
with partial credit, numeric answers with tolerance, passage-based groups,
written answers, and photographed working. Everything that cannot be scored
automatically flows into a **grading workflow** with rubrics, a queue that makes
grading two hundred submissions viable, spoken or recorded feedback, and a
regrade path when a student disputes a mark.

After submitting, a student sees **why**. Every question shows its correct
answer and an explanation. Their time per question is compared against the
cohort. Their performance is aggregated into a map of which topics they are weak
in. They can see how they compare to the top scorer.

And that data feeds back: **daily practice problems** drawn from the bank,
**unlimited topic practice**, **previous-year papers**, **adaptive difficulty**
that responds to live performance, and an **error notebook** that silently
collects every question a student has got wrong and hands it back to them at
revision time.

## User Stories

### Instructor — building the bank

1. As an instructor, I want to author a question independently of any test, so that a good question can be used more than once.
2. As an instructor, I want to tag every question with subject, topic and sub-topic, so that questions can be found and grouped by what they actually test.
3. As an instructor, I want to set a difficulty on every question, so that a test can be composed with a deliberate spread rather than by accident.
4. As an instructor, I want to search and filter the bank, so that I can find the question I remember writing rather than rewriting it.
5. As an instructor, I want to import hundreds of questions at once from a spreadsheet, so that building a bank of the size the practice features need is possible at all.
6. As an instructor, I want to preview and correct an import before it commits, so that a formatting mistake does not put four hundred broken questions into the bank.
7. As an instructor, I want to include formatted mathematics in a question and its options, so that physics and mathematics content is legible.
8. As an instructor, I want to include code blocks with syntax highlighting, so that programming questions read correctly.
9. As an instructor, I want to include diagrams and images, so that questions that depend on a figure can exist.
10. As an instructor, I want to see how students have performed on a question, so that I can tell a hard question from a badly written one.
11. As an instructor, I want to retire a question without deleting it, so that historic attempts remain meaningful.

### Instructor — assembling tests

12. As an instructor, I want to build a test by picking questions from the bank, so that assembly is selection rather than authoring.
13. As an instructor, I want to describe a test by criteria and have it composed automatically, so that producing a daily practice set is not a daily chore.
14. As an instructor, I want to group questions under a shared passage or code snippet, so that comprehension-style sets are possible.
15. As an instructor, I want to set per-question marks and a negative marking rule, so that scoring matches the exam being prepared for.
16. As an instructor, I want to define partial credit on multiple-correct questions, so that a partly right answer is scored as such.
17. As an instructor, I want to attach an explanation to every question, so that students learn from the result rather than only receiving it.

### Instructor — grading

18. As an instructor, I want objective questions scored automatically, so that my time goes to the answers that need judgement.
19. As an instructor, I want to grade written answers against a rubric, so that my marking is consistent and defensible.
20. As an instructor, I want one queue of every ungraded submission across all my batches, so that grading is a sitting rather than a navigation exercise.
21. As an instructor, I want to move to the next submission without returning to a list, so that grading two hundred answers is viable.
22. As an instructor, I want to record spoken or screen-captured feedback, so that explaining a mistake in working is faster and richer than typing it.
23. As an instructor, I want to see a student's photographed working alongside the rubric, so that I can grade what they actually did.
24. As an instructor, I want a regrade request to arrive in a queue with the student's reason, so that disputes are handled rather than argued over email.
25. As an instructor, I want a regrade to be recorded with its justification, so that a changed mark is accountable.

### Student — understanding the result

26. As a student, I want to see the correct answer and an explanation for every question, so that a test teaches me something.
27. As a student, I want to see how long I spent on each question against the cohort average, so that I learn where I am wasting time.
28. As a student, I want to see which topics I am weak in across all my tests, so that I know what to revise.
29. As a student, I want to compare my attempt against the top scorer, so that I can see specifically where I lost ground.
30. As a student, I want to see my mark broken down by section and topic, so that a single number is not the only feedback I get.
31. As a student, I want to request a regrade on a written answer with my reasoning, so that a marking mistake can be corrected.
32. As a student, I want to see my instructor's spoken feedback, so that I understand what was wrong rather than only that it was.

### Student — practising

33. As a student, I want a short set of practice problems each day, so that I have a habit rather than an intention.
34. As a student, I want my daily set drawn from what I am currently studying, so that practice matches the cohort's progress.
35. As a student, I want to practise a single topic without limit, so that I can drill something I am weak in.
36. As a student, I want practice to get harder as I improve and easier when I struggle, so that I am always working at the edge of what I can do.
37. As a student, I want to attempt real previous-year papers, so that I know what the actual exam feels like.
38. As a student, I want every question I have got wrong collected automatically, so that revision does not depend on me keeping a list.
39. As a student, I want to see my wrong answer, the right answer and the explanation together in my error notebook, so that revising a mistake is one step rather than three.
40. As a student, I want to clear a question from my error notebook once I can answer it, so that the list reflects what I still need.

### Student — answering

41. As a student, I want to select multiple correct options where a question calls for it, so that the question type matches the exam.
42. As a student, I want to type a numeric answer, so that questions with a calculated result can be asked.
43. As a student, I want to read a passage and answer several linked questions, so that comprehension can be tested.
44. As a student, I want to write a long-form answer, so that subjects requiring explanation can be assessed.
45. As a student, I want to photograph my handwritten working and submit it, so that mathematics and physics working can be marked as it is actually done.

### Owner — integrity and oversight

46. As the platform owner, I want suspicious attempt patterns flagged automatically, so that cheating is detected without surveilling anyone.
47. As the platform owner, I want to see which questions the whole cohort failed, so that I can tell a teaching gap from a bad question.
48. As the platform owner, I want the question bank's tagging coverage visible, so that I know whether the features that depend on it will actually work.

## Implementation Decisions

### The question bank is the foundation of this phase

- **Questions are independent entities, not children of a test.** A test references questions; it does not own them. This inverts the current model, in which a question exists only as a row belonging to one quiz.
- **Tagging is mandatory at authoring time, not optional metadata.** Subject, topic and difficulty are required. Weak-topic mapping, adaptive difficulty, daily practice and topic drilling are all impossible over untagged content, and tagging retrospectively across thousands of questions never happens. Enforcing it at creation is the only version of this that works.
- **The taxonomy is owner-managed configuration**, established in Phase 1's settings work, not a hardcoded list. Subject, topic and sub-topic form a hierarchy; difficulty is an ordinal scale.
- **Difficulty has two values: the authored estimate and the observed one.** The author states an intended difficulty; the system maintains a separate calibrated value derived from actual attempt outcomes. Adaptive selection uses the observed value where enough attempts exist and falls back to the authored one where they do not. Conflating the two makes calibration impossible.
- **Questions are versioned and retired, never hard-deleted.** An attempt references the version of the question it was answered against, so editing a question does not silently rewrite history. This extends the attempt-versioning behaviour salvaged in Phase 1.

### Question types and grouping

- **A question group** carries shared stimulus — a passage, a code listing, a diagram — and orders its member questions. Groups are the mechanism for comprehension sets and for any case where several questions share context.
- **Five scoring behaviours**: single-correct, multiple-correct with a defined partial-credit rule, numeric with tolerance, written requiring human grading, and uploaded-image requiring human grading. Partial credit and numeric tolerance are per-question settings, because the correct rule differs between exam patterns.
- **Rich content is stored in a structured format, not as markup strings.** Mathematics, code and images must render identically in the authoring view, the attempt view, the result view and any export. A markup blob renders differently in each and drifts.

### Bulk import

- **Import is a two-stage operation**: parse and validate into a preview, then commit. Nothing enters the bank until a human has seen the parse result. A four-hundred-row import with a systematic formatting error is otherwise four hundred defects.
- **Validation rejects an untagged row**, consistent with tagging being mandatory. An import that could bypass the tagging requirement would defeat it entirely.
- **Import runs as a queued job** with progress reporting, since a large file must not block a request.

### Test assembly

- **Two assembly modes**: explicit selection, and criteria-based generation. Criteria specify counts by topic and by difficulty band; generation selects from the bank, avoiding questions a student has recently seen where the test is personal to them.
- **A generated daily practice set is personal per student**, drawn from the topics their cohort is currently covering and weighted toward their weak topics. This is why generation must be a service rather than an authoring-time convenience.
- **Previous-year papers are ordinary tests assembled from imported questions**, distinguished by metadata rather than by a separate mechanism. The work is content sourcing, not engineering.

### Results and analysis

- **Per-question timing is captured during the attempt**, not inferred. Without it, time-per-question analysis is impossible, and it cannot be reconstructed afterwards. This is a change to the attempt record, and it must land before any test whose data is later analysed.
- **The weak-topic map is an aggregation over tagged attempt outcomes**, computed across all of a student's attempts rather than per test. It is materialised on a schedule rather than computed per request, because it spans a student's whole history.
- **Cohort comparison figures are computed once per test and cached**, not recomputed for every student viewing their result.
- **The error notebook is derived, not authored.** Every incorrect answer produces an entry automatically, carrying the question version, the student's answer, the correct answer and the explanation. The student can mark an entry resolved; the system does not remove entries on their behalf.

### Grading workflow

- **One submission-and-grading model**, established in Phase 1, serves written answers, image answers and — in Phase 5 — project reviews. It is not reimplemented per artefact type.
- **A rubric is a set of weighted criteria with a scale.** Grading records a value per criterion, not only a total, so that feedback is specific and a regrade can address one criterion.
- **The grading queue is ordered and stateful**, allowing an instructor to work through submissions without returning to a list, and holding partial work if they stop.
- **Regrade is a request, a review and a recorded outcome**, with the original mark retained. A changed mark always carries a justification and an actor.
- **Audio and video feedback is uploaded, transcoded and attached** through the existing media pipeline rather than a parallel one.

### Integrity

- **Anomaly detection is statistical and runs after submission**, not during. It compares answer timing distributions, identical answer sequences across students, and submission patterns against cohort norms, and flags for human review. It never blocks a submission automatically and never accuses a student in the product.
- This is the whole of the integrity work in this phase. Webcam proctoring was considered and rejected; the reasoning is recorded in `AUDIT.md` and stands.

## Testing Decisions

### The seam

Unchanged: **one seam, at HTTP, against a booted application and a real
ephemeral Postgres**, with an injected clock and inline job execution as
established in Phase 2.

One addition: **scoring is tested through submission and result retrieval, never
by calling a scoring function.** Scoring rules are the most intricate logic in
the product and the most tempting to unit-test directly. Testing them at the
seam is what allows the scoring implementation to be rewritten — which it will
be, when observed difficulty calibration and adaptive selection arrive — without
rewriting the tests that prove it correct.

### What is tested

Assessment correctness joins money and access as a path warranting real
coverage, because a wrong mark on a college's test is a customer-losing defect:

- **Scoring**, across every question type: single-correct, multiple-correct with each partial-credit rule, numeric at and beyond tolerance, and the treatment of skipped questions under negative marking.
- **Negative marking**, specifically that skipped and wrong are treated differently and that a total cannot go below the defined floor.
- **Question versioning** — that editing a question does not alter the score of an attempt already submitted against an earlier version.
- **Group scoring** — that a passage set scores as its constituent questions and that a group cannot be partially served.
- **Bulk import** — that validation rejects untagged and malformed rows, that nothing commits on a failed parse, and that a partial failure commits nothing.
- **Criteria-based generation** — that a generated set honours its topic and difficulty counts, and that a personal set excludes recently seen questions.
- **Error notebook derivation** — that exactly one entry is created per incorrect answer and none for correct or skipped ones.
- **Grading and regrade** — that a rubric total is the sum of its criteria, and that a regrade retains the original mark and records its actor.
- **Weak-topic aggregation** — that the map reflects tagged outcomes across multiple tests rather than the most recent one.

### Prior art

The Phase 1 and 2 suites. The merged quiz engine's existing scoring tests are
the closest prior art but are written against a stubbed database at the old
seam; they are replaced rather than extended.

## Out of Scope

- **The coding judge and any code-executed question type.** Programming questions in this phase are text and multiple choice about code, not executed code. Phase 5.
- **Project submission and review.** The grading model built here will serve it, but projects themselves are Phase 5.
- **The video player rebuild, transcripts, the progressive web app, study tools and spaced repetition.** Phase 4 — note that spaced repetition and the error notebook are complementary and the notebook is deliberately first, since it is derived data requiring no scheduling algorithm.
- **Solution explanation videos.** Explanations in this phase are text, formatted content and images. Per-question video is deferred; the attachment point is designed for it but nothing produces it.
- **Any AI involvement in assessment** — no generated questions, no automated grading of written answers, no AI explanations. Phase 6. Anomaly detection here is statistical, not a language model.
- **Gamification** — streaks, badges and study-time goals are Phase 4, even though daily practice is the natural surface for them.
- **Catalogue, search, the public storefront and consumer sign-in.** Phase 4.
- **Webcam proctoring, browser lockdown beyond what Phase 2 delivered, and identity verification.** Considered and declined.

## Further Notes

- **The bank is the bottleneck, and it is a content problem, not an engineering one.** Every practice feature in this phase is straightforward once thousands of tagged questions exist and impossible before then. Bulk import and criteria-based generation exist specifically to make that content problem tractable. The engineering can be finished and the features still feel empty — that risk should be named early and planned for with a content workstream running alongside.
- **Mandatory tagging will feel obstructive to instructors** and there will be pressure to relax it. It should not be relaxed. Every feature promised in this phase and the next two depends on it, and untagged questions cannot be repaired at scale later.
- **Per-question timing must land before any test whose results are later analysed.** It cannot be backfilled. If one thing in this phase is sequenced early, it is this.
- **Ten weeks contains two large builds** — the bank with its import and assembly, and the grading workflow. The analysis features are comparatively cheap once both exist, which argues for sequencing them last rather than interleaving.
- The distinction between authored and observed difficulty is the quiet decision in this phase that everything adaptive depends on. Collapsing them into one field would be simpler now and would make calibration impossible later.
