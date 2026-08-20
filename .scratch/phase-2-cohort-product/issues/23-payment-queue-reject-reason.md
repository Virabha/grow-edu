# 23 - Payment queue: reject with a reason the student can see

**What to build:** Approving payments becomes a short daily routine: one queue showing the proof, the amount, the student and the product together.

Rejection carries a reason the student can read, so a bad proof does not turn into an email exchange. The queue and the approve action already exist; the visible reason and the operational surface do not.

**Blocked by:** 03 - Notification infrastructure; 05 - Audit log

**Status:** ready-for-agent

- [ ] The queue shows proof, amount, payer and product together without opening each payment
- [ ] Rejecting a payment requires a reason
- [ ] The student can see the rejection reason and can act on it
- [ ] Approval continues to grant access in the same transaction that marks the payment complete
- [ ] Each approval and rejection is recorded in the audit log with the actor
