# 32 - Where prospective students drop out

**What to build:** A funnel report over the captured events showing progression from view to catalogue to checkout start to completion, broken down by source.

**The report is only as honest as the capture.** A stage with no capture must read as unknown rather than as zero, or the owner will conclude the wrong thing about where the loss is.

**Blocked by:** 29, 30

**Status:** partial
**Covered by:** test/funnel-analytics.int-spec.ts

- [x] The funnel shows progression across the captured stages
- [x] A stage with no data reads as unknown rather than zero
- [x] The funnel breaks down by source
- [x] A date range bounds the report
- [ ] The report is scoped to the viewer
