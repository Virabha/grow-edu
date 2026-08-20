# 04 - Web push channel

**What to build:** A third delivery channel for notifications: web push. A student can grant permission, their subscription is stored against their account, and notifications reach them when the tab is closed.

This lands before the progressive web app that will carry it, which is deliberate: it is the channel that replaces the messaging and SMS integrations that were declined. Desktop browsers get it first; mobile installs follow in a later phase.

**Blocked by:** 03 - Notification infrastructure

**Status:** ready-for-agent

- [ ] A student can subscribe and unsubscribe from push, and the subscription survives sign-out and sign-in
- [ ] A push notification arrives when the site is not open
- [ ] A subscription that the browser has expired is detected and removed rather than retried forever
- [ ] Push failures never block in-app or email delivery of the same notification
