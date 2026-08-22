# 28 - Path enrolment grants access to its batches

**What to build:** Enrolment is in a path, and that enrolment grants access to the batches its stages reference.

**Blocked by:** 26

**Status:** done
**Covered by:** test/learning-paths.int-spec.ts

- [x] Enrolling in a path grants access to every batch its stages reference
- [x] Access is granted through the single access module, not a second evaluator
- [x] Revoking path enrolment withdraws the access it granted
- [x] Access granted directly to a batch is unaffected by path enrolment ending
- [x] A student not enrolled in the path reaches none of its stages
