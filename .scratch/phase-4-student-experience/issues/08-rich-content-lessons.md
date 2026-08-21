# 08 - Rich content lessons

**What to build:** A lesson format carrying formatted text, code with a language, tables, images and inline questions — stored STRUCTURALLY, using the same content-block format and renderer built for question content in Phase 3.

The programming curriculum in Phase 5 depends on this format existing.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Rich lesson content round-trips unchanged through authoring and reading
- [ ] It reuses the Phase 3 content-block parser rather than a second one
- [ ] An inline question references a bank question rather than embedding a copy
- [ ] Answering an inline question records against the student without creating a test attempt
- [ ] An unknown block type is refused at authoring
