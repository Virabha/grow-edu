# 06 - The problem publication gate

**What to build:** A problem cannot be published until a reference solution passes every one of its test cases. **This is enforced, not advised.**

A broken problem reaching a cohort is expensive in support and in trust.

**Blocked by:** 04, 05

**Status:** done
**Covered by:** test/coding-problems.int-spec.ts

- [x] Publishing is refused while any case fails the reference solution
- [x] Validation runs through the same execution path students use, not a shortcut
- [x] The instructor sees which case failed and why
- [x] Editing a case or the reference solution after publication re-opens the gate
- [x] A problem that has never been validated cannot be published
