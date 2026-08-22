# 03 - Prompt caching is a design constraint

**What to build:** Prompt assembly puts the stable grounding material first, behind a cache breakpoint, and the volatile part — the student's question, the timestamp, the attempt identifier — strictly after it. A deterministic assembly function is the single place prompts are built.

**Caching is a prefix match. Anything varying placed before the boundary silently invalidates it and multiplies cost, with no error and no visible symptom until the invoice arrives.** Ordering of retrieved material must be deterministic; an unsorted list is a varying prefix.

**Blocked by:** 01, 02

**Status:** not-started

- [ ] Two questions against the same batch produce byte-identical prefixes
- [ ] Retrieved grounding material is ordered deterministically, not by map or set iteration
- [ ] No timestamp, request identifier or user identifier appears before the cache breakpoint
- [ ] The assembled prefix is exercised by a test that compares two real assemblies, not by inspection
- [ ] Cache-read tokens returned by the provider are recorded against the call
