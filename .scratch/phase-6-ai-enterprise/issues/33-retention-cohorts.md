# 33 - Retention by joining month and by source

**What to build:** Cohort retention computed on a schedule and materialised, not computed per request.

**Computed per request this does not survive real data volume.** Materialisation is the design, not an optimisation to add later.

**Blocked by:** 29, 30

**Status:** partial
**Covered by:** test/retention-cohorts.int-spec.ts

- [x] Cohorts are computed on a repeating job and materialised
- [ ] A read serves materialised rows rather than recomputing
- [x] Cohorts break down by joining month and by source
- [ ] A recomputation failure leaves the previous materialisation readable
- [ ] The report is scoped to the viewer
