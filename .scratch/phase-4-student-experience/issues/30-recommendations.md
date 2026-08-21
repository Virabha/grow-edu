# 30 - Rule-based recommendations

**What to build:** Recommendations from goal and level. **RULE-BASED, NOT MODEL-DRIVEN** — all AI features are Phase 6 and explicitly out of scope here.

**Blocked by:** 28, 29

**Status:** ready-for-agent

- [ ] Recommendations derive from the student's goal and level and nothing else
- [ ] A student with a goal but no level still gets recommendations
- [ ] A student with neither gets the catalogue's default ordering rather than an error
- [ ] Batches the student is already enrolled in are excluded
- [ ] Nothing here calls a language model
