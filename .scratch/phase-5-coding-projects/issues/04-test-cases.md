# 04 - Visible and hidden test cases

**What to build:** Test cases attached to a problem, each either visible or hidden. Visible cases appear in the statement and can be run on demand. Hidden cases decide the verdict and are never disclosed.

**Blocked by:** 03

**Status:** done
**Covered by:** test/coding-problems.int-spec.ts, test/coding-confidentiality.int-spec.ts

- [x] A case is visible or hidden, and the two are stored and served distinctly
- [x] Visible cases are returned to the student with their expected output
- [x] Hidden case inputs and expected outputs are never returned to a student by any route
- [x] An instructor can read both kinds
- [x] A problem's cases are ordered and that order is stable
