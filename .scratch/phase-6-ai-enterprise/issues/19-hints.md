# 19 - Hints are graduated, bounded and recorded

**What to build:** A stuck student requests a hint. Hints escalate in specificity across a bounded number of steps, are rate-limited, and each use is recorded against the submission.

**A hint system that produces the answer on the fourth press is a solution system with extra steps.** The final hint must still stop short of the solution, and the bound must be enforced server-side.

**Blocked by:** 01, 05

**Status:** partial
**Covered by:** test/ai-hints.int-spec.ts

- [x] Hints escalate in specificity across a bounded sequence
- [x] The bound is enforced by the server, not by the client hiding a button
- [x] Every hint taken is recorded against the submission
- [x] Hint requests are rate-limited independently of the run rate limit
- [ ] A hint never contains a complete working solution
