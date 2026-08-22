# 17 - Every lecture gets a summary and timestamped chapters

**What to build:** From the transcripts Phase 4 already produces, derive a summary, key points and timestamped chapters. Runs as batch work at no additional transcription cost.

**Chapter timestamps must fall inside the lecture and be strictly increasing.** A chapter list that seeks past the end of the video, or backwards, is worse than none.

**Blocked by:** 04, 05

**Status:** done
**Covered by:** test/ai-lecture-summaries.int-spec.ts

- [x] A summary and key points are derived from an existing transcript
- [x] Chapters carry timestamps that are strictly increasing
- [x] No chapter timestamp falls outside the lecture duration
- [x] A lesson with no transcript produces no summary rather than an empty one
- [x] Summarisation uses the batch path and the cheaper model
