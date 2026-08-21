# 35 - Push subscription per device

**What to build:** Push subscription is PER DEVICE and reuses the device records Phase 1 made authoritative for the device limit, so class reminders reach a student's phone rather than only a desktop browser.

**Blocked by:** None - can start immediately

**Status:** ready-for-agent

- [ ] A subscription registers against an existing device record, not a new parallel one
- [ ] A student with two devices receives on both
- [ ] Removing a device removes its subscription
- [ ] A dead subscription is pruned rather than retried forever
- [ ] Subscribing twice from one device does not duplicate
