# Requirement inventory

One CSV per module. One row per assertion provable by a single test.

## Schema

```
id,module,assertion,actor,doc_ref,demo_path,expected_code_path,test_ref,status,evidence,notes
```

| column | meaning |
|---|---|
| `id` | `<PREFIX>-nnn`, unique across all modules |
| `module` | module name, matching the filename |
| `assertion` | one testable statement; if it contains "and", split it |
| `actor` | guest / student / instructor-own / instructor-other / admin / sub-admin |
| `doc_ref` | doc anchor, and the screenshot the evidence came from |
| `demo_path` | UI path where the behaviour is observable |
| `expected_code_path` | where it would live in this repo (best guess, not binding) |
| `test_ref` | blank until a test exists |
| `status` | **always `MISSING`** at harvest time, no exceptions |
| `evidence` | what in the doc/screenshot supports the row |
| `notes` | `[Q-nnn]` refs, "observed, not documented", etc. |

## Row types

Every module covers all seven, not just `FR`:

| type | one row per |
|---|---|
| `FR` | behaviour |
| `UX` | one state, interaction, or copy rule on one screen |
| `VAL` | one rule on one field, including the exact message |
| `PERM` | one actor × one action × one resource, including the denial |
| `CFG` | one admin setting and its downstream effect |
| `API` | one endpoint: method, path, auth, request, response, error codes |
| `NFR` | performance, a11y, i18n, security |

## ID prefixes

| prefix | module | doc sections |
|---|---|---|
| `PLT` | platform-overview | 5 |
| `CRS` | courses | 7 |
| `ORD` | orders-payments | 7 |
| `USR` | users-auth | 9 |
| `STU` | student-portal | 6 |
| `INS` | instructor-portal | 7 |
| `CMS` | cms-appearance | 15 |
| `SET` | settings-integrations | 19 |
| `CHG` | changelog-features | 1 (`update_log`) |

76 of the 81 doc sections are harvested.

## Not harvested — and why

| section | reason |
|---|---|
| `documenter_cover` | 125 chars, title page only |
| `installation` | server setup, not product behaviour |
| `how_to_update` | upgrade procedure |
| `addon_install` | addon install procedure |
| `support` | vendor support contact details |

Nothing else is dropped. If you add a section here, say so — a silent cap reads
as "we covered everything" when we did not.

## Why `changelog-features` exists

`update_log` was initially classified as a changelog and excluded. That was
wrong: it is the single densest specification source in the doc set, and it names
**nine substantial features that have no documentation section at all** —
assignments, refunds, instructor earnings hold, device login management, Google
Calendar sync, Q&A, favourites, cart, and admin-created accounts. It also gives
exact behaviours the section pages omit (for example: when a student exceeds the
device limit, the *oldest* logged-in device is the one logged out).

A harvest driven by the table of contents alone would have missed all of it.

## Validating

```
node specs/validate.mjs
```

Checks the header, that every `status` is `MISSING`, that `test_ref` is blank,
that every `id` is unique across all modules, that every assertion carries a type
tag, and that every `actor` is one of the six recognised roles.
