# 28 - Bulk roster upload

**What to build:** A corporate admin can upload a list of students, so onboarding five hundred people does not depend on five hundred of them clicking a link.

The upload reports what succeeded and what did not, per row, rather than failing wholesale on one bad line.

**Blocked by:** 27 - Corporate roster self-service

**Status:** ready-for-agent

- [ ] A corporate admin can upload a list of students and see the result per row
- [ ] Rows that fail validation are reported with the reason and do not stop the rest
- [ ] The upload cannot exceed the contract's remaining seats, and says so before consuming any
- [ ] Re-uploading a list that overlaps an existing roster does not duplicate anyone
- [ ] A large upload does not block the request that started it
