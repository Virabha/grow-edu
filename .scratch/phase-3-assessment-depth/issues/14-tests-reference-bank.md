# 14 - Tests reference bank questions

**What to build:** The existing quiz model is inverted. A test holds an ordered list of references to bank questions, each with its own marks and negative-marking rule, instead of owning question rows.

Existing quizzes and their attempts must survive the inversion with their scores unchanged.

**Blocked by:** 03, 05

**Status:** ready-for-agent

- [ ] A test is composed of references, and removing a question from a test does not remove it from the bank
- [ ] The same bank question appears in two tests with different marks
- [ ] An attempt submitted before the inversion still reads back with its original score
- [ ] Deleting a test leaves its questions in the bank
- [ ] Test question order is explicit and stable
