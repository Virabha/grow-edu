# 35 - Second factor for staff sign-in

**What to build:** Staff roles - owner, admin and instructor - must present a second factor at sign-in, so that one compromised password is not a compromise of every student's data.

It is optional for students.

**Blocked by:** 05 - Audit log

**Status:** ready-for-agent

- [ ] A staff account cannot complete sign-in with a password alone
- [ ] A student account signs in unchanged unless they opt in
- [ ] A staff member can enrol a second factor and recover from losing it without support access to their password
- [ ] Enrolment, use and reset of a second factor are recorded in the audit log
- [ ] The device limit and session invalidation established in Phase 1 continue to hold alongside it
