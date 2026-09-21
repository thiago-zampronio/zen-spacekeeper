# Fill the collapse gap Zen 1.22b opened, and hear the next one

## Why

Zen 1.22b collapses nothing when the user collapses a group they made by hand. Zen's
own rule expects the tabs as direct children of `tab-group`, while Zen keeps them
inside `.tab-group-container`, so no rule matches and the tabs stay on screen.

The strip a user sees mixes both kinds of group: the ones Spacekeeper creates collapse,
the ones the user made do not. The report that started this change was "after the Zen
update the mod broke: the first groups close, from the third or fourth on nothing
closes". Measured on the running browser, with the numbers in `zstg-debug.log`:

| element | who hides the tabs | collapsed result |
| --- | --- | --- |
| `zen-folder` | Zen | hidden |
| `tab-group[zstg-key]` | this mod | hidden, active tab kept |
| plain `tab-group` | nobody | `max-height: none`, `overflow: visible`, tabs visible |

The second reason is the shape of the failure, not the failure itself. The stylesheet
finds the tabs through one fixed DOM path, three levels deep. CSS cannot report a miss,
so the day Zen moves the tabs the collapse breaks in silence — which is exactly how
this one was found: by hand, from a user report, one Zen release late.

## What Changes

- The collapse stylesheet also hides the tabs of a collapsed plain `tab-group`, keeping
  the active tab visible, exactly as it already does for the mod's own groups. Zen
  folders (`zen-folder`) and split-view groups keep Zen's own behavior.
- The plain group gets the hiding only. It gets no color, no chip, no label rewriting,
  no motion preset: its appearance stays Zen's.
- Nothing moves by tab index any more. Measured on 1.22b, `_tPos` is undefined on every
  tab of the strip, so a move asked for `tabIndex: undefined` and did nothing at all —
  no exception, no log line. Three features were failing in that same silence: an
  expanded group stopped rising above the collapsed ones, the loose-tab settle stopped
  settling (it logged a move with no from and no to, 54 times from the same position),
  and the unnest fallback stopped unnesting. All three now name a neighboring element,
  and the order decision reads the strip's own child order. This restores behavior the
  specification already requires; it does not change it.
- `check-log.mjs` gains one assertion, because the log had the answer and nothing was
  reading it: a rise or sink whose destination is unreadable, or that repeats the same
  pair twice in a row, is now a violation. On the recorded log it fails 9 times.
- The startup canary gains one DOM probe: the path the stylesheet depends on
  (`tab-group > .tab-group-container > tab`). A Zen release that moves the tabs is then
  named in the console and in the log at the first start, instead of being discovered
  from a user report.

Out of scope: the motion presets for third-party groups (the hiding is instant there),
any visual restyling of third-party groups, and the horizontal tab strip.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `group-presentation`: the requirement that collapsing hides a group's tabs now covers
  the groups the user made by hand, so its "third-party groups are not affected"
  scenario changes from "appearance and collapse stay Zen's" to "appearance stays
  Zen's, and the collapse hides the tabs Zen no longer hides".
- `diagnostics`: the startup canary requirement now also covers the DOM path the
  stylesheet depends on, not only the JavaScript internals.

## Impact

- `src/zen-space-tab-groups.uc.css`: one rule for plain collapsed groups.
- `src/zen-space-tab-groups.uc.mjs`: the moves in `resettleGroupOrder()`,
  `settleLooseTabs()` and the unnest fallback, one shared `lastStripElement()` anchor,
  and three probes inside `checkZenContract()`.
- `scripts/lib/log.mjs`: one assertion over the recorded moves.
- `docs/MANUAL.md`: the collapse section states what the mod does to other groups.
- No preference, no new user-visible string, no change to stored identity.
