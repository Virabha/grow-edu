# 01 - Job queue and scheduler, running inline in tests

**What to build:** A Redis-backed queue and scheduler exist and do real work. A job can be enqueued, retried on failure, and scheduled to repeat. In tests the queue runs inline, so a job queued by a request is assertable inside the test that made the request, without polling or sleeping. External providers are stubbed at the network boundary, not the service boundary, so the code under test is the real code.

This gates most of the phase: recurrence generation, recording attachment, notification fan-out, lifecycle transitions, scheduled reports and exports all sit on it. It was Phase 1 item 7 and is the one thing that phase did not deliver.

Unblocking it needs a dependency install in the backend (the local pnpm store major version no longer matches node_modules, so adding a package is refused) and a Redis connection string.

**Blocked by:** None - can start immediately

**Status:** ready-for-agent

- [ ] A job enqueued by a request is processed and its effect is observable
- [ ] A failing job is retried, and gives up after a bounded number of attempts rather than retrying forever
- [ ] A repeatable job can be registered and fires on its schedule
- [ ] In the test environment a queued job completes within the triggering test with no sleep or poll
- [ ] The application still boots when no Redis connection string is configured, with queue-backed features degraded rather than the process failing
