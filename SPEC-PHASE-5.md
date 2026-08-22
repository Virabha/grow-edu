# Spec — Phase 5: Coding & Projects Track

**Target window:** 2027-04-01 → 2027-06-30 (13 weeks)
**Derived from:** `AUDIT.md` §7 Phase 5
**Depends on:** `SPEC-PHASE-4.md` — rich content lessons, the student experience layer, and certificates
**Triage label:** `ready-for-agent`

---

## Problem Statement

The platform sells exam preparation. It has been asked to also sell **software
engineering and AI engineering programmes**, and those are a different product
wearing the same clothes.

Nobody buys a coding course for the videos. They buy it for the outcome — the
ability to write code that works, and something concrete to show an employer.
Everything the platform has built so far serves consumption and assessment by
multiple choice. A programming curriculum needs neither of those things as its
core.

There is **no code execution infrastructure of any kind** in the codebase. No
judge, no sandbox, no runner, no test-case model, no submission history. A
question about programming can currently only be asked as a multiple choice
about programming, which teaches nothing about writing it. A student cannot
write a line of code inside the product.

There is no way to set, submit, or review a **project**. The grading model built
in Phase 3 can accept a submission and score it against a rubric, but there is
nothing that expresses a project brief, nothing that accepts a repository or a
deployed application, nothing that breaks a large piece of work into reviewable
milestones, and nothing that checks whether the submitted work builds or passes
its own tests before a human spends an hour on it.

There is no notion of a **programme** as distinct from a batch. A career track is
an ordered path with prerequisites, where later work is meaningless without
earlier work, culminating in something substantial. The platform models a flat
collection of content sold as a unit.

And there is no **evidence of capability**. A certificate says a student
finished. It does not say what they can do. For an exam-prep student that is
sufficient; for someone applying for an engineering job it is close to worthless.

## Solution

Build the two things a career programme needs — the ability to write and run
code, and the ability to build and have reviewed something real — and the
structure that turns a collection of content into a programme.

Students write code in an **in-browser editor** against problems with visible
and hidden test cases, run it against the visible cases as often as they like,
and submit for judgement. Execution runs on a **managed third-party service**
rather than infrastructure the platform operates, because running untrusted code
safely is the single most dangerous thing in this plan and it is not a problem
worth owning. Front-end problems in markup, styling and browser scripting run
**entirely in a sandboxed frame in the student's own browser**, needing no server
execution at all. Every problem carries a written editorial explaining the model
solution and its complexity.

For substantial work, students get a **cloud development environment** — a real
container with a terminal, a filesystem and the ability to install packages —
because building an application is not something that happens in a single
function body.

**Projects** are briefed with requirements and a rubric, broken into milestones
that unlock in sequence, submitted as a repository and a deployment, checked
automatically for build, lint and test status before a human sees them, screened
for similarity against each other and public sources, and reviewed against the
rubric using the grading workflow built in Phase 3.

**Learning paths** sequence batches, problem sets and projects with
prerequisites, tracking not just what a student consumed but which **skills**
they have demonstrated, and ending in a **capstone** that gates the credential.

The output is a **portfolio** — a shareable public profile showing completed
projects, demonstrated skills and verified certificates.

## User Stories

### Student — writing code

1. As a student, I want to write code in the browser with syntax highlighting and autocomplete, so that solving a problem does not require setting up a local environment.
2. As a student, I want a problem to open with a function signature and imports already present, so that I solve the problem rather than fight the setup.
3. As a student, I want to run my code against the sample cases as often as I like, so that I can debug before submitting.
4. As a student, I want to see exactly which test case failed and what my output was, so that I can find my mistake.
5. As a student, I want to submit for judgement against hidden cases, so that my solution is properly tested rather than fitted to the examples.
6. As a student, I want to choose my language from those the problem supports, so that I can work in what I am learning.
7. As a student, I want to build a page in markup and styling and see it render live, so that front-end work is immediate.
8. As a student, I want front-end work checked against defined assertions, so that "looks right" is not the standard.
9. As a student, I want to see my submission history for a problem, so that I can see how my solution improved.
10. As a student, I want a written editorial after I solve or give up, so that I learn the better approach rather than only that mine worked.
11. As a student, I want to see the time and space complexity of the model solution, so that I learn to reason about efficiency.

### Student — building

