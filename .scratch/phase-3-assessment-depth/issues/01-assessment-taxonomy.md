# 01 - Assessment taxonomy

**What to build:** A subject → topic → sub-topic hierarchy and an ordinal difficulty scale, both owner-managed configuration rather than a hardcoded list. Every question authored from ticket 03 onward tags against this.

This lands first because mandatory tagging is meaningless without something to tag against, and because retrofitting a taxonomy over a populated bank never happens.

A node cannot be deleted while questions reference it; it can be retired.

**Blocked by:** None - can start immediately

**Status:** ready-for-agent

- [ ] The owner can create a subject, a topic under it and a sub-topic under that
- [ ] Rename propagates: a question tagged to a renamed topic still resolves to it
- [ ] Deleting a node that has questions is refused; retiring it succeeds and hides it from authoring pickers
- [ ] The difficulty scale is ordinal and its values are configuration, not literals in code
- [ ] A question tagged to a retired node still reads back correctly
