# 23 - An attempt scores against the version it saw

**What to build:** Each answer in an attempt records the question version it was answered against, and scoring uses that version.

Editing a question after a student has sat a test must not change what they scored.

**Blocked by:** 05, 21

**Status:** ready-for-agent

- [ ] Editing a question's correct answer does not change an already-submitted attempt's score
- [ ] A result reads back the prompt the student actually saw, not the current one
- [ ] An attempt in progress when the question is edited continues against the version it started with
- [ ] A new attempt started after the edit uses the new version
- [ ] The version is recorded per answer, not per attempt
