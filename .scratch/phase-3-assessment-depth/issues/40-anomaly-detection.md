# 40 - Anomaly detection

**What to build:** Statistical detection that runs after submission, comparing answer-timing distributions, identical answer sequences across students, and submission patterns against cohort norms, and flags for human review.

It never blocks a submission and never accuses a student in the product. It is statistical, not a language model. Webcam proctoring was considered and rejected; that reasoning stands.

**Blocked by:** 21, 35

**Status:** ready-for-agent

- [ ] A submission is never blocked or delayed by detection
- [ ] Two students with an identical answer sequence and near-identical timings are flagged
- [ ] A fast but plausible attempt is not flagged
- [ ] Flags are visible only to staff and never surfaced to the student
- [ ] A flag records why it fired, not only that it did
