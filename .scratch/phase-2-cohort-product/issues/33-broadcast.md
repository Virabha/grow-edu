# 33 - Broadcast to a batch, corporate, sub-group or segment

**What to build:** The owner can send a message to exactly the people it concerns: a batch, a corporate, a sub-group, or a filtered segment - and nobody else.

Fan-out is queued, so a broadcast to a large audience does not block the owner's request.

**Blocked by:** 03 - Notification infrastructure; 26 - Roster sub-groups

**Status:** ready-for-agent

- [ ] A broadcast can target a batch, a corporate, a sub-group, or a filtered segment
- [ ] Every intended recipient receives it exactly once and no unintended recipient receives it
- [ ] The owner's request does not block on the fan-out
- [ ] The owner can see what was sent, to whom, and when
- [ ] A broadcast is recorded in the audit log with the actor and the audience
