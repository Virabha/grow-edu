# 22 - Transfer a student between batches

**What to build:** The owner can move a student from one batch to another, so a wrong placement is fixed in the product rather than by hand in the database.

The transfer is explicit about what moves with the student and what does not.

**Blocked by:** 05 - Audit log

**Status:** ready-for-agent

- [ ] A student can be moved from one batch to another in one action
- [ ] The student gains access to the destination batch and loses it on the source
- [ ] What carries over and what does not is stated to the operator before they confirm
- [ ] The transfer is recorded in the audit log with the actor and both batches
- [ ] Transferring into a full batch is refused, or consumes a waitlist place, rather than silently oversubscribing
