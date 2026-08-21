# 22 - Negative marking floor and skipped treatment

**What to build:** Skipped and wrong are treated differently, and a total cannot fall below the defined floor.

**Blocked by:** 21

**Status:** ready-for-agent

- [ ] A skipped question incurs no penalty
- [ ] A wrong question incurs the placement's negative rule
- [ ] A total that would go below the floor is clamped to it
- [ ] The floor is configurable per test and defaults to zero
- [ ] An all-skipped attempt scores exactly zero, not a negative
