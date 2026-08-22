# 35 - Landing pages composed from a defined block palette

**What to build:** A page composed from an ordered list of blocks drawn from a palette we define. Per `AUDIT.md` §8.2 the recommendation is a section builder — reorder, show and hide predefined sections — rather than free-form drag-and-drop.

**`specs/DECISIONS.md` records an unresolved conflict about whether the reference product's palette exists as documented. That conflict is resolved by defining our own palette, and the temptation to reverse-engineer theirs should be resisted.**

**Blocked by:** nothing

**Status:** done
**Covered by:** test/page-builder.int-spec.ts

- [x] A page is an ordered list of blocks from a defined palette
- [x] A block kind outside the palette is rejected
- [x] Blocks can be reordered, shown and hidden
- [x] A draft page is not publicly readable until published
- [x] Publishing is an explicit action, not a side effect of saving
