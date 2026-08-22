# 29 - Funnel events are captured

**What to build:** Capture of page views, catalogue views, checkout starts and checkout completions — the events funnel analysis needs and which do not exist today.

**This does not exist and must be built before the funnel report can mean anything.** Capture must be cheap enough not to slow the pages it measures.

**Blocked by:** nothing

**Status:** partial
**Covered by:** test/funnel-analytics.int-spec.ts

- [x] Page views, catalogue views, checkout starts and completions are captured
- [ ] Capture never blocks the response it measures
- [x] An event carries enough context to attribute it to a source
- [x] Events are retained on a defined schedule rather than for ever
- [x] A malformed event is dropped rather than failing the request
