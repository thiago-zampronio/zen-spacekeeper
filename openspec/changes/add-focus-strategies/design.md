# Design

## Context

Focus mode is one bool (`focusMode`) + one count (`focusKeep`) + one delay
(`focusDelay`), applied in `applyFocusMode` off a `recentGroups` MRU list with
cancellable per-group timers. The owner wants strategies (count vs idle) and an
optional active-on-top ordering. Pref names can never be renamed (stored
identity), and strip moves are the project's most burned ground.

## Goals / Non-Goals

**Goals:** three-way strategy choice; idle retirement with per-group clocks;
opt-in active-on-top; upgrade lands exactly on yesterday's behavior.

**Non-Goals:** closing tabs (focus never closes anything); reordering when
focus mode is off; persisting idle clocks across restarts (a restart is a
fresh day — every clock starts at "now").

## Decisions

**Prefs, additive only.** `focusMode` (bool) stays the master switch;
`focusStrategy` ("groups" | "idle", default "groups") picks the mechanic;
`focusIdleMinutes` (int, default 60, clamped 1-1440) is the idle window;
`focusReorder` (bool, default false) is the ordering option. The panel shows
one radio group of three (Off / Max groups / Max idle) that writes
`focusMode` + `focusStrategy` together; a pre-strategies profile with
`focusMode=true` therefore reads as "groups" automatically because that is
the default strategy. `focusKeep` and `focusDelay` apply to the groups
strategy; the idle strategy has its own window and needs no close delay (the
window IS the delay).

**Idle clocks are a Map, swept by one interval.** `groupLastTouch:
Map<group, timestamp>` updated on TabSelect / TabOpen / TabClose for tabs
inside our groups (the places `keyFromTab` already hooks). One sweep interval
(every 30s, cheap: a Map scan) collapses groups whose clock is older than the
window — skipping the active tab's group, skipping already-collapsed groups,
and animating through the normal collapse path so motion presets apply. A
manual chip-expand touches the clock (TabGroupExpand listener already exists).
Groups with no entry (created before the strategy turned on, restored at
startup) are seeded with "now" at first sight: never collapse something on a
clock that never started.

**Reorder rides the activation moment.** When focus mode is on, reorder is on,
and TabSelect lands in one of our groups that is not already the top group of
its Space, move it above the first of its Space's groups — native
`gBrowser.moveTabGroup`-equivalent first (the same object-signature
`moveTabTo` used by `fixNestedGroups`), rebuild fallback never (a failed lift
is logged and skipped; reordering is cosmetic and must never risk a group).
Never during a drag: the move runs from TabSelect only, not from TabMove.
Debug-logged per lift (`focusLift from/to`). The lift respects pinned/essential
regions by moving relative to the Space's first zstg group, not to index 0 of
the strip.

**The panel Focus card becomes a radio choice plus fields.** Off / Max groups
at once / Max idle time (radio, like the motion presets); "Groups kept open"
and "Focus close delay" shown with the groups strategy; "Idle minutes" with
the idle strategy; "Active groups on top" toggle enabled with either strategy.
Disabled-state sync follows the existing `syncFocus` pattern.

## Risks / Trade-offs

- [Strip moves misbehaving, the 0.27 lesson] → opt-in default-off, activation
  moments only, native move only (no rebuild for cosmetics), per-move logging,
  and the TabMove debounced pass untouched.
- [Idle sweep collapsing something mid-use because "touch" was too narrow] →
  touch = select, open, close, chip-expand; the active group is always immune;
  the window resets generously.
- [A lift fighting the user's manual drag of that same group] → the lift runs
  only when the group is not already top; a user who just dragged a group away
  and then clicks into it accepts the lift as focus semantics — and can turn
  the option off, which is why it is opt-in.

## Open Questions

- None blocking. The idle default (60 min) and sweep cadence (30s) are taste,
  tunable by pref and by eye.
