# 13 - The unhelpful-answer set is a first-class report

**What to build:** Answers students marked unhelpful are collected and surfaced to the owner grouped by batch, subject and topic.

**This is the highest-value signal the AI layer produces and it is nearly free to collect.** It maps where content and teaching are weakest. Leaving it in a table unread is the failure mode the spec calls out.

**Blocked by:** 11

**Status:** partial
**Covered by:** test/ai-escalation.int-spec.ts

- [x] Every unhelpful mark is recorded with the question, the answer and the context
- [ ] The owner can read them grouped by batch, subject and topic
- [ ] The report distinguishes an answer marked unhelpful from one that failed to generate
- [ ] An instructor can see the unhelpful set for their own batches
- [x] A student cannot read another student's doubts through this report