12. As a student, I want a real development environment in the browser with a terminal and a filesystem, so that I can build an actual application.
13. As a student, I want my environment to persist between sessions, so that I do not start again each time.
14. As a student, I want a starter repository for a project, so that I begin from a working skeleton.
15. As a student, I want to read a project brief with explicit requirements and the rubric I will be marked against, so that I know what is expected.
16. As a student, I want a project broken into milestones, so that a six-week build is a series of achievable steps.
17. As a student, I want each milestone reviewed before the next unlocks, so that I do not build six weeks of work on a wrong foundation.
18. As a student, I want to submit a repository link and a deployed application link, so that my work is assessed as it would be in reality.
19. As a student, I want automated checks to tell me whether my submission builds and passes its tests before a human reviews it, so that I do not waste a review on something broken.
20. As a student, I want written and spoken feedback on my project against the rubric, so that I know specifically what to improve.
21. As a student, I want to resubmit after addressing feedback, so that a project is iterative rather than a single verdict.

### Student — the programme

22. As a student, I want to see the whole path of my programme laid out, so that I know where I am and what is coming.
23. As a student, I want later stages locked until I complete their prerequisites, so that I am not lost in material I am not ready for.
24. As a student, I want to see which specific skills I have demonstrated, so that my progress is expressed as capability rather than as content consumed.
25. As a student, I want a capstone project that draws on the whole programme, so that finishing means something.
26. As a student, I want my certificate to require the capstone, so that it is worth showing.

### Student — evidence

27. As a student, I want a public profile showing my completed projects, so that I can send one link to an employer.
28. As a student, I want my demonstrated skills on that profile, so that it says what I can do rather than what I attended.
29. As a student, I want my verified certificates on that profile, so that claims on it are checkable.
30. As a student, I want to control what appears on my profile, so that unfinished work is not published without my consent.
31. As a student, I want my profile to work for someone with no account, so that an employer can open it.

### Instructor — authoring

32. As an instructor, I want to author a coding problem with a statement, constraints and examples, so that problems are unambiguous.
33. As an instructor, I want to define visible and hidden test cases separately, so that students cannot fit a solution to the examples.
34. As an instructor, I want to set per-language starter code and time limits, so that a problem is fair across languages.
35. As an instructor, I want to write the editorial with a model solution, so that students learn the better approach.
36. As an instructor, I want to validate my own test cases against a reference solution before publishing, so that a broken problem does not reach students.
37. As an instructor, I want to author a project brief with milestones and a rubric, so that expectations and marking are stated up front.
38. As an instructor, I want automated check results shown alongside a submission, so that my review starts from working code.
39. As an instructor, I want similarity results shown on a submission, so that I know before I mark it.
40. As an instructor, I want to review a milestone and either pass it or return it with feedback, so that a student is not blocked or waved through.

### Owner — running a programme

41. As the platform owner, I want to compose a learning path from batches, problem sets and projects, so that a programme is a defined sequence.
42. As the platform owner, I want to define prerequisites between stages, so that the sequence is enforced rather than suggested.
43. As the platform owner, I want to define which skills each item demonstrates, so that skill maps mean something.
44. As the platform owner, I want to see how far each student is through a path, so that I know who is stalling.
45. As the platform owner, I want to control execution costs, so that a runaway usage pattern does not produce an unexpected bill.
46. As the platform owner, I want development environments to shut down when idle, so that I am not paying for containers nobody is using.
47. As the platform owner, I want plagiarism flags surfaced for review rather than acted on automatically, so that an accusation is always a human decision.

## Implementation Decisions

### Code execution: bought, not built

- **A managed execution service runs submitted code.** The platform does not operate its own sandbox. This is a deliberate refusal of a problem: safely executing untrusted code requires container isolation, resource limits, syscall filtering, network egress control and continuous attention to escape techniques. It is the highest-severity risk in the entire plan and it is available as a commodity.
- **Execution is abstracted behind an internal interface** from the outset, so that changing provider — or self-hosting later, if volume ever justifies it — does not touch the problem model, the submission model or any user-facing surface.
- **Submissions are queued, never executed inline with the request.** The queue built in Phase 1 carries them. A submission returns immediately with a pending verdict; the result arrives by notification.
- **Execution is rate-limited per student.** Running against sample cases is deliberately unlimited from the student's point of view but bounded in practice, because each run has a direct monetary cost and an unbounded loop of runs is both an abuse vector and a billing incident.
- **Front-end problems execute in a sandboxed frame in the student's browser**, with assertions evaluated against the rendered result. No server execution, no per-run cost, immediate feedback. This covers the markup, styling and browser-scripting cases entirely.

