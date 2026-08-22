# 22 - Automated checks before review

**What to build:** Build, lint and test status computed for a submission before it enters the review queue, so an instructor's review starts from working code.

**Checks run in an isolated environment with no credentials and no network access beyond fetching the repository. They advise; they never decide.**

**Blocked by:** 21

**Status:** done
**Covered by:** test/project-review.int-spec.ts

- [x] Checks run as a queued job, never inline with the submission request
- [x] Build, lint and test status are reported separately
- [x] Results are shown to the student and alongside the submission for the reviewer
- [x] A failing check never blocks submission or decides a grade
- [x] A check-harness fault is distinguishable from the student's code failing
