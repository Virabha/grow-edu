# 03 - Video resume position

**What to build:** A lecture resumes exactly where the student stopped, on any device. The position is held on the server, not in local storage, because cross-device resume is the requirement.

Position updates arrive batched from the client, and they can arrive out of order. The later position by playback time wins, not the later request.

**Blocked by:** None - can start immediately

**Status:** ready-for-agent

- [ ] A position saved on one device is returned when the lesson is opened on another
- [ ] Out-of-order updates do not move the position backwards
- [ ] A batch of positions submitted in one request is applied correctly
- [ ] Resuming a lesson never watched returns the start, not an error
- [ ] A position beyond the lesson duration is clamped rather than stored
