# 11 - Escalation is one action away and carries the automated answer

**What to build:** A student marks an answer unhelpful; the doubt reaches an instructor's inbox carrying the automated answer that did not help.

**The instructor must see what the student was already told.** Without it the instructor may contradict the automated answer unknowingly, which is worse for the student than no automation at all.

**Blocked by:** 08, 10

**Status:** partial
**Covered by:** test/ai-escalation.int-spec.ts

- [x] Marking an answer unhelpful moves the doubt to an instructor inbox
- [x] The escalated doubt carries the automated answer that was rejected
- [ ] The student is told a human has been reached
- [x] Escalation is available on every automated answer, not only failed ones
- [ ] An escalated doubt cannot be answered automatically a second time
