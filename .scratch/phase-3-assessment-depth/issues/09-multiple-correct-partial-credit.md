# 09 - Multiple-correct with partial credit

**What to build:** A multiple-correct question carries a defined partial-credit rule, set per question because the correct rule differs between exam patterns.

At minimum: all-or-nothing, and proportional with any wrong selection forfeiting the question.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] All-or-nothing awards full marks only for the exact correct set
- [ ] Proportional awards a fraction for a strict subset of correct options with none wrong
- [ ] Selecting any wrong option under the proportional rule scores it as wrong, not partially right
- [ ] The rule is per question, and two questions in one test can use different rules
- [ ] A partial award is never greater than the question's marks
