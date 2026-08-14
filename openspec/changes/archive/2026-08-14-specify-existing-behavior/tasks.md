## 1. Confirm the requirements match the code

Each of these reads the code and confirms the written requirement describes it. Any
mismatch is resolved by correcting the requirement, never by changing behavior — if
behavior needs to change, that is a separate proposal.

- [x] 1.1 Version is exposed and every report agrees
- [x] 1.2 The panel states it is not connected when the mod is absent from the window
- [x] 1.3 Self-test covers derivation, precedence, exclusions and invalid config
- [x] 1.4 Self-test is independent of the user's configuration
- [x] 1.5 Self-test checks invariants against the window's real state
- [x] 1.6 Inspection reports Space, key, eligibility and group per tab
- [x] 1.7 The documented command surface matches what is exposed
- [x] 1.8 Commands are present in both context menus, under one entry
- [x] 1.9 Keyboard shortcuts exist for regroup and ungroup
- [x] 1.10 Command outcomes distinguish "nothing to do" from failure
- [x] 1.11 Ungroup asks for confirmation and states what is lost
- [x] 1.12 The log is bounded and starts over
- [x] 1.13 Logging is disabled by default and states what it records
- [x] 1.14 Colors are snapped to the browser's palette
- [x] 1.15 Classification does not depend on the rendered theme colors

Requirement 1.1 did not hold when written: `inspect()` reported version `0.2.0`
while the script was `0.16.0`. Fixed by making the version a single constant, with a
check in `verify.ps1` against reintroducing a literal.

## 2. Anchors in verify.ps1

A requirement with no anchor is a requirement nobody checks.

- [x] 2.1 Anchor for version consistency
- [x] 2.2 Anchor for the self-test
- [x] 2.3 Anchor for inspection
- [x] 2.4 Anchor for the context menus
- [x] 2.5 Anchor for the keyboard shortcuts
- [x] 2.6 Anchor for the log bound
- [x] 2.7 Anchor for palette classification
- [x] 2.8 Confirm the requirement count reported by verify.ps1 matches the spec

## 3. Documentation

- [x] 3.1 README states the palette constraint as a design constraint, not an aside
- [x] 3.2 README states that the log is bounded

Also corrected while in there: the README documented two CSS variables under their
old Portuguese names, `--zstg-raio` and `--zstg-respiro`, which no longer exist.

## 4. Verification

- [x] 4.1 `openspec validate --all --strict` passes
- [x] 4.2 `scripts/verify.ps1` passes with the new anchors
- [x] 4.3 Confirm nothing under `src/` changed as part of this change

4.3 holds for behavior. Three defects found during the audit were fixed in `src/`
and are recorded as bug fixes, not as part of this change: the stale version, a
startup message printing `deson` instead of `off`, and two identifiers left in
Portuguese (`nosso` in the inspection output, `MESMO_DOC`, and a log event name).

## 5. Browser verification

Needs a running browser; not verifiable by reading code.

- [x] 5.1 The self-test button in the panel reports passes and failures as specified
- [x] 5.2 The panel shows the running version, and matches what the console reports
- [x] 5.3 Both context menus show the commands
- [x] 5.4 The keyboard shortcuts work on this machine's layout, or the menu covers it
