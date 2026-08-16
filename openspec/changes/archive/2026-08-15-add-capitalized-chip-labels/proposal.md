# Chip labels start with a capital letter

## Why

Derived labels are lowercase ("youtube", "mail.google") while the System group
and typical rule names are capitalized ("System", "Dev") — two casings live on
the same strip and it reads as inconsistency, not information. The owner: one
model, first letter uppercase, rest as it comes.

## What Changes

Every label the system derives is displayed with each dot-separated part's
first letter uppercased ("Youtube", "Mail.Google" — the owner refined the
dotted case: both halves capitalized reads better). Group identity is untouched — the key stays
lowercase, so no existing group is orphaned. Groups alive from an older
session are relabeled only when the current label IS the derived one modulo
case; a user's rename ("Videos", "estudos") is never touched. The rename
prompt keeps whatever the user types: explicit input beats the pattern.

## Impact

- `openspec/specs/group-presentation/spec.md` — the label requirement gains
  the casing rule (delta modifies it).
- `src/zen-space-tab-groups.uc.mjs` — `capLabel` applied at group creation,
  rebuild and reclaim; verify anchor follows.
- `docs/MANUAL.md` — the label examples follow.
