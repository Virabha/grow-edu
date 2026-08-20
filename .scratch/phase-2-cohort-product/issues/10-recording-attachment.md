# 10 - A recording attaches itself when a class ends

**What to build:** When a live class ends, its recording appears against that session without anyone downloading and re-uploading it. Attachment is driven by the meeting provider's completion webhook, queued and retried.

Where a provider offers no webhook, a scheduled reconciliation job polls for the recording after the session's expected end.

Provider integration is where this phase is most likely to slip: providers differ in webhook behaviour and in what they expose.

**Blocked by:** 01 - Job queue and scheduler; 07 - Recurring schedule

**Status:** ready-for-agent

- [ ] A recording appears against its session without manual upload
- [ ] A provider webhook that arrives late or twice results in one attachment, not two
- [ ] A provider with no webhook has its recording found by the reconciliation job
- [ ] A failed attachment is retried and surfaces as a visible problem rather than failing silently
- [ ] The recording is playable from the timetable in the session's own place
