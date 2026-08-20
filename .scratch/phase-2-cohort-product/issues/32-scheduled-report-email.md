# 32 - Scheduled report email

**What to build:** A corporate admin can have a summary emailed on a schedule, so they stay informed without logging in.

The email carries the summary and a link to the live view.

**Blocked by:** 01 - Job queue and scheduler; 03 - Notification infrastructure; 29 - Attendance report; 30 - Test performance report

**Status:** ready-for-agent

- [ ] A corporate admin can schedule a recurring summary and choose its cadence
- [ ] The summary arrives on schedule with a link to the live report
- [ ] The summary contains only data within the recipient's contract scope
- [ ] A schedule can be paused and resumed
- [ ] Advancing the clock drives the send in tests
