# 05 - Per-language configuration

**What to build:** Starter code, time limit and memory limit configured per language on a problem, because a limit that is fair in a compiled language is not fair in an interpreted one.

**Blocked by:** 03

**Status:** done
**Covered by:** test/coding-problems.int-spec.ts

- [x] A problem declares which languages it supports
- [x] Each supported language carries its own starter code, time limit and memory limit
- [x] A problem opens with the starter code for the chosen language already present
- [x] Submitting in an unsupported language is refused
- [x] Limits are passed to the execution port per language, not as one global value
