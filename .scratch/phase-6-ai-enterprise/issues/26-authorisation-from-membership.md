# 26 - Authentication is delegated; authorisation is not

**What to build:** Role and access continue to derive from membership and enrolment records, never from claims asserted by the institution's identity provider.

**An identity provider asserting a role must not be believed.** This is an authorisation boundary and warrants the same rigour as the Phase 1 access tests.

**Blocked by:** 24, 25

**Status:** not-started

- [ ] A provider claiming an administrator role does not grant one
- [ ] Access derives from enrolment records after sign-in
- [ ] A provider claim cannot add a batch enrolment
- [ ] A revoked enrolment stays revoked across a fresh sign-on
- [ ] Role changes require the existing administrative path
