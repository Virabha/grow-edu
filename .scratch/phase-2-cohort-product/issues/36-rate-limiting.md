# 36 - Rate limiting on sign-in, reset, join-link and message endpoints

**What to build:** Sign-in, password reset, join-link redemption and any endpoint that sends a message are rate limited, because each is a cost-bearing abuse target.

A join link in particular is distributed widely and is the obvious thing to hammer.

**Blocked by:** None - can start immediately

**Status:** ready-for-agent

- [ ] Repeated sign-in attempts from one source are throttled and the refusal is distinguishable from a wrong password
- [ ] Password reset requests are throttled per account and per source
- [ ] Join-link redemption is throttled without preventing a legitimate cohort from joining at the same time
- [ ] Message-sending endpoints are throttled
- [ ] A throttled caller is told when they may retry
