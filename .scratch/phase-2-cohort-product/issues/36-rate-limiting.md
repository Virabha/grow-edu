# 36 - Rate limiting on sign-in, reset, join-link and message endpoints

**What to build:** Sign-in, password reset, join-link redemption and any endpoint that sends a message are rate limited, because each is a cost-bearing abuse target.

A join link in particular is distributed widely and is the obvious thing to hammer.

**Blocked by:** None - can start immediately

**Status:** done 2026-08-21

- [x] Repeated sign-in attempts from one source are throttled and the refusal is distinguishable from a wrong password
- [x] Password reset requests are throttled per account and per source
- [x] Join-link redemption is throttled without preventing a legitimate cohort from joining at the same time
- [x] Message-sending endpoints are throttled — the only endpoints that send anything today are sign-up, password reset and verification, all throttled. Broadcast (ticket 33) must add its own limit when it lands.
- [x] A throttled caller is told when they may retry
