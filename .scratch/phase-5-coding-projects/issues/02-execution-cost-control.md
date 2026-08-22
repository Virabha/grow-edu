# 02 - Execution rate limiting and cost attribution

**What to build:** Per-student rate limits on execution, and measurement of consumption attributed to the student who caused it.

**Cost is a design constraint in this phase in a way it is nowhere else.** Each run has a direct monetary cost and an unbounded loop of runs is both an abuse vector and a billing incident. This is built first, not last — it is the difference between a viable feature and an unbounded bill.

**Blocked by:** 01

**Status:** done
**Covered by:** test/coding-execution.int-spec.ts

- [x] Running and submitting are rate-limited per student, and the limits are owner-managed configuration
- [x] Exceeding a limit is refused clearly rather than silently queued
- [x] Every execution is recorded against the student who caused it
- [x] Consumption is reportable per student rather than as one opaque total
- [x] A student who is rate-limited on running can still see their existing results
