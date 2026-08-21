# 37 - Certificate issuance on completion criteria

**What to build:** Issuance is triggered by DEFINED COMPLETION CRITERIA on the batch, evaluated by a QUEUED JOB — not by a student requesting one.

A certificate mechanism already exists from Phase 2 (`batchCertificates`, `CertificateService`, the certificate-template module). Extend it; do not build a second one.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Criteria are defined per batch and are owner-managed configuration
- [ ] A student who does not meet them gets no certificate, and cannot request one into existence
- [ ] Issuance runs as a queued job and is idempotent — running twice issues once
- [ ] A corporate student's certificate is issued by the same path
- [ ] Issuance is recorded in the audit log
