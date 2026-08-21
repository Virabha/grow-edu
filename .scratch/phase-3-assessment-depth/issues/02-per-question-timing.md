# 02 - Per-question timing on attempts

**What to build:** The attempt record captures how long a student spent on each question, captured during the attempt rather than inferred afterwards.

This is sequenced early on purpose. It cannot be backfilled, and every timing analysis in this phase is impossible over attempts taken before it exists.

Timing is per question and survives navigating away and back; the elapsed total does not have to equal the attempt duration.

**Blocked by:** None - can start immediately

**Status:** ready-for-agent

- [ ] An attempt records a per-question elapsed time that is readable after submission
- [ ] Revisiting a question accumulates rather than replaces its elapsed time
- [ ] A skipped question records zero rather than absent
- [ ] Timing is driven by the injected clock, not wall time
- [ ] A submitted attempt's timings are immutable
