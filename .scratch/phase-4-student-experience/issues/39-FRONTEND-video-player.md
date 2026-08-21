# 39 - [FRONTEND] Video player rebuild

**What to build:** Replace the bare video element in the learner app with an established player library supporting adaptive streaming, playback speed, quality selection, and a plugin surface for bookmarks and transcripts. The player is LAZY-LOADED and must not enter the bundle of any route that does not play video.

**Signed content-network delivery is unchanged and must not regress.** Video never passes through the application. This is the property that makes concurrency tractable and it is the easiest thing to break while rebuilding the player.

**This ticket is client-side.** Per `SPEC-PHASE-4.md` Testing Decisions, there is deliberately no browser-automation seam; its server-observable consequences (resume position, bookmarks, transcript retrieval) are covered by tickets 03, 04 and 05.

**Blocked by:** 03, 04, 05, 36

**Status:** needs-frontend-work

- [ ] Speed and quality controls work against the existing signed CDN source
- [ ] Resume position is read from and written to the server, never local storage alone
- [ ] The player chunk is absent from the bundle of routes that do not play video
- [ ] Playback continues when the phone is locked
- [ ] Video URLs remain signed and direct — no request for media passes through the API
