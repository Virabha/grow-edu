# 35 - Cohort figures computed once and cached

**What to build:** Cohort comparison figures — per-question means, the top attempt, rank distribution — are computed once per test and cached rather than recomputed for every student viewing their result.

**Blocked by:** 32, 34

**Status:** ready-for-agent

- [ ] Two students reading their results do not each trigger a recomputation
- [ ] A new submission invalidates the cached figures for that test
- [ ] A regrade that changes a mark invalidates them too
- [ ] The figures are correct immediately after invalidation, not stale
- [ ] Cache absence produces correct figures rather than an error
