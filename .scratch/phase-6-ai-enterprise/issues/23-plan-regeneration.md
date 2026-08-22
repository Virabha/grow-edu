# 23 - Regeneration is scheduled, not on demand

**What to build:** Plans regenerate on a repeating job, adjusting when a student falls behind or races ahead.

**Stability is the feature.** A plan the student can regenerate at will is a plan they will reroll instead of following, and every reroll is a model call.

**Blocked by:** 22

**Status:** partial
**Covered by:** test/ai-plan-regeneration.int-spec.ts

- [x] Regeneration runs on a repeating job
- [x] A student cannot force regeneration on demand
- [x] Falling behind shifts the plan rather than accumulating an impossible backlog
- [ ] Racing ahead pulls work forward
- [x] A regeneration failure leaves the previous plan in place
