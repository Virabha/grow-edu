# 19 - Clone a batch for the next cohort

**What to build:** The owner can clone a batch so that running successive cohorts does not mean rebuilding everything by hand.

The clone copies structure and settings, and never the roster or any student data. It starts in draft. Content is copied by reference where possible, so that correcting a lesson corrects it everywhere it is used.

**Blocked by:** 05 - Audit log

**Status:** ready-for-agent

- [ ] Cloning a batch produces a draft batch with the same subjects, content structure and settings
- [ ] No enrolment, attendance, doubt, attempt or certificate is carried into the clone
- [ ] Correcting a lesson that was copied by reference corrects it in every batch using it
- [ ] The clone has its own slug and does not collide with the original
- [ ] The clone operation is recorded in the audit log
