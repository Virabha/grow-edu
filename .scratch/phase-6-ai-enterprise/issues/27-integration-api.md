# 27 - A scoped, credentialed, versioned integration API

**What to build:** A versioned API exposing attendance, results and progress for one corporate's own students, authenticated by credentials issued and revoked independently of any user account.

**A request beyond scope must be indistinguishable from a request for a record that does not exist.** A 403 where a 404 belongs tells an integrator that another corporate's student exists.

**Blocked by:** nothing

**Status:** not-started

- [ ] Credentials are issued and revoked independently of user accounts
- [ ] A corporate's credentials reach only that corporate's students
- [ ] An out-of-scope record is indistinguishable from a missing one
- [ ] The API carries a version in its path
- [ ] A revoked credential stops working immediately
