# 01 - The model provider is a port, not a client

**What to build:** A `MODEL_PROVIDER` token and interface, mirroring `EXECUTION_PROVIDER` from Phase 5. One HTTP implementation calls Anthropic; tests substitute a recording stub through `createTestApp`. Every AI feature depends on the interface and never on the SDK directly.

**Stubbing at the service boundary would leave the pipeline untested, and the pipeline is where the defects are.** The stub replaces the outbound call only — retrieval, prompt assembly, queueing, parsing and persistence must all run for real in tests.

**Blocked by:** nothing

**Status:** partial
**Covered by:** test/ai-foundation.int-spec.ts, test/ai-doubts.int-spec.ts, src/ai/marking-boundary.spec.ts

- [ ] A `MODEL_PROVIDER` token resolves to an HTTP implementation in the running application
- [x] A test can substitute a stub through the existing `createTestApp` provider-override list
- [x] The interface carries the model identifier, so per-feature model choice is a caller decision
- [ ] No feature module imports an Anthropic SDK type directly
- [x] A provider error surfaces as a typed failure, not an unhandled rejection
