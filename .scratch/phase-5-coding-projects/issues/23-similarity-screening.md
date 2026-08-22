# 23 - Similarity screening, advisory only

**What to build:** Submissions compared against each other within and across cohorts, and against public sources, producing a score and the matched regions for human review.

**It never blocks a submission, never notifies a student, and never records an accusation. A flag is an input to a human decision and nothing more.** Screening will produce false positives, particularly on scaffolded projects where every student starts from the same template — the policy must account for that before the first flag reaches an instructor.

**Blocked by:** 21

**Status:** done
**Covered by:** test/project-review.int-spec.ts

- [x] Screening produces a score and the matched regions
- [x] A flag never blocks a submission and never changes its state
- [x] A student is never notified of a flag and cannot see one
- [x] Results are surfaced to staff for review, never acted on automatically
- [x] The threshold at which a flag is surfaced is owner-managed configuration
