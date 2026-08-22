# 25 - A returning student links rather than duplicating

**What to build:** First sign-in through an institutional provider links to the existing account by verified email, reusing the Phase 1 merge mechanism.

**A student who already has an account must not acquire a second one.** Duplicate accounts split enrolments, progress and payment history, and the damage is discovered long after the cause.

**Blocked by:** 24

**Status:** partial
**Covered by:** test/sso.int-spec.ts

- [x] First sign-in with a matching verified email links to the existing account
- [ ] Linking reuses the Phase 1 merge mechanism rather than a parallel one
- [x] An unverified email does not silently link
- [ ] A linked account keeps its existing enrolments and progress
- [x] Signing in twice does not create a second link
