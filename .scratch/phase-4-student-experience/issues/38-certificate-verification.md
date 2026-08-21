# 38 - Public certificate verification

**What to build:** Verification is a PUBLIC endpoint keyed by an UNGUESSABLE identifier, disclosing only what the certificate asserts — holder name, batch, date, issuer. It reveals nothing else about the holder.

**A revoked certificate remains verifiable and reports itself revoked.** A verification link that goes dead is indistinguishable from a broken system.

**Blocked by:** 37

**Status:** ready-for-agent

- [ ] Verification needs no sign-in
- [ ] It discloses only holder name, batch, date and issuer — no email, no roster, no scores
- [ ] The identifier is unguessable and not derived from a sequential id
- [ ] A revoked certificate verifies successfully and reports itself revoked
- [ ] An unknown identifier returns not-found without confirming any pattern
