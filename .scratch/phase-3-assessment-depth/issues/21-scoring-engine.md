# 21 - Scoring across all five behaviours

**What to build:** One scoring pass over a submitted attempt covering single-correct, multiple-correct with each partial-credit rule, numeric with tolerance, and the two human-graded types left unscored.

Tested only through submission and result retrieval, never by calling a scoring function. That is what allows this to be rewritten when observed calibration and adaptive selection arrive.

**Blocked by:** 20

**Status:** ready-for-agent

- [ ] Every objective type scores correctly in one mixed test
- [ ] Human-graded questions contribute nothing to the provisional score and are reported as pending
- [ ] The provisional score plus the pending marks equals the test maximum
- [ ] Scoring is idempotent: re-reading a result does not rescore it
- [ ] A test with no objective questions submits and reports a zero provisional score, not an error
