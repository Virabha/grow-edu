# 05 - Question versioning and retirement

**What to build:** Editing a question produces a new version. Questions are retired, never hard-deleted. An attempt references the version it was answered against.

Without this, correcting a typo in a question silently rewrites the history of every attempt already scored against it.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Editing a question increments its version and leaves the prior version readable
- [ ] A retired question cannot be added to a new test but remains readable in historic attempts
- [ ] There is no interface that hard-deletes a question
- [ ] A question with attempts against it cannot have its version history removed
- [ ] Retiring is recorded in the audit log with its actor
