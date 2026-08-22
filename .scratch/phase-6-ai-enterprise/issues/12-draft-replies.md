# 12 - An escalated doubt arrives pre-drafted

**What to build:** On escalation, a queued job drafts a reply for the instructor. The instructor edits and sends; the sent answer is attributed to the instructor.

**The draft is for the instructor, never for the student.** A drafted reply must not be visible to the student until an instructor has committed it.

**Blocked by:** 11

**Status:** done
**Covered by:** test/ai-escalation.int-spec.ts

- [x] Escalation queues a draft reply for the instructor
- [x] The draft is never visible to the student
- [x] The instructor can discard the draft and write their own
- [x] A sent reply is attributed to the instructor, not to automation
- [x] A failed draft leaves the doubt answerable rather than blocked
