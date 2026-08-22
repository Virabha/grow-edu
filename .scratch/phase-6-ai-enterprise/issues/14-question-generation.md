# 14 - Questions are generated into an unreviewed state

**What to build:** An instructor generates draft questions from a lesson at a specified topic and difficulty. Drafts enter the Phase 3 bank marked unreviewed and mandatorily tagged.

**Tagging is mandatory, consistent with Phase 3's rule.** An untagged question is invisible to weak-topic mapping and practice generation, which is where the bank earns its value.

**Blocked by:** 01, 05

**Status:** done
**Covered by:** test/ai-question-generation.int-spec.ts

- [x] An instructor generates drafts from a lesson at a chosen topic and difficulty
- [x] Drafts enter the existing question bank rather than a parallel store
- [x] Every generated question carries a subject and topic tag
- [x] A generated question is marked unreviewed on creation
- [x] A malformed generation persists no questions at all
