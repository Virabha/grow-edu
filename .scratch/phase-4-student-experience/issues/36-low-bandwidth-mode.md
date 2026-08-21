# 36 - Low-bandwidth mode

**What to build:** An EXPLICIT USER SETTING, not an inference. It forces the lowest video rendition, suppresses image loading above a threshold, and prefers the audio rendition where one exists.

**Blocked by:** 07

**Status:** ready-for-agent

- [ ] The setting is stored per user and readable by the client
- [ ] With it on, the lesson payload reports the lowest rendition and prefers audio where present
- [ ] Nothing infers the setting from connection speed
- [ ] Turning it off restores the normal payload immediately
- [ ] The threshold above which images are suppressed is owner-managed configuration
