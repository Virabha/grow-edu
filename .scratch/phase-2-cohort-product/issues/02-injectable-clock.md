# 02 - Injectable clock

**What to build:** Time comes from a service the tests can control, not from the system clock, everywhere a time read decides something. A test can move time forward and observe a recurrence generating, a drip rule unlocking, a contract expiring, a batch changing state, or a test window opening and closing.

Scope is deliberately the reads that gate behaviour, not all 137 date constructions in the backend. Record stamping such as an updated-at column keeps using the system clock, because controlling a stamp adds no test value.

**Blocked by:** None - can start immediately

**Status:** done 2026-08-21

- [x] A test can set the current time and every behaviour-gating read observes it
- [x] Contract expiry, quiz open and close windows, and access-window expiry all read the injected clock
- [x] No test anywhere waits on real elapsed time to assert a time-dependent behaviour
- [x] Record stamping is untouched and still uses the system clock
