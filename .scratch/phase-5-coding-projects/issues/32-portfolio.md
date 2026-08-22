# 32 - The public portfolio

**What to build:** A shareable public profile showing completed projects, demonstrated skills and verified certificates. **Public, unauthenticated, and opt-in per item — nothing appears without the student publishing it.**

An employer must be able to open it with no account.

**Blocked by:** 29

**Status:** done
**Covered by:** test/portfolio.int-spec.ts

- [x] The profile is readable without signing in
- [x] Nothing appears until the student publishes that specific item
- [x] Unpublishing removes it immediately
- [x] Certificates link to the Phase 4 verification endpoint rather than asserting validity
- [x] The profile is reachable by an unguessable or student-chosen handle, not a sequential id
