# 07 - A recurring schedule generates sessions

**What to build:** An instructor defines a recurrence once - for example every Monday and Thursday at 6pm for twelve weeks - and concrete sessions are generated from it by a scheduled job, ahead of time.

Generated sessions remain individually editable. Editing one does not detach it from the series, and the edit survives the next regeneration.

**Blocked by:** 01 - Job queue and scheduler; 02 - Injectable clock

**Status:** ready-for-agent

- [ ] An instructor defines a recurrence and sessions appear on the timetable without creating them one by one
- [ ] Sessions are materialised ahead of time by a job, not on demand at read time
- [ ] Editing a single generated session keeps it in the series
- [ ] An edit to a generated session survives the next regeneration and is not overwritten
- [ ] Advancing the clock generates the next window of sessions
