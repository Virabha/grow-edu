# 05 - Audit log

**What to build:** Every privileged action is recorded: who did it, what they did, what they did it to, what changed where that is meaningful, when, and the request context. The log is append-only and cannot be edited or deleted through any interface.

This lands early on purpose. Later tickets write to it as they are built, rather than the whole phase being swept for audit points at the end.

Impersonation, suspension, payment approval, refunds, content edits and permission changes are all recorded.

**Blocked by:** None - can start immediately

**Status:** done 2026-08-21

- [x] A privileged action produces exactly one audit record naming the actor who performed it
- [x] The record captures before and after values where a change has them
- [x] No interface can edit or delete an audit record
- [x] An action performed while impersonating records both the impersonator and the impersonated account
- [x] The owner can search the log by actor, by target and by time range
