# 17 - Scheduled publication

**What to build:** The owner can approve something now and have it publish later, so a batch starting on a Monday does not need anyone at a desk on Monday morning.

Publication is a scheduled job, not a request-triggered state change.

**Blocked by:** 01 - Job queue and scheduler; 02 - Injectable clock; 16 - Approval queue

**Status:** ready-for-agent

- [ ] An item can be approved with a future publication time
- [ ] The item is invisible to students until that time, then becomes visible without anyone acting
- [ ] Advancing the clock past the publication time publishes it in tests
- [ ] A scheduled publication can be cancelled or rescheduled before it fires
