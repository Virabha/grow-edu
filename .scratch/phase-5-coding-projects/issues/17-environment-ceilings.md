# 17 - Concurrency ceilings and consumption metering

**What to build:** Per-environment resource ceilings, per-student concurrency limits, and consumption measured per student so that cost is attributable rather than a single opaque line.

**Blocked by:** 14

**Status:** ready-for-agent

- [ ] A student cannot exceed their concurrent environment limit
- [ ] The limit is owner-managed configuration, not a literal
- [ ] Resource ceilings are passed to the provider on provisioning
- [ ] Running time is measured and attributed to the student
- [ ] Consumption is reportable per student
