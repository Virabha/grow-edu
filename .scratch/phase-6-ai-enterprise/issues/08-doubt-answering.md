# 08 - A doubt is answered immediately, with citations

**What to build:** Posting a doubt returns immediately with a pending state; a queued job answers it from retrieved course content and the answer arrives by notification, carrying citations to the lessons it drew on.

**The answer must return by notification, not by holding the request open.** Per the spec every AI call is a queued job; an answer computed inline is the mistake this phase is specifically told not to make.

**Blocked by:** 01, 03, 06, 07

**Status:** not-started

- [ ] Posting a doubt returns immediately with a pending state
- [ ] The answer is produced by a queued job, never inline with the request
- [ ] The answer carries citations to the lessons it drew on
- [ ] The student is notified when the answer arrives
- [ ] An answer is grounded in retrieved content rather than the model's own knowledge
