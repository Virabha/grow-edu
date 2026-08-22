# 30 - A report is built from dimensions and measures

**What to build:** A defined palette of dimensions and measures the owner composes into a report — not arbitrary query access.

**Not arbitrary query access.** A report builder that accepts SQL is an injection surface and an availability risk; the palette is the security boundary.

**Blocked by:** nothing

**Status:** partial
**Covered by:** test/report-builder.int-spec.ts

- [x] The owner composes a report from a defined dimension and measure palette
- [x] A dimension outside the palette is rejected
- [x] No client-supplied string reaches a query as SQL
- [x] A report with no matching rows returns empty rather than erroring
- [ ] An expensive report is bounded rather than allowed to run unbounded
