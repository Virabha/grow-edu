# 21 - No automated path can commit a mark

**What to build:** A boundary test asserting that no AI-originated path writes a mark, a rubric score, a pass verdict or a certificate.

**Non-negotiable, and it extends the position already taken on plagiarism flags in Phase 5.** This ticket exists as its own test because the guarantee spans several modules and would otherwise be nobody's responsibility.

**Blocked by:** nothing

**Status:** not-started

- [ ] No AI path writes to an awarded-marks column
- [ ] No AI path writes a committed rubric criterion score
- [ ] No AI path sets a project milestone to passed
- [ ] No AI path issues a certificate or a credential
- [ ] The assertion is a test that fails the build, not a convention
