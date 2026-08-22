# 10 - Verdict mapping and provider faults

**What to build:** Every provider outcome maps to exactly one verdict, and a provider fault produces an internal error rather than a wrong answer.

**Misreporting a platform fault as a student's mistake is a trust defect, not a cosmetic one.**

**Blocked by:** 01, 08

**Status:** ready-for-agent

- [ ] Every provider outcome maps to a verdict in the closed set
- [ ] A provider timeout, error or malformed response produces an internal error
- [ ] An internal error is never reported to a student as a wrong answer
- [ ] An internal error does not consume the student's attempt or rate-limit budget
- [ ] An unrecognised provider outcome produces an internal error rather than a guess
