# Design

## Context

Labels are born in three places: group creation (`label: info.label`), the
nested-group rebuild (reuses the live label), and reclaim of groups restored
by the session. The System label comes from the catalog, already capitalized.

## Goals / Non-Goals

**Goals:** one casing pattern on the strip; zero identity impact; user renames
sacred.

**Non-Goals:** capitalizing every word (only the first letter); touching the
key; CSS text-transform (Gecko's `capitalize` uppercases after punctuation
too — "Mail.Google" — and `::first-letter` does not apply to the label's
layout reliably).

## Decisions

**One helper, applied at the display boundary.** `capLabel(s)` uppercases the
first character. Applied where the derived label meets a group: creation and
the rebuild fallback. Reclaim relabels only when the live label equals the
derived label case-insensitively — that is exactly "the label the system gave
it, in the old casing"; anything else is the user's rename and is kept. The
rename prompt stores the user's text verbatim.

## Risks / Trade-offs

- [A user who WANTS lowercase] → renaming the group is respected forever; the
  pattern only governs labels the system itself derived.

## Open Questions

- None.
