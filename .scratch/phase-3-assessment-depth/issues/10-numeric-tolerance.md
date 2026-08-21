# 10 - Numeric answers with tolerance

**What to build:** A numeric question accepts a typed number and is scored against a value with a per-question tolerance, absolute or relative.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] An answer exactly at the tolerance boundary is correct
- [ ] An answer just beyond it is wrong
- [ ] Relative tolerance scales with the expected magnitude; absolute does not
- [ ] A non-numeric submission is wrong rather than an error
- [ ] Zero tolerance requires an exact match
