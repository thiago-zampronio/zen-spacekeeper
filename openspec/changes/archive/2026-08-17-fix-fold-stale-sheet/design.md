# Design: settle-aware sheet measurement for fold

## Context

Fold animates the tab container as a window over a rigid sheet; the sheet's
height cannot be expressed in CSS, so the script measures the expanded
container's `scrollHeight` and publishes it as `--zstg-sheet-measured`.
Publication rides `updateHiddenCount` on the theory that every tab-mutation
path already calls it and staleness lasts at most one paint.

The field trace of 2026-08-17 broke that theory. Three flavors, one disease:

1. A tab adopted into an **expanded** group is measured ~6ms after `addTabs`,
   while the browser's tab-insertion animation still has the new row at ~1px
   (`sheetMeasured 120 → 121` for a 4-row group).
2. The expand-time re-measure runs on a 0ms timeout after `TabGroupExpand`,
   while fold's own selected-row choreography still has neighbor rows mid
   transition (`sheetMeasured … → 40` and `… → 80` for the same 4-row group).
3. A tab adopted into a **collapsed** group is deliberately not measured (the
   collapsed guard protects other presets' zero-height rows), and flavors 1–2
   then corrupt the catch-up measure on expand.

In every flavor the published number becomes the container's clip, and the
rows beyond it are invisible until some later path happens to republish.

## Goals / Non-Goals

**Goals:**

- A published sheet height always reflects settled layout, never a
  mid-animation snapshot.
- After expand, every tab of the group is visible — no clipped tail.
- The fix lives entirely in how the height is obtained; fold's mechanics and
  the CSS contract (`--zstg-sheet-measured`) are untouched.

**Non-Goals:**

- Reworking the fold preset, its timings or curves.
- Touching swift/cascade (no published clip to go stale).
- Suppressing the browser's tab-insertion animation.

## Decisions

### Settle loop instead of a smarter single measurement

`publishSheetMetrics` keeps its immediate row-count publication, but the
height goes through a settle loop: read `scrollHeight` once per
`requestAnimationFrame`, publish when two consecutive frames agree, stop
either way at a bounded window (~90 frames, the same bound the reorder slide
uses). The loop re-arms — replacing any loop already running for that group —
on every trigger, so the newest mutation wins.

Rejected alternatives:

- **Predicting the settled height** (rows × measured row cap): margins and
  per-row differences make the prediction the same kind of lie the calc
  fallback already is; the whole point of the measured variable is to beat
  that estimate.
- **Waiting for `transitionend`/`animationend`**: there are two animation
  systems in play (the browser's tab insertion and fold's CSS transitions) on
  elements the mod does not own; enumerating their end events is coupling to
  internals the project deliberately avoids. Polling per frame observes the
  outcome instead of the mechanism.
- **A fixed delay**: any constant is wrong under `motionSpeed` stretching (a
  25% speed quadruples every duration).

Cost stated plainly: during the settle window the clip briefly holds the OLD
value, so a group can be visually short for the duration of the in-flight
animations (a few hundred ms at worst under slow motion). That is the same
window in which the layout itself is moving, and strictly better than holding
the old value forever.

### The collapsed guard stays

Measuring a collapsed group is still wrong for swift/cascade (zero-height
rows) and unnecessary for fold: the settle loop armed by the expand event
publishes the right value as soon as rows stop moving. One mechanism covers
the gap the guard leaves.

### Stability is movement-gated and publishes once (two field failures shaped it)

The first cut published on any two equal consecutive readings — and its first
field test published the LEADING plateau: for a frame or two after the
trigger the transition has not started yet, so the pre-animation layout reads
identically twice and got published (`sheetMeasured 160 → 40, frames: 2` on
the very flow under repair). The second cut gated on movement but republished
every later plateau — and its first field test showed the publishes
RETARGETING the running expand: the window animated to the transient value,
finished, and only then expanded the rest, a visible two-stage motion. The
final shape:

- stability only counts after the reading has been seen to CHANGE from the
  loop's initial value;
- after movement, the value must hold for a stretch of frames scaled by the
  motion-speed factor (a slowed easing crawls, so its false plateaus last
  longer too; the window scales the same way), and then the loop publishes
  ONCE and stops — in a healthy flow that publish equals the current value,
  so the animation is never redirected; recovering from a stale value costs
  one retarget at the end of the motion, which is the recovery working;
- a window with no movement at all means the strip was at rest, and the
  initial value is published as-is at the window's end.

## Risks / Trade-offs

- [A trigger storm (rapid collapse/expand) arms and re-arms the loop, so the
  publish lands late] → each re-arm replaces the previous loop; the final
  state is measured once things calm down, which is the only state that
  matters.
- [`scrollHeight` plateaus mid-animation for two frames and publishes a wrong
  value] → possible in principle with easing plateaus; the next trigger
  (TabSelect, collapse, expand, tab mutation) re-arms and corrects. The
  failure mode is the status quo, not a regression.
- [The loop runs while the group is being removed] → each iteration re-checks
  `isConnected` and stops silently; publication on a dead element is a no-op
  anyway.
