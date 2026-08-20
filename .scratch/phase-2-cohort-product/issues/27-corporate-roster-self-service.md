# 27 - Corporate roster self-service: add and remove

**What to build:** A corporate admin can add and remove students on their own roster, so a joiner or a leaver does not require an email to the platform owner.

Adding consumes a seat and is bounded by the contract's seat count, using the same allocation guarantee as join-link redemption. Removing frees the seat for reassignment.

**Blocked by:** 05 - Audit log

**Status:** ready-for-agent

- [ ] A corporate admin can add a student to their roster, consuming a seat
- [ ] Adding beyond the contract's seat count is refused with the reason
- [ ] A corporate admin can remove a student, freeing the seat
- [ ] A corporate admin cannot touch a roster belonging to another organisation
- [ ] Each addition and removal is recorded in the audit log with the actor
