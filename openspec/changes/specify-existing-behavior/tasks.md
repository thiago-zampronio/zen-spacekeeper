## 1. Confirm the requirements match the code

Each of these reads the code and confirms the written requirement describes it. Any
mismatch is resolved by correcting the requirement, never by changing behavior — if
behavior needs to change, that is a separate proposal.

- [ ] 1.1 Version is exposed and every report agrees
- [ ] 1.2 The panel states it is not connected when the mod is absent from the window
- [ ] 1.3 Self-test covers derivation, precedence, exclusions and invalid config
- [ ] 1.4 Self-test is independent of the user's configuration
- [ ] 1.5 Self-test checks invariants against the window's real state
- [ ] 1.6 Inspection reports Space, key, eligibility and group per tab
- [ ] 1.7 The documented command surface matches what is exposed
- [ ] 1.8 Commands are present in both context menus, under one entry
- [ ] 1.9 Keyboard shortcuts exist for regroup and ungroup
- [ ] 1.10 Command outcomes distinguish "nothing to do" from failure
- [ ] 1.11 Ungroup asks for confirmation and states what is lost
- [ ] 1.12 The log is bounded and starts over
- [ ] 1.13 Logging is disabled by default and states what it records
- [ ] 1.14 Colors are snapped to the browser's palette
- [ ] 1.15 Classification does not depend on the rendered theme colors

## 2. Anchors in verify.ps1

A requirement with no anchor is a requirement nobody checks.

- [ ] 2.1 Anchor for version consistency
- [ ] 2.2 Anchor for the self-test
- [ ] 2.3 Anchor for inspection
- [ ] 2.4 Anchor for the context menus
- [ ] 2.5 Anchor for the keyboard shortcuts
- [ ] 2.6 Anchor for the log bound
- [ ] 2.7 Anchor for palette classification
- [ ] 2.8 Confirm the requirement count reported by verify.ps1 matches the spec

## 3. Documentation

- [ ] 3.1 README states the palette constraint as a design constraint, not an aside
- [ ] 3.2 README states that the log is bounded

## 4. Verification

- [ ] 4.1 `openspec validate --all --strict` passes
- [ ] 4.2 `scripts/verify.ps1` passes with the new anchors
- [ ] 4.3 Confirm nothing under `src/` changed as part of this change

## 5. Browser verification

Needs a running browser; not verifiable by reading code.

- [ ] 5.1 The self-test button in the panel reports passes and failures as specified
- [ ] 5.2 The panel shows the running version, and matches what the console reports
- [ ] 5.3 Both context menus show the commands
- [ ] 5.4 The keyboard shortcuts work on this machine's layout, or the menu covers it
