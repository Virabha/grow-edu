# 09 - Hidden test case confidentiality

**What to build:** Nothing about a hidden test case is disclosed to a student through any channel.

**This is the security property of this phase, in the way access control was Phase 1's.** A failure reports which hidden case failed and the nature of the failure — never its input. Timing differences, error text and response shape are all disclosure channels. **The test for this is worth more than any other in this specification.**

**Blocked by:** 08

**Status:** ready-for-agent

- [ ] No hidden input or expected output is returned by any student-reachable route
- [ ] A failing hidden case reports its ordinal and the failure kind, and nothing else
- [ ] Runtime and compilation error output is scrubbed of hidden input before it reaches a student
- [ ] The response shape is identical whether a hidden case exists, passes or fails
- [ ] An instructor still sees hidden cases in full
