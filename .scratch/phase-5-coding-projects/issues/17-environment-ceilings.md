# 17 - Concurrency ceilings and consumption metering

**What to build:** Per-environment resource ceilings, per-student concurrency limits, and consumption measured per student so that cost is attributable rather than a single opaque line.

**Blocked by:** 14

**Status:** done
**Covered by:** test/environments.int-spec.ts

- [x] A student cannot exceed their concurrent environment limit
- [x] The limit is owner-managed configuration, not a literal
- [x] Resource ceilings are passed to the provider on provisioning
- [x] Running time is measured and attributed to the student
- [x] Consumption is reportable per student