### Problems and test cases

- **A problem is independent of any batch or path**, in the same way a question is independent of any test — this is the same decision made in Phase 3 and for the same reasons. Problems are tagged by topic and difficulty and reused across paths.
- **Test cases are visible or hidden.** Visible cases are shown in the statement and runnable on demand. Hidden cases decide the verdict and are never disclosed, including in error output — a failure reports which hidden case failed and the nature of the failure, never its input.
- **Per-language configuration** covers starter code, time limit and memory limit, because a limit fair in a compiled language is not fair in an interpreted one.
- **A problem cannot be published until a reference solution passes every case.** This is enforced, not advised. A broken problem reaching a cohort is expensive in support and in trust.
- **Verdicts are a closed set**: accepted, wrong answer, time limit exceeded, memory limit exceeded, runtime error, compilation error, and an internal error distinct from all of them so that a platform fault is never reported to a student as their mistake.

### The editor

- **An established browser editor is adopted**, lazy-loaded, and never present in the bundle of a route that does not need it. It is a heavy dependency and the learner application is an installable progressive web app whose payload matters.
- **Editor state persists per student per problem**, so that returning to a partially solved problem restores the work.
- **Submission history is retained** with its verdict and the code submitted, so that a student can see their progress and an instructor can see the path to a solution.

### Cloud development environments

- **This is the most expensive item in the entire plan** and it is scoped tightly on that basis. Environments are provisioned only for project work in a career path, never for individual practice problems, which the editor and judge serve adequately.
- **Environments hibernate aggressively on idle and are reclaimed after a defined dormancy**, with the workspace preserved. Persistent compute for inactive students is the failure mode that makes this feature unaffordable.
- **Per-environment resource ceilings and per-student concurrency limits are enforced**, and consumption is measured per student so that cost is attributable rather than a single opaque line.
- **The provisioning provider is abstracted** behind an interface, as with execution.
- **Environments have controlled network egress.** A development container with unrestricted outbound access is an abuse vector regardless of who is using it.

### Projects and review

- **A project brief carries requirements, a rubric and an ordered set of milestones.** The rubric is the same rubric model built in Phase 3; nothing about grading is reimplemented.
- **Milestones unlock in sequence and each is reviewed before the next opens.** This is the mechanism that prevents a student disappearing for six weeks and submitting nothing, and it is the reason milestones exist rather than a single deadline.
- **Submission is a repository reference plus an optional deployment reference**, not an upload. The work being assessed is the repository.
- **Automated checks run in an isolated environment with no credentials and no network access beyond fetching the repository.** They report build status, lint status and test results, and they run before a submission enters the review queue. They advise; they never decide.
- **Similarity screening compares submissions against each other within and across cohorts, and against public sources.** It produces a score and the matched regions for human review. It never blocks a submission, never notifies a student, and never records an accusation — a flag is an input to a human decision and nothing more. The policy for what a match means is owner-defined and stated to students in advance.
- **Review uses the Phase 3 grading queue and feedback mechanisms**, including spoken and screen-captured feedback, which is markedly better suited to code review than written comments.
- **Resubmission after feedback is expected**, and each cycle is retained.

### Learning paths and skills

- **A path is an ordered sequence of stages**, each referencing a batch, a problem set, or a project, with prerequisites expressed between stages. A path is not a batch and does not replace one — it composes them.
- **Enrolment is in a path**, which grants access to the batches its stages reference. Access checks remain the responsibility of the single access module established in Phase 1; paths add a source of access, not a second evaluator.
- **A skill is demonstrated by completing items tagged with it**, at a defined threshold. The skill taxonomy is owner-managed configuration, consistent with every other taxonomy in the system.
- **A capstone is a project stage marked as gating the path's credential.** Certificate issuance for a path requires it, extending the completion-criteria mechanism built in Phase 4.

### Portfolios

- **A portfolio is public, unauthenticated, and opt-in per item.** Nothing appears without the student publishing it. An employer must be able to open it with no account.
- **It discloses only what the student has published** plus verified certificates, and links to certificate verification rather than asserting validity itself.
- **Published project work is a snapshot**, so that a student changing a repository later does not silently alter what was reviewed and shown.

## Testing Decisions

### The seam

Unchanged: **one seam, at HTTP, against a booted application and a real
ephemeral Postgres**, with an injected clock and inline job execution.

Two additions specific to this phase:

