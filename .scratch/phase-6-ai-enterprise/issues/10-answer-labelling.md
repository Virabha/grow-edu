# 10 - A student always knows whether they are reading a machine

**What to build:** Automated answers carry an explicit source marker distinguishing them from instructor answers, in the stored record and in every read path.

**The label must live on the record, not in the presentation layer.** A frontend that forgets to render it would otherwise present a machine answer as an instructor's.

**Blocked by:** 08

**Status:** not-started

- [ ] An automated answer is marked as such on the stored record
- [ ] An instructor answer is distinguishable from an automated one in every read path
- [ ] An instructor editing a drafted reply produces an answer attributed to the instructor
- [ ] The marker cannot be set by a client
- [ ] A doubt answered automatically then escalated shows both, distinctly
