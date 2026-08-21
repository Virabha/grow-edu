# 39 - Observed difficulty calibration

**What to build:** The system maintains a calibrated difficulty per question derived from actual attempt outcomes, separate from the author's estimate.

This is the quiet decision everything adaptive depends on. It is never writable by an author.

**Blocked by:** 03, 21

**Status:** ready-for-agent

- [ ] Observed difficulty is derived from outcomes and updated by a scheduled job
- [ ] A question below the attempt threshold reports no observed value
- [ ] An author cannot set or overwrite the observed value through any interface
- [ ] A question whose observed difficulty diverges from its authored one is discoverable
- [ ] Recalibration does not alter the score of any submitted attempt
