# 06 - A provider outage leaves the student on the human path

**What to build:** Every AI feature has a defined behaviour when the provider times out, errors or returns something unusable: the student sees a clear state and the human path remains open.

**The failure mode to avoid is a silent one.** A doubt that appears answered but is not, or a queue entry that never resolves, is worse than an honest "this could not be answered automatically — an instructor has been notified".

**Blocked by:** 01, 05

**Status:** partial
**Covered by:** test/ai-doubts.int-spec.ts, test/ai-question-generation.int-spec.ts

- [ ] A provider timeout on a doubt routes it to an instructor with a visible state
- [x] A provider error never leaves a record stuck in a pending state indefinitely
- [ ] The student is told plainly that automation failed rather than shown an empty answer
- [x] A failed generation for an instructor feature reports the failure rather than producing nothing
- [ ] Repeated provider failure does not retry without bound
