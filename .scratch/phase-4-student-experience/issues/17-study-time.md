# 17 - Study time measurement

**What to build:** Study time is MEASURED, not inferred from page presence. An idle tab does not accrue time. Measurement is event-driven with an inactivity cutoff.

This figure feeds both student motivation and a college's proof-of-engagement reporting. An inflated number is worse than no number.

**Blocked by:** None - can start immediately

**Status:** ready-for-agent

- [ ] Time accrues from activity events, not from a session being open
- [ ] A gap longer than the inactivity cutoff does not accrue
- [ ] Time is attributed to the subject and lesson it was spent on
- [ ] The cutoff is owner-managed configuration, not a literal
- [ ] Totals are driven by the injected clock and are reproducible
