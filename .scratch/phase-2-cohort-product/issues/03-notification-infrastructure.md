# 03 - Notification infrastructure: in-app and email, queued and templated

**What to build:** One way to notify a person, delivering in-app and by email, with the wording held in editable configuration rather than in code. Generation is queued, never inline with the request that caused it, so an action that must notify four hundred students returns immediately.

The owner can change the wording of an automated message without a deployment.

**Blocked by:** 01 - Job queue and scheduler

**Status:** ready-for-agent

- [ ] Notifying many recipients does not delay the response of the request that triggered it
- [ ] Each notification type renders from a template whose copy can be edited by the owner
- [ ] A recipient receives a notification exactly once per triggering event
- [ ] In-app and email are both delivered from the same call site
- [ ] Delivery is polled by the client; no websocket or server-sent events are introduced
