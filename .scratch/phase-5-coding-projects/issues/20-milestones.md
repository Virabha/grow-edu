# 20 - Milestones unlocking in sequence

**What to build:** A project is broken into an ordered set of milestones. Each is reviewed before the next opens.

**This is the mechanism that prevents a student disappearing for six weeks and submitting nothing**, and it is the reason milestones exist rather than a single deadline.

**Blocked by:** 19

**Status:** done
**Covered by:** test/projects.int-spec.ts, test/project-review.int-spec.ts

- [x] A project carries ordered milestones
- [x] Only the first milestone is open initially
- [x] Submitting to a locked milestone is refused
- [x] Passing a milestone opens exactly the next one and no more
- [x] Returning a milestone with feedback leaves it open and the next one locked
