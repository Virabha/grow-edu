# 16 - Approval queue with reject-and-comment

**What to build:** The owner gets one queue of everything awaiting approval, so the publishing gate the content model already depends on is a task that can be completed rather than a state to go looking for.

Approval publishes. Rejection sends the item back with a comment the instructor can read, rather than silently refusing.

The pending state already exists in the content model and has never had a surface.

**Blocked by:** 03 - Notification infrastructure; 05 - Audit log

**Status:** ready-for-agent

- [ ] Everything awaiting approval appears in one queue regardless of which batch it belongs to
- [ ] Approving an item publishes it and makes it visible to enrolled students
- [ ] Rejecting an item requires a comment and returns it to the author
- [ ] The author is notified of an approval or a rejection, and can read the comment
- [ ] Each approval and rejection is recorded in the audit log with the actor
