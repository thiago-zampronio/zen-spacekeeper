# Tasks

## 1. The collapse gap

- [x] 1.1 Add one rule to `src/zen-space-tab-groups.uc.css` that hides the non-selected
      tabs of a collapsed `tab-group` that is not ours, excluding split-view groups;
      verify: the file states in a comment why the browser's own rule misses, and
      `node scripts/verify.mjs` passes
- [x] 1.2 Confirm the rule cannot reach a native folder or one of our groups; verify:
      the selector names `tab-group` (a `zen-folder` has another tag) and excludes
      `[zstg-key]`

## 2. The next structural change is named, not silent

- [x] 2.1 Add the DOM probe to `checkZenContract()` in
      `src/zen-space-tab-groups.uc.mjs`: a real tab of one of our groups still matches
      the path the stylesheet uses; verify: the probe name appears in the single error
      and in the `contractBroken` log line
- [x] 2.2 Keep the probe silent when no group of ours exists yet; verify: a window with
      no system group logs no `contractBroken`

## 3. Nothing moves by tab index

- [x] 3.1 Replace both moves in `resettleGroupOrder()` with the element-relative browser
      calls, and probe those two calls in the contract; verify: a rise logged twice in a
      row for the same pair no longer happens in the debug log
- [x] 3.2 State in the code comment why an index cannot be used; verify: the comment
      states the measured fact, that `_tPos` is undefined on every tab
- [x] 3.3 Read the order decision off the strip's child order, not off tab positions;
      verify: `from` and `to` in the log are small strip positions, never
      MAX_SAFE_INTEGER
- [x] 3.4 Move the loose-tab settle and the unnest fallback to the same element anchor;
      verify: `looseSettled` logs a real `from` and `to` again
- [x] 3.5 Teach `scripts/check-log.mjs` to fail on a move with no readable destination,
      or the same pair repeated; verify: it reports 9 violations on the log recorded
      before the fix, and none on the log recorded after it

## 4. A group the user made stops acting like an exception

- [x] 4.1 Apply the collapsed ghost (tint, no ring) to every plain collapsed group, not
      only ours; verify: the computed style of a hand-made collapsed chip reports
      `outline-style: none` and the 24% tint
- [x] 4.2 Let the order rule move every plain group of the strip, folders excepted;
      verify: the log records a sink for a group with no key, with a real `from` and `to`
- [x] 4.3 Read the Space from the group's own parent, so a group with no Space attribute
      is still handled and no other Space can be reached; verify: `verify.mjs` passes and
      the moves stay inside one strip

## 5. Documentation and sync

- [x] 5.1 State in `docs/MANUAL.md` what the mod now does to a group the user made;
      verify: `node scripts/verify.mjs` passes
- [x] 5.2 Add the `CHANGELOG.md` entry at release time, with the version bump (the
      `release` skill); verify: `node scripts/verify.mjs` passes

## 6. Needs a running browser (check only after the user confirms the test)

- [x] 6.1 A group made by hand, collapsed, hides its tabs and keeps the label
- [x] 6.2 The active tab of a collapsed group made by hand stays visible
- [x] 6.3 A native Zen folder collapses exactly as before
- [x] 6.4 Our own groups keep their motion preset, and the strip shows no jump
- [x] 6.5 Collapsing a group sends it below the open ones, and expanding it brings it
      back above the collapsed ones

Measured in the browser, from `zstg-debug.log`, not eyeballed — the checkboxes above
stay open until the user confirms what they saw:

- a group made by hand, 7 tabs, collapsed: container height 0, rows shown 0
- a native folder, collapsed: rows shown 0, unchanged
- our groups, collapsed: rows shown 0, and 1 when the group holds the active tab
- collapse sinks the group below the open ones; expand raises it above the collapsed
  ones (the same rise moved nothing before this change)
- [x] 6.6 A group made by hand recedes like ours when closed, and sinks below the open
      ones

Every task in section 6 was confirmed by the user on a running browser, on
2026-09-21: 6.1, 6.5 and 6.6 from two screenshots of his own strip, and 6.2, 6.3
and 6.4 from three tests he ran by hand — the active tab kept visible inside a
collapsed group he had made, a native folder behaving exactly as before, and the
Fold preset played at 25% speed to watch the sheet travel and the reorder slide.
