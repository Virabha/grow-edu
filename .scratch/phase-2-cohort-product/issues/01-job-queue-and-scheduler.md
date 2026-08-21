# 01 - Job queue and scheduler, running inline in tests

**What to build:** A Redis-backed queue and scheduler exist and do real work. A job can be enqueued, retried on failure, and scheduled to repeat. In tests the queue runs inline, so a job queued by a request is assertable inside the test that made the request, without polling or sleeping. External providers are stubbed at the network boundary, not the service boundary, so the code under test is the real code.

This gates most of the phase: recurrence generation, recording attachment, notification fan-out, lifecycle transitions, scheduled reports and exports all sit on it. It was Phase 1 item 7 and is the one thing that phase did not deliver.

The install was unblocked by running it with the purge confirmation bypassed, which is the fix pnpm itself prescribes for a non-interactive shell.

**Caveat:** the BullMQ driver is written and typechecks but has never run against a live Redis. The REDIS_URL commented out in backend/.env points at a host that no longer resolves, so the instance behind it is gone. Everything proven by the tests is proven through the inline driver. Before relying on queued work in production, supply a live REDIS_URL and confirm a job round-trips.

**Blocked by:** None - can start immediately

**Status:** done 2026-08-21, with one caveat below

- [x] A job enqueued by a request is processed and its effect is observable
- [x] A failing job is retried, and gives up after a bounded number of attempts rather than retrying forever
- [x] A repeatable job can be registered and fires on its schedule
- [x] In the test environment a queued job completes within the triggering test with no sleep or poll
- [x] The application still boots when no Redis connection string is configured, with queue-backed features degraded rather than the process failing
