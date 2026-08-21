# 17 - Criteria-based test generation

**What to build:** An instructor describes a test by criteria — thirty questions, these five topics, this difficulty spread — and the system composes it from the bank.

Generation is a service rather than an authoring-time convenience, because ticket 18 calls it per student.

**Blocked by:** 06, 15

**Status:** ready-for-agent

- [ ] A generated set honours its per-topic counts exactly
- [ ] A generated set honours its per-difficulty-band counts exactly
- [ ] Generation with insufficient matching questions fails with what was short, rather than silently returning fewer
- [ ] Generation excludes retired questions
- [ ] Generation can be asked to exclude questions a given student has recently seen
