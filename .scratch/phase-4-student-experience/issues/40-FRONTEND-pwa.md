# 40 - [FRONTEND] Installable app and offline shell

**What to build:** The LEARNER application becomes an installable progressive web app with an offline shell. The ADMINISTRATIVE application does not — a student on a phone should never receive the authoring bundle.

The offline shell covers navigation, the continue-learning surface and cached text content. **It does not cover video.** Offline video download was considered and DECLINED: it requires either digital rights management or an encrypted local store and is not securely achievable on the web.

**This ticket is client-side.** Its server-observable consequences (push subscription per device, continue-learning, low-bandwidth mode) are covered by tickets 35, 13 and 36.

**Blocked by:** 13, 35, 36

**Status:** needs-frontend-work

- [ ] The learner app is installable and presents on the home screen
- [ ] Opening it without a connection shows navigation and the continue-learning surface
- [ ] The admin app is not installable and ships no service worker
- [ ] Push notifications arrive on an installed mobile instance
- [ ] No video is cached for offline playback by any path
