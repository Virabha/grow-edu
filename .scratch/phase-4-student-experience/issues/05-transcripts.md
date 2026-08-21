# 05 - Transcripts as timed segments

**What to build:** Transcripts are generated asynchronously by a queued job after upload and stored as TIMED SEGMENTS, not a text blob, so that search can seek to a moment.

Transcription runs once per video, not once per view. It is the one item in this phase with a recurring external cost, so it must never run twice for the same asset.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] A transcript is produced by a queued job, not during the upload request
- [ ] Segments carry start and end times and read back in order
- [ ] Requesting transcription twice for one video does not transcribe twice
- [ ] A failed transcription leaves the lesson playable and is retryable
- [ ] A lesson with no transcript reports its absence rather than failing
