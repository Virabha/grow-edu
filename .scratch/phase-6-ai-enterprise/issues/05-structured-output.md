# 05 - Parsed responses are structured or rejected

**What to build:** Any response that is parsed rather than shown to a person — generated questions, extracted chapters, review verdicts, plan items — is requested as structured output against a declared shape and validated on arrival.

**Malformed output must be rejected, not coerced.** A half-parsed question that reaches the bank is worse than a failed generation, because the failure is silent and the artefact looks legitimate.

**Blocked by:** 01

**Status:** not-started

- [ ] Every parsed feature declares its response shape
- [ ] A response failing the shape is rejected and recorded as a failure
- [ ] A rejected response persists nothing partial
- [ ] A rejected response is retried a bounded number of times, then gives up visibly
- [ ] Prose is never parsed with a regular expression to recover a field
