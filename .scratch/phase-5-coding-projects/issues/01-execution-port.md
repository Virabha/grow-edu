# 01 - The execution port and the verdict set

**What to build:** An internal interface that submitted code is executed through, and the closed set of verdicts it can produce. A managed third-party service does the running; the platform never operates a sandbox.

This lands first because every other execution ticket hangs off it, and because abstracting the provider from the outset is what lets us change provider — or self-host later — without touching the problem model, the submission model or any user-facing surface.

**Blocked by:** None - can start immediately

**Status:** ready-for-agent

- [ ] Execution goes through one injected port; no caller reaches a provider directly
- [ ] The verdict set is closed: accepted, wrong answer, time limit, memory limit, runtime error, compilation error, internal error
- [ ] An internal error is distinct from every student-caused verdict and is never reported as one
- [ ] Tests stub the provider at the network boundary, not the service boundary
- [ ] No provider-specific vocabulary escapes into the problem or submission model
