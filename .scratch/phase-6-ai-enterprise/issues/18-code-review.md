# 18 - Code review runs after the judge, never instead of it

**What to build:** A judged submission receives commentary on approach, complexity, naming and structure, alongside a complexity comparison with the reference solution.

**Test cases decide correctness; the model comments on quality.** A review that contradicts the verdict, or that is treated as a verdict, breaks the Phase 5 contract that the judge is authoritative.

**Blocked by:** 01, 05, 21

**Status:** not-started

- [ ] Review runs only after a judged verdict exists
- [ ] Review never alters the verdict
- [ ] Commentary covers approach, complexity, naming and structure
- [ ] A failed review leaves the verdict and the submission intact
- [ ] Review is queued, not inline with submission
