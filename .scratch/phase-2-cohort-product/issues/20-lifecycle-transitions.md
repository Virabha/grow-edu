# 20 - Batch lifecycle transitions run themselves

**What to build:** A batch moves between upcoming, ongoing and completed on its own dates, so its state never depends on someone remembering to change it.

Transitions are scheduled jobs, not request-triggered. A batch becomes ongoing on its start date whether or not anyone signs in that day.

**Blocked by:** 01 - Job queue and scheduler; 02 - Injectable clock

**Status:** ready-for-agent

- [ ] A batch becomes ongoing on its start date with no request being made
- [ ] A batch becomes completed after its end date with no request being made
- [ ] Advancing the clock drives the transition in tests
- [ ] A batch the owner has archived or cancelled is not moved by the job
- [ ] A student's access to a completed batch is unaffected by the transition
