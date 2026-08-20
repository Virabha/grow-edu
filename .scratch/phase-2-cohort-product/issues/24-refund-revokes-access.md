# 24 - Refund revokes the access it paid for, in one transaction

**What to build:** Processing a refund and revoking the access that payment granted happen in one action, so a refunded student does not keep what they were refunded for.

The refund columns exist today with no logic behind them. Partial refunds are supported, and a partial refund does not revoke access unless that is explicitly chosen.

**Blocked by:** 05 - Audit log

**Status:** ready-for-agent

- [ ] A full refund revokes exactly the access its payment granted, and nothing else
- [ ] The refund and the revocation either both happen or neither does
- [ ] A partial refund leaves access intact unless revocation is explicitly chosen
- [ ] A refunded student loses access immediately, not at next sign-in
- [ ] The refund is recorded in the audit log with the actor, the amount and whether access was revoked
