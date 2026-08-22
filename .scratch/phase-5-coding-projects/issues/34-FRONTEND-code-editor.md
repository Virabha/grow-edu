# 34 - [FRONTEND] In-browser code editor

**What to build:** An established browser editor with syntax highlighting and autocomplete, lazy-loaded and never present in the bundle of a route that does not need it. It is a heavy dependency and the learner application is an installable progressive web app whose payload matters.

**This ticket is client-side.** Its server-observable consequences — starter code, submission, history and persisted editor state — are covered by tickets 05, 08 and 11.

**Blocked by:** 05, 11

**Status:** needs-frontend-work

- [ ] The editor chunk is absent from the bundle of routes that do not edit code
- [ ] A problem opens with its per-language starter code already present
- [ ] Draft state is persisted to the server and restored on return
- [ ] Language selection is limited to the languages the problem supports
- [ ] Running and submitting are distinct actions with distinct feedback
