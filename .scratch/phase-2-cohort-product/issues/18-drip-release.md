# 18 - Drip release evaluated by the access module

**What to build:** Content unlocks progressively where the owner chooses it, so students follow the cohort rather than racing ahead of the live classes.

An unlock rule on a curriculum item is either a fixed date or an offset from the student's own enrolment. It is evaluated by the single access module established in Phase 1, not reimplemented for each content type.

**Blocked by:** 02 - Injectable clock

**Status:** ready-for-agent

- [ ] An item with a fixed-date unlock is unreachable before that date and reachable after
- [ ] An item with an enrolment-offset unlock is evaluated per student, from their own enrolment date
- [ ] A locked item is refused by the same access module that governs all other batch content
- [ ] A student who cannot yet reach an item is told when it unlocks rather than that it does not exist
- [ ] Staff on the batch can reach locked content
