# 25 - Sequential, gapless, immutable invoices

**What to build:** Every purchase produces an invoice a college's finance department will accept.

Invoice numbers are sequential and gapless, including under concurrent issuance. Once issued, an invoice cannot be changed - a correction is a credit note, never an edit. Corporate invoices reference the contract; individual invoices reference the payment.

**Blocked by:** None - can start immediately

**Status:** ready-for-agent

- [ ] Every completed purchase produces an invoice
- [ ] Invoice numbers are sequential with no gaps
- [ ] Two invoices issued concurrently receive different sequential numbers and leave no gap
- [ ] An issued invoice cannot be mutated through any interface
- [ ] A correction produces a credit note that references the original invoice
- [ ] A corporate invoice references its contract and an individual invoice references its payment
