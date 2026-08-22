# 15 - Environments persist between sessions

**What to build:** A student's environment — its filesystem and installed packages — survives between sessions, so they do not start again each time.

**Blocked by:** 14

**Status:** done
**Covered by:** test/environments.int-spec.ts

- [x] Reconnecting returns the same workspace rather than a fresh one
- [x] The workspace survives hibernation and is restored on resume
- [x] A student reaches only their own environment
- [x] An environment is bound to one student and one project stage
- [x] Reclaiming an environment preserves the workspace
