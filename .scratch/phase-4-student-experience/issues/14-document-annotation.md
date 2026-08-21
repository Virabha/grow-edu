# 14 - Document annotation

**What to build:** A student highlights and annotates a document, and the marks are there when they return. Annotations are private to the student.

An annotation anchors to a document position and MUST survive the document being replaced by a corrected version, or degrade VISIBLY rather than silently pointing at the wrong place.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] An annotation anchors to a position and reads back at that position
- [ ] Replacing the document with a new version leaves annotations either correctly anchored or explicitly marked as orphaned
- [ ] An orphaned annotation is never silently shown against the wrong text
- [ ] Annotations are private to the student
- [ ] Deleting an annotation removes only it
