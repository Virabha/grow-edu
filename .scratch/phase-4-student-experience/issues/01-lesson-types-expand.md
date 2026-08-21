# 01 - Lesson types expand

**What to build:** The lesson type set grows from VIDEO/TEXT/QUIZ to include DOCUMENT, AUDIO, RICH and LIVE_SESSION. LIVE_SESSION unifies the Phase 2 timetable with the curriculum rather than leaving sessions in a parallel list.

This lands first because every other content ticket in the phase hangs off it.

**Blocked by:** None - can start immediately

**Status:** ready-for-agent

- [ ] A lesson can be created as each of the new types and reads back as that type
- [ ] A LIVE_SESSION lesson resolves to its underlying batch session rather than duplicating it
- [ ] An existing VIDEO, TEXT or QUIZ lesson is unaffected by the migration
- [ ] A lesson type the renderer does not know is refused at authoring, not stored
- [ ] The type is immutable once a lesson has progress recorded against it
