# 02 - Every model call records what it cost and who it was for

**What to build:** A usage record per call: feature, organisation, model, input tokens, output tokens, cache-read tokens, cache-write tokens. An owner-facing report aggregates by feature and by organisation over a period.

**An AI feature whose cost cannot be attributed cannot be managed.** Cache-read tokens are recorded as their own column because a zero cache-read rate is the specific failure this phase must be able to see.

**Blocked by:** 01

**Status:** partial
**Covered by:** test/ai-foundation.int-spec.ts

- [ ] Every model call writes a usage row carrying feature, organisation and model
- [x] Input, output, cache-read and cache-write tokens are stored separately
- [ ] A call that fails still records the attempt and its feature
- [ ] The owner can read cost aggregated by feature and by organisation for a date range
- [x] A student cannot read cost data through any path
