# 02 - Per-type completion semantics

**What to build:** Each lesson type declares its own completion rule. A video completes at a watched threshold, a document at a viewed-pages threshold, a quiz at submission, a live session at attendance, audio at a listened threshold.

Progress is not one percentage computed the same way for everything, and pretending it is produces a number nobody trusts.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Each type completes by its own rule and not by any other type's
- [ ] A video below the watched threshold is not complete; at or above it, it is
- [ ] A live session completes on recorded attendance, not on opening the lesson
- [ ] Batch progress aggregates completion across mixed types correctly
- [ ] Thresholds are owner-managed configuration, not literals in code
