# 13 - Bulk import: commit as a queued job

**What to build:** The second stage. A previewed import is committed as a queued job with progress reporting, so a large file does not block a request.

A partial failure commits nothing.

**Blocked by:** 12

**Status:** ready-for-agent

- [ ] Committing a preview that contains an invalid row is refused and creates nothing
- [ ] A clean commit creates every question with its tags intact
- [ ] The request returns before the import completes; draining the queue completes it
- [ ] Progress is readable while the job runs and reports a terminal state when it ends
- [ ] Committing the same preview twice does not double-create
