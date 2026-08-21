# 12 - Bulk import: parse and preview

**What to build:** The first stage of import. A spreadsheet is parsed and validated into a preview that a human sees before anything commits. Nothing enters the bank at this stage.

A four-hundred-row import with a systematic formatting error is otherwise four hundred defects.

Validation rejects an untagged row, consistent with tagging being mandatory. An import that could bypass the tagging requirement would defeat it.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] A parsed file returns a per-row preview showing what would be created
- [ ] An untagged row is reported as invalid with its row number
- [ ] A malformed row does not abort the parse of the remaining rows
- [ ] The preview reports counts of valid and invalid rows
- [ ] No question exists in the bank after a preview, valid or not
