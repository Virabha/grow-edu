# 23 - Reporting and the moderation queue

**What to build:** A student can report something inappropriate, and the report lands in a moderation queue for staff.

**NOTE FOR THE IMPLEMENTER:** `SPEC-PHASE-4.md` says reporting "routes into the moderation queue established in Phase 2" and that "no new moderation mechanism is built". That is a false premise — no moderation queue exists in the codebase. It has to be built here. Build the minimum that serves community reporting; do not build a general-purpose content-moderation platform.

**Blocked by:** 21, 22

**Status:** ready-for-agent

- [ ] A student can report a post, a reply or a group message with a reason
- [ ] Reports appear in a staff queue scoped to batches that staff member covers
- [ ] Resolving a report records the outcome and the actor
- [ ] A reported item stays readable to staff after removal
- [ ] A student cannot see who reported what
