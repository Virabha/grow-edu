# 31 - Phone sign-in with one-time codes

**What to build:** Sign-in by phone number with a one-time code, so a student does not need an email address they never check.

**RATE LIMITING ON THE CODE ENDPOINTS IS MANDATORY.** Each unrated request has a direct monetary cost.

**Blocked by:** None - can start immediately

**Status:** ready-for-agent

- [ ] Requesting a code for a phone number issues one and returns no code in the response
- [ ] A correct code signs the user in; a wrong one does not
- [ ] A code expires and an expired code is refused
- [ ] A code cannot be reused after a successful sign-in
- [ ] Repeated code requests for one number, and from one address, are refused by rate limiting
