# 13 - Front-end problems judged by assertions

**What to build:** Problems in markup, styling and browser scripting that execute **entirely in a sandboxed frame in the student's own browser**, with assertions evaluated against the rendered result. No server execution, no per-run cost, immediate feedback.

The server's part is the problem, its assertions, and the recorded result.

**Blocked by:** 03

**Status:** done
**Covered by:** test/coding-frontend-problems.int-spec.ts, test/coding-confidentiality.int-spec.ts

- [x] A front-end problem carries assertions rather than input/output test cases
- [x] No server execution happens for a front-end problem
- [x] The recorded result attaches to the student and the problem
- [x] "Looks right" is not a passing condition — a result records which assertions passed
- [x] Hidden assertions are not disclosed, consistent with ticket 09
