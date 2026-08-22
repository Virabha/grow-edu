# 36 - Articles are published to rank

**What to build:** Article publishing on the existing blog module, with drafts, scheduling and publication.

**`cms` is 1,601 lines and 44 endpoints with no tests** per `AUDIT.md` §8.2. Anything this ticket touches there should gain the tests it never had rather than inheriting the gap.

**Blocked by:** nothing

**Status:** done
**Covered by:** test/articles.int-spec.ts

- [x] An article can be drafted, scheduled and published
- [x] A draft is not publicly readable
- [x] A scheduled article publishes through the existing job queue
- [x] Publication is reversible
- [x] The paths this ticket touches gain tests
