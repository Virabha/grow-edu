# 20 - Weekly report card

**What to build:** A queued job producing a weekly summary of what a student did and what to revise, emailed to the student and, where a parent account is linked, to the parent. It reuses the Phase 2 notification template system.

**Blocked by:** 17, 34

**Status:** ready-for-agent

- [ ] The report is produced by a queued job, not by a request
- [ ] It goes to the student and to any linked parent
- [ ] It reuses the existing notification templates rather than a parallel mechanism
- [ ] Running the job twice for one week does not send twice
- [ ] A student with no activity that week gets a report saying so rather than an error
