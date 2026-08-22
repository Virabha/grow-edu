# 09 - Every citation resolves to a lesson the student may open

**What to build:** Before an answer is shown, each citation is checked against real, accessible lessons. An answer citing content the student cannot access is rejected rather than shown.

**A citation is a promise the student can follow.** A fabricated or inaccessible citation is both a broken promise and a leak signal — it tells the student that content exists which they cannot see.

**Blocked by:** 07, 08

**Status:** partial
**Covered by:** test/ai-doubts.int-spec.ts

- [x] A citation pointing at a non-existent lesson causes the answer to be rejected
- [x] A citation pointing at a lesson the student cannot access causes the answer to be rejected
- [ ] A rejected answer routes the doubt to a human rather than showing nothing
- [ ] Every citation shown resolves to a lesson the student can open
- [ ] Citation checking happens before the answer is visible, not after
