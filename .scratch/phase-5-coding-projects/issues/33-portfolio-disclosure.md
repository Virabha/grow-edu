# 33 - Portfolio disclosure limits and snapshots

**What to build:** The public profile discloses only what the student has published. **Published project work is a snapshot**, so a student changing a repository later does not silently alter what was reviewed and shown.

**Blocked by:** 32

**Status:** ready-for-agent

- [ ] An unpublished item is unreachable by an unauthenticated request
- [ ] No email, no batch roster, no grades and no reviewer feedback leak through the public surface
- [ ] Publishing captures a snapshot of the reviewed work
- [ ] Changing the repository afterwards does not alter the published snapshot
- [ ] An unknown handle returns not-found without confirming any pattern
