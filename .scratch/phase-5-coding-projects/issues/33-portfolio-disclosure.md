# 33 - Portfolio disclosure limits and snapshots

**What to build:** The public profile discloses only what the student has published. **Published project work is a snapshot**, so a student changing a repository later does not silently alter what was reviewed and shown.

**Blocked by:** 32

**Status:** done
**Covered by:** test/portfolio.int-spec.ts

- [x] An unpublished item is unreachable by an unauthenticated request
- [x] No email, no batch roster, no grades and no reviewer feedback leak through the public surface
- [x] Publishing captures a snapshot of the reviewed work
- [x] Changing the repository afterwards does not alter the published snapshot
- [x] An unknown handle returns not-found without confirming any pattern
