# 15 - Spaced repetition scheduler

**What to build:** A scheduler that decides what a student revises and when. Its item source is the Phase 3 ERROR NOTEBOOK plus explicitly bookmarked questions. It does not schedule content the student has never got wrong.

The scheduling algorithm is an implementation detail behind a stable interface. It will be tuned. Nothing outside the scheduler may depend on its intervals.

**Blocked by:** None - can start immediately

**Status:** ready-for-agent

- [ ] Items derive from the error notebook and from bookmarked questions, and from nothing else
- [ ] A notebook entry the student marks resolved leaves the schedule
- [ ] Intervals advance as the algorithm defines, exercised through the queue rather than by calling the algorithm
- [ ] A correct review pushes the next due date further out; a wrong one pulls it in
- [ ] No caller outside the scheduler reads or asserts on a specific interval length
