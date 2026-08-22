# 44 - [FRONTEND] Report builder and dashboards

**What to build:** The owner surface for composing a report from the dimension and measure palette, saving it, sharing it, scheduling it and exporting it, plus the funnel and retention dashboards.

**The palette comes from the server.** A frontend that hardcodes the dimension list will silently diverge from what the server accepts.

**Blocked by:** 30, 31, 32, 33, 34

**Status:** needs-frontend-work
**Note:** All five blocking backend tickets are partial, none reached done. Ticket 30 (report-builder): 4/5 criteria verified, missing row-limit test. Ticket 31 (saved-reports): 3/5, scheduling and export not implemented or tested. Ticket 32 (funnel-analysis): 4/5, viewer-scoped filtering not implemented. Ticket 33 (retention-cohorts): 2/5, non-recomputation test is vacuous and failure-resilience test does not simulate a failure. Ticket 34 (instructor-comparison): 0/5, no integration test file exists.

- [ ] The dimension and measure palette is fetched, not hardcoded
- [ ] A composed report can be saved, shared and scheduled
- [ ] The funnel renders unknown stages distinctly from zero stages
- [ ] Retention cohorts render from materialised data
- [ ] Export produces what the viewer sees
