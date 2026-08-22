# 27 - Stage prerequisites

**What to build:** Prerequisites expressed between stages, enforced rather than suggested, so a student is not lost in material they are not ready for.

**Access checks remain the responsibility of the single access module established in Phase 1. Paths add a source of access, not a second evaluator.**

**Blocked by:** 26

**Status:** done
**Covered by:** test/learning-paths.int-spec.ts

- [x] A stage declares its prerequisite stages
- [x] A stage is unreachable until its prerequisites are complete
- [x] The check is evaluated by the existing access module, not a second rule
- [x] Completing a prerequisite opens the dependent stage immediately
- [x] A prerequisite cycle is refused at authoring
