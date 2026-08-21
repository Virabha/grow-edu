# 04 - Structured rich content

**What to build:** Question prompts, options and explanations are stored as structured content — a sequence of typed blocks for text, mathematics, code and images — not as a markup blob.

A markup string renders differently in the authoring view, the attempt view, the result view and any export, and drifts between them. A structured format renders identically everywhere.

Images reference the existing media pipeline; nothing here uploads by a parallel path.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] A prompt containing text, a mathematics block and an image round-trips unchanged
- [ ] An option can carry mathematics
- [ ] A code block retains its language so it can be highlighted
- [ ] An unknown block type is rejected at authoring rather than stored and failing to render
- [ ] Content is identical in the authoring read, the attempt read and the result read
