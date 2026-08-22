# 04 - Offline bulk work uses the batch path

**What to build:** A batch submission path for work that is not latency-sensitive — lecture summarisation and bulk question generation. Jobs are submitted, polled and reconciled through the Phase 1 queue.

**Batch work runs asynchronously at half cost, but it is a different failure mode: a batch can partially succeed.** Reconciliation must handle a batch where some items completed and others did not, without losing the completed ones or double-processing them.

**Blocked by:** 01, 02

**Status:** not-started

- [ ] A bulk request is submitted as a batch rather than as N individual calls
- [ ] Polling and reconciliation happen on a repeating job, never inline with a request
- [ ] A partially completed batch persists the completed items and retries only the rest
- [ ] A reconciled item is never processed twice
- [ ] Batch usage is attributed the same way individual calls are
