# 36 - Weak-topic map

**What to build:** An aggregation over tagged attempt outcomes, computed across all of a student's attempts rather than per test, telling them which topics they are weak in.

It is materialised on a schedule rather than computed per request, because it spans a student's whole history.

**Blocked by:** 33

**Status:** ready-for-agent

- [ ] The map reflects outcomes across several tests, not the most recent one
- [ ] A topic the student has never attempted is absent rather than reported as weak
- [ ] The map is materialised by a scheduled job and readable between runs
- [ ] Running the job twice produces the same map
- [ ] Sub-topic outcomes roll up into their parent topic
