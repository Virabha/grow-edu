# 31 - Asynchronous export

**What to build:** A corporate admin can export any report to use in their own systems and internal reviews.

Anything beyond a trivial row count is generated asynchronously and delivered by notification when ready, rather than blocking a request until it times out.

**Blocked by:** 01 - Job queue and scheduler; 03 - Notification infrastructure; 29 - Attendance report; 30 - Test performance report

**Status:** ready-for-agent

- [ ] Any report can be exported
- [ ] A large export does not block the request that asked for it
- [ ] The requester is notified when the export is ready and can download it
- [ ] An export contains exactly the scope the requester can see and nothing beyond it
- [ ] A failed export is reported to the requester rather than disappearing
