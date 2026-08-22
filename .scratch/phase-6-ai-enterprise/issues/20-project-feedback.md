# 20 - Project feedback is drafted for a reviewer, not sent

**What to build:** An automated first pass on a project submission comments on readability and structure, and may suggest rubric scores. It is delivered to the reviewer.

**Drafted, not sent.** Per the spec, project feedback is for the reviewer. It must not reach the student until a human commits it, and a suggested rubric score is a suggestion until then.

**Blocked by:** 01, 05, 21

**Status:** partial
**Covered by:** test/ai-project-feedback.int-spec.ts

- [x] An automated pass runs on submission and reaches the reviewer
- [x] The draft is never visible to the student
- [x] Suggested rubric scores are stored as suggestions, not as scores
- [x] A reviewer can discard the draft entirely
- [ ] Committed feedback is attributed to the reviewer
