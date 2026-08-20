# 09 - Class-starting-soon reminder

**What to build:** A student is reminded shortly before a live class starts, so that missing it takes an active choice rather than losing track of time.

The reminder is a scheduled job, and it does not fire for a session that has been cancelled or for a student who is no longer enrolled.

**Blocked by:** 03 - Notification infrastructure; 07 - Recurring schedule

**Status:** ready-for-agent

- [ ] An enrolled student is reminded before a live session starts
- [ ] A cancelled session produces no reminder
- [ ] A student whose enrolment has been revoked receives no reminder
- [ ] A reminder is sent once, not once per delivery channel retry
- [ ] Moving the clock forward past the reminder point triggers it in tests
