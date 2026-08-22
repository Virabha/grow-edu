# 18 - Controlled network egress

**What to build:** Environments have controlled outbound network access. **A development container with unrestricted outbound access is an abuse vector regardless of who is using it.**

**Blocked by:** 14

**Status:** done
**Covered by:** test/environments.int-spec.ts

- [x] An egress policy is passed to the provider on provisioning
- [x] The allowed destinations are owner-managed configuration
- [x] An environment is never provisioned without a policy
- [x] The policy is recorded against the environment for audit
- [x] Changing the policy does not require a code deployment
