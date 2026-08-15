## Context

The mod creates groups AT the tab's position (the `insertBefore` anchor guarantees
the right Space), and it deliberately never moves loose tabs — which is exactly why
they end up wedged between the groups that formed around them.

## Goals / Non-Goals

**Goals:** one settle pass that pushes misplaced loose tabs below their Space's
last group, cheap enough to run after every organization, moving only what is
misplaced.

**Non-Goals:** ordering groups; sorting loose tabs; touching pinned/essential/
folders/manual groups; anything cross-Space.

## Decisions

**Settle runs where organization already runs.** After `organize()` acts on a tab,
after `regroup()`, and inside the delayed reclaim passes — the same moments groups
can appear or move. It is a no-op scan when nothing is misplaced, so frequency is
cheap.

**"Misplaced" is DOM order against the Space's last group.** Within the Space's
tab container: find the last `tab-group` element; every ungrouped ELIGIBLE tab
whose DOM position precedes it is misplaced. Eligibility is the existing gate
(pinned, essential, empty, split, folder and manual-group tabs are already out).
Misplaced tabs move after the last group in their existing relative order.

**Moves use the browser's tab-move API, never raw DOM.** `gBrowser.moveTabAfter`/
`moveTabTo` keep session state, indexes and Zen's bookkeeping consistent; raw
appendChild would lie to everything that tracks tab order. THE RISK OF THIS CHANGE
lives here: Zen's per-Space containers mean global tab indexes and per-Space
positions disagree, and which move API respects the Space container has to be
iterated in a running browser. The task list isolates this in one function with a
debug-log event per move, so a wrong move is visible and diagnosable immediately.

**Gated by `zen.stg.looseTabsAtBottom`, default on.** Off restores today's
behavior bit for bit (the settle pass simply never runs).

**A manual drag into the middle is re-settled, by design.** The user asked for
"always at the bottom"; the preference is the escape hatch for whoever wants
manual placement of loose tabs. The settle only ever runs on organization events,
so the drag is not fought in real time — it is corrected on the next organization.

## Risks / Trade-offs

- [Zen's move APIs surprise us across per-Space containers] → isolated in one
  function, debug-logged per move, iterated in-browser before the change is
  archived; the pref turns the whole pass off in the field if something slips.
- [Move storms on session restore] → the settle piggybacks on passes that already
  run then; it moves only misplaced tabs, and a restored session converges in one
  pass.
- [The active tab moves under the user] → position moves never change focus; the
  selected tab stays selected.
