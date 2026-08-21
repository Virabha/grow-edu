# 03 - Question bank: the independent question

**What to build:** Questions become independent entities that a test references rather than owns. This inverts the current model in which a question exists only as a row belonging to one quiz.

Subject, topic and difficulty are required at creation. An untagged question cannot exist — not as a draft, not via import, not via any interface.

The authored difficulty and the observed one are separate fields from the start; collapsing them makes calibration impossible later.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] A question can be created without reference to any test and read back on its own
- [ ] Creating a question without subject, topic or difficulty is refused
- [ ] The same question can be referenced by two different tests
- [ ] Authored difficulty is set by the author; observed difficulty starts empty and is never writable directly
- [ ] A question carries an explanation that is returned to students only after submission
