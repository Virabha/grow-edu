# 18 - Controlled network egress

**What to build:** Environments have controlled outbound network access. **A development container with unrestricted outbound access is an abuse vector regardless of who is using it.**

**Blocked by:** 14

**Status:** ready-for-agent

- [ ] An egress policy is passed to the provider on provisioning
- [ ] The allowed destinations are owner-managed configuration
- [ ] An environment is never provisioned without a policy
- [ ] The policy is recorded against the environment for audit
- [ ] Changing the policy does not require a code deployment
