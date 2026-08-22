# 44 - [FRONTEND] Report builder and dashboards

**What to build:** The owner surface for composing a report from the dimension and measure palette, saving it, sharing it, scheduling it and exporting it, plus the funnel and retention dashboards.

**The palette comes from the server.** A frontend that hardcodes the dimension list will silently diverge from what the server accepts.

**Blocked by:** 30, 31, 32, 33, 34

**Status:** needs-frontend-work

- [ ] The dimension and measure palette is fetched, not hardcoded
- [ ] A composed report can be saved, shared and scheduled
- [ ] The funnel renders unknown stages distinctly from zero stages
- [ ] Retention cohorts render from materialised data
- [ ] Export produces what the viewer sees