- **The execution provider is stubbed at the network boundary**, not at the service boundary. Tests exercise the real submission pipeline, the real queue and the real verdict handling, with only the outbound call intercepted. Stubbing at the service boundary would leave the pipeline — which is where the defects will be — untested.
- **Verdict handling is tested by driving the stub**, including every failure and every provider fault. The internal-error verdict in particular must be provably distinguishable from a student's mistake, since misreporting a platform fault as a wrong answer is a trust defect rather than a cosmetic one.

Browser-executed front-end problems have no server-observable component beyond
the recorded result, and are tested at that boundary only. The same limitation
accepted in Phase 4 applies.

### What is tested

Execution and review correctness join money and access as paths warranting real
coverage, because a wrong verdict is indistinguishable from an unfair one:

- **Hidden test case confidentiality** — that no hidden input is disclosed through any verdict, error message, timing signal or API response. This is the highest-value test in the phase.
- **Verdict mapping** — that every provider outcome maps to the correct verdict and that provider faults produce an internal error, never a wrong answer.
- **Submission queueing** — that a submission never executes inline, that a result attaches to the correct submission, and that a duplicate result is idempotent.
- **Execution rate limiting** — that limits are enforced per student, since each run has a direct cost.
- **Problem publication gate** — that a problem with a failing reference solution cannot be published.
- **Milestone sequencing** — that a locked milestone cannot be submitted to and that passing one opens exactly the next.
- **Path prerequisites** — that a stage is unreachable until its prerequisites are complete, evaluated through the single access module.
- **Skill demonstration** — that a skill is credited only at its defined threshold.
- **Capstone gating** — that a path certificate cannot be issued without the capstone.
- **Portfolio disclosure** — that an unpublished item is unreachable by an unauthenticated request, and that no unpublished data leaks through the public profile.
- **Environment limits** — that per-student concurrency ceilings are enforced and that idle reclamation occurs, tested through the clock.

### Prior art

Phases 1 through 4. The Phase 3 grading and rubric tests are the direct pattern
for project review; the Phase 2 queue and provider-stubbing patterns apply to
execution.

## Out of Scope

- **Self-hosted code execution.** Deliberately declined. The abstraction exists so this can be revisited if volume ever justifies it, but operating a sandbox is not in scope.
- **Automated grading of code quality or correctness beyond test cases.** Automated checks report build, lint and test status. Judgement of design, approach and readability is human in this phase. AI-assisted code review is Phase 6.
- **AI hints, AI code review and AI-generated problems.** Phase 6. Everything in this phase is authored by humans and judged by test cases.
- **Mentor assignment, one-to-one sessions and mock interviews.** Phase 6, and they are staffing commitments as much as features.
- **The job board and placement support.** Phase 6, and it is a different business with different obligations.
- **Offline development.** Environments are cloud-hosted and require connectivity.
- **Collaborative editing or pair programming.** Not requested.
- **Any change to exam-preparation assessment.** The question bank and the quiz engine are unchanged; coding problems are a parallel model, deliberately not forced into the question schema, because their authoring, execution and verdict semantics share almost nothing with a multiple-choice question.

## Further Notes

- **This phase is a second product, not a feature.** It shares identity, access, payments, notifications and grading with the exam-preparation product and shares almost nothing else. It should be scoped, staffed and judged accordingly, and the temptation to force coding problems into the question bank should be resisted — they are not questions.
- **Cost is a design constraint here in a way it is nowhere else in the plan.** Execution is priced per run and development environments are priced per running hour. Rate limits, idle reclamation and per-student attribution are not optimisations to add later; they are the difference between a viable feature and an unbounded bill. They should be built first, not last.
- **Thirteen weeks contains three substantial builds** — the judge and editor pipeline, cloud environments, and the project review chain — plus paths and portfolios. Cloud environments are the most separable: the judge and editor deliver a working practice product without them, and a project can be submitted as a repository built on a student's own machine. If this phase runs long, environments are the item to defer.
- **Similarity screening will produce false positives**, particularly on scaffolded projects where every student starts from the same template. The policy must account for this before the first flag reaches an instructor, and the decision that a flag is never an accusation must hold under pressure.
- **Hidden test case confidentiality is the security property of this phase**, in the way that access control was Phase 1's. Timing differences, error text and response shape are all disclosure channels, and the test for it is worth more than any other in this specification.
- The career track changes what a certificate means. An exam-preparation certificate records attendance and assessment; a capstone-gated programme credential makes a claim about capability that someone may hire on. That is a reason to keep the capstone gate strict.
