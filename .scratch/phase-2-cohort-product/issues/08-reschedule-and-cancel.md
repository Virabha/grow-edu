# 08 - Reschedule and cancel notify every student

**What to build:** Rescheduling or cancelling a session is a single operation that notifies every enrolled student. It is not an edit to a start time plus a separate manual announcement.

The instructor's request returns immediately; the fan-out is queued.

**Blocked by:** 03 - Notification infrastructure; 07 - Recurring schedule

**Status:** ready-for-agent

- [ ] Rescheduling a session notifies every enrolled student exactly once
- [ ] Cancelling a session notifies every enrolled student exactly once
- [ ] The instructor's request does not block on the fan-out
- [ ] The timetable reflects the new time, or the cancellation, for every student
- [ ] Rescheduling a session that is part of a series does not reschedule the rest of the series
