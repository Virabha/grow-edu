# 16 - Idle hibernation and dormancy reclamation

**What to build:** Environments hibernate aggressively on idle and are reclaimed after a defined dormancy, with the workspace preserved.

**Persistent compute for inactive students is the failure mode that makes this feature unaffordable.**

**Blocked by:** 15

**Status:** ready-for-agent

- [ ] An idle environment hibernates after an owner-configured period
- [ ] A dormant environment is reclaimed after an owner-configured period
- [ ] Reclamation preserves the workspace and a later request restores it
- [ ] Hibernation and reclamation run as queued jobs driven by the injected clock
- [ ] Activity resets the idle timer
