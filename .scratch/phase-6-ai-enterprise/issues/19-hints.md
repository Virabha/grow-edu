# 19 - Hints are graduated, bounded and recorded

**What to build:** A stuck student requests a hint. Hints escalate in specificity across a bounded number of steps, are rate-limited, and each use is recorded against the submission.

**A hint system that produces the answer on the fourth press is a solution system with extra steps.** The final hint must still stop short of the solution, and the bound must be enforced server-side.

**Blocked by:** 01, 05

**Status:** not-started

- [ ] Hints escalate in specificity across a bounded sequence
- [ ] The bound is enforced by the server, not by the client hiding a button
- [ ] Every hint taken is recorded against the submission
- [ ] Hint requests are rate-limited independently of the run rate limit
- [ ] A hint never contains a complete working solution
