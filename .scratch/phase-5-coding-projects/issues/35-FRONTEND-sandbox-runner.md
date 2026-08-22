# 35 - [FRONTEND] Front-end problem sandbox runner

**What to build:** A sandboxed frame in the student's browser that renders their markup, styling and browser scripting and evaluates the problem's assertions against the rendered result. No server execution and no per-run cost.

**This ticket is client-side.** Its server-observable consequence — the recorded result — is covered by ticket 13.

**Blocked by:** 13

**Status:** needs-frontend-work

- [ ] Student code runs in a sandboxed frame and cannot reach the host application
- [ ] Assertions are evaluated against the rendered result, not the source text
- [ ] The rendered preview updates without a round trip to the server
- [ ] The result posted to the server records which assertions passed
- [ ] Hidden assertions are never exposed in the client bundle
