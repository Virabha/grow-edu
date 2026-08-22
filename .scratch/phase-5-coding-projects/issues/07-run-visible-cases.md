# 07 - Running against the visible cases

**What to build:** A student runs their code against the sample cases as often as they like and sees exactly which case failed and what their output was.

**Submissions are queued, never executed inline with the request.** A run returns immediately with a pending result; the outcome arrives separately.

**Blocked by:** 02, 05

**Status:** ready-for-agent

- [ ] A run never executes inline with the HTTP request
- [ ] The response is immediate and pending; the result attaches to that run when it arrives
- [ ] A failing visible case reports its input, the expected output and the student's actual output
- [ ] A run is bounded by the rate limits from ticket 02
- [ ] A run never touches hidden cases
