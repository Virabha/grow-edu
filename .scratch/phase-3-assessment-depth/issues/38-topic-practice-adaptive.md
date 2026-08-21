# 38 - Unlimited topic practice with adaptive difficulty

**What to build:** A student can drill a single topic without limit, and the difficulty responds to live performance — harder as they improve, easier when they struggle.

Selection uses observed difficulty where enough attempts exist and falls back to the authored value where they do not.

**Blocked by:** 17, 39

**Status:** ready-for-agent

- [ ] A student can request successive practice questions on one topic indefinitely
- [ ] A run of correct answers raises the difficulty of what is served next
- [ ] A run of wrong answers lowers it
- [ ] Questions recently served to that student are not repeated while unseen ones remain
- [ ] Exhausting a topic degrades to repetition rather than an error
