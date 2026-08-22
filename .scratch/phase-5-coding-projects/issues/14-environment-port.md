# 14 - The development environment provisioning port

**What to build:** An internal interface that cloud development environments are provisioned through, abstracted from the provider as execution is.

**This is the most expensive item in the entire plan** and is scoped tightly on that basis: environments are provisioned only for project work in a career path, never for individual practice problems, which the editor and judge serve adequately.

**Blocked by:** None - can start immediately

**Status:** done
**Covered by:** test/environments.int-spec.ts

- [x] Provisioning goes through one injected port; no caller reaches a provider directly
- [x] An environment can only be provisioned against a project stage in a path
- [x] Requesting one for a practice problem is refused
- [x] Tests drive the provider through a stub at the network boundary
- [x] A provisioning failure is reported as such and leaves no half-created record
