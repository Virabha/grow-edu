# 18 - Code review runs after the judge, never instead of it

**What to build:** A judged submission receives commentary on approach, complexity, naming and structure, alongside a complexity comparison with the reference solution.

**Test cases decide correctness; the model comments on quality.** A review that contradicts the verdict, or that is treated as a verdict, breaks the Phase 5 contract that the judge is authoritative.

**Blocked by:** 01, 05, 21

**Status:** partial
**Covered by:** test/ai-code-review.int-spec.ts

- [ ] Review runs only after a judged verdict exists
- [x] Review never alters the verdict
- [x] Commentary covers approach, complexity, naming and structure
- [x] A failed review leaves the verdict and the submission intact
- [x] Review is queued, not inline with submission
