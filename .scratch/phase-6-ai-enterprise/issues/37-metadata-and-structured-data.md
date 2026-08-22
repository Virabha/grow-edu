# 37 - Page metadata and structured data under owner control

**What to build:** Owner-controlled title, description, canonical URL, social preview and structured data for public pages.

**Performance is a functional requirement of this feature, not a quality attribute.** A slow page does not rank, and an unranked page defeats the purpose of writing it.

**Blocked by:** 35, 36

**Status:** done
**Covered by:** test/page-metadata.int-spec.ts

- [x] Title, description, canonical URL and social preview are owner-controlled per page
- [x] Structured data is emitted for pages that warrant it
- [x] A page with no explicit metadata falls back to a sensible default rather than emitting nothing
- [x] Metadata is served with the page, not fetched by the client afterwards
- [x] A malformed structured-data configuration is rejected at write time
