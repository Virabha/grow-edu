# 21 - Waitlist with transactional promotion

**What to build:** The owner can cap a batch's enrolment and queue the overflow, so a cohort or a college's seats are never oversold.

When a place frees, the next person on the waitlist is promoted transactionally. This reuses the seat-allocation concurrency guarantee established in Phase 1 rather than inventing a second mechanism - two students must never be promoted into one freed place.

**Blocked by:** 03 - Notification infrastructure

**Status:** ready-for-agent

- [ ] Enrolment beyond the cap joins a waitlist rather than being refused outright
- [ ] Freeing a place promotes exactly one waitlisted student
- [ ] Two concurrent promotions into one freed place result in exactly one enrolment and one still waiting
- [ ] A promoted student is notified that they are in
- [ ] A student can see their position on the waitlist
