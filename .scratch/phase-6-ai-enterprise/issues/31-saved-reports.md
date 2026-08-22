# 31 - A saved report respects the viewer, not the author

**What to build:** Reports are saved, shared, scheduled through the existing queue, and exported. A shared report is evaluated against the viewer's scope.

**Scoping to the author is the obvious mistake and it is a data leak.** A report an owner shares with a corporate administrator must show that administrator only their own students.

**Blocked by:** 30

**Status:** partial
**Covered by:** test/report-builder.int-spec.ts

- [x] A saved report is evaluated against the viewer's scope
- [x] A corporate administrator viewing a shared report sees only their own corporate
- [ ] Scheduling reuses the existing job queue
- [ ] An export produces the same rows the viewer would see interactively
- [x] Revoking a share stops access immediately
