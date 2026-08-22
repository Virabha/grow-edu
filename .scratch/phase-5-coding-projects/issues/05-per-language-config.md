# 05 - Per-language configuration

**What to build:** Starter code, time limit and memory limit configured per language on a problem, because a limit that is fair in a compiled language is not fair in an interpreted one.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] A problem declares which languages it supports
- [ ] Each supported language carries its own starter code, time limit and memory limit
- [ ] A problem opens with the starter code for the chosen language already present
- [ ] Submitting in an unsupported language is refused
- [ ] Limits are passed to the execution port per language, not as one global value
