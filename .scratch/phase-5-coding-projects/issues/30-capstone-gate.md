# 30 - The capstone gates the credential

**What to build:** A capstone is a project stage marked as gating the path's credential. Certificate issuance for a path requires it, extending the completion-criteria mechanism built in Phase 4.

**A capstone-gated programme credential makes a claim about capability that someone may hire on. That is a reason to keep the gate strict.**

**Blocked by:** 27, 30 depends on Phase 4 certificate issuance

**Status:** done
**Covered by:** test/path-credentials.int-spec.ts

- [x] A path stage can be marked as the capstone
- [x] A path certificate cannot be issued without the capstone passed
- [x] Issuance extends the Phase 4 criteria mechanism rather than adding a second one
- [x] Completing every other stage without the capstone issues nothing
- [x] A student cannot request a path certificate into existence
