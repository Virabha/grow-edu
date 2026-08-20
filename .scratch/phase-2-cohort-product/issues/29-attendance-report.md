# 29 - Attendance report scoped by contract

**What to build:** A corporate admin gets attendance per student and per session, which is what they need to satisfy their own institution's attendance requirements.

The report is scoped by contract, breaks down by sub-group, and a corporate admin can never observe the existence of another organisation's data. A request for a record outside their scope returns the same response as a request for a record that does not exist.

**Blocked by:** 11 - Attendance capture; 26 - Roster sub-groups

**Status:** ready-for-agent

- [ ] A corporate admin sees attendance for their own students, per student and per session
- [ ] The report can be broken down by sub-group
- [ ] A request for another organisation's data is indistinguishable from a request for something that does not exist
- [ ] The report covers only batches on the requesting organisation's contracts
