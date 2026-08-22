# 07 - Grounding is scoped to what the asking student may access

**What to build:** Retrieval assembles context for a question from the organisation's own content — lesson text, transcript segments, notes and published doubt answers — restricted to batches the asking student is enrolled in.

**This is the highest-value test in the phase and it is a data-leak boundary.** Content from another organisation, or from a batch the student is not enrolled in, must be unreachable through retrieval even when it is the best textual match.

**Blocked by:** 01

**Status:** not-started

- [ ] Retrieval returns content only from batches the asking student is enrolled in
- [ ] Content belonging to another organisation is never retrieved
- [ ] A student enrolled in one batch cannot surface another batch's lesson through a crafted question
- [ ] Retrieval draws on transcript segments as well as lesson text
- [ ] An unenrolled student retrieving against a batch gets nothing, not an error revealing the batch exists
