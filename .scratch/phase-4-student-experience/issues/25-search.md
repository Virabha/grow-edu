# 25 - Search

**What to build:** Search across batches and instructors, backed by a REAL INDEX rather than pattern matching. Full-text indexing in Postgres is sufficient at this scale; a dedicated search service is not warranted and would be premature.

**Blocked by:** 24

**Status:** ready-for-agent

- [ ] Search uses a database full-text index, not a LIKE scan
- [ ] A batch is findable by words in its title and description
- [ ] An instructor is findable by name
- [ ] Results exclude anything the catalogue would exclude
- [ ] An empty or nonsense query returns empty rather than everything
