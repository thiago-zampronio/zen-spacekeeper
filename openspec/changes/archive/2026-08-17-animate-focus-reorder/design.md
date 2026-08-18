# Design: animate the focus-mode group reorder

## Context

`resettleGroupOrder` (src/zen-space-tab-groups.uc.mjs) implements the
open-groups-on-top option: on `TabGroupExpand`/`TabGroupCollapse` it calls
`gBrowser.moveTabTo(group, { tabIndex })` to lift the group above the collapsed
cluster or sink it below the open one. A DOM move is a same-frame reparent —
CSS transitions cannot animate it, so the group teleports. Right beside it, the
expand/collapse itself is animated by the motion presets (`zstg-motion`
attribute, `--zstg-motion-scale` variable, instant fallback under OS reduced
motion), which makes the jump read as a glitch by contrast.

The reorder is cosmetic by contract: on any failure it logs and leaves the
strip alone. The animation must inherit that contract, not weaken it.

## Goals / Non-Goals

**Goals:**

- The rise and the sink read as one continuous movement: the moved group slides
  from its old slot to its new one, displaced groups slide the other way.
- The slide obeys the existing motion rules — instant option and OS reduced
  motion mean no slide, the speed percentage stretches it.
- A failed animation never blocks or corrupts the move itself.

**Non-Goals:**

- Changing what moves, when, or to where (the reorder logic is untouched).
- Animating drags, the nest corrector, adoption, or group creation.
- A new preference, panel control, or i18n string.

## Decisions

### FLIP over the existing move, not a different move mechanism

The move stays `gBrowser.moveTabTo`; the animation is FLIP (First-Last-Invert-
Play) around it: measure `getBoundingClientRect()` of the affected groups
before the move, measure again after, apply the inverted delta as a
`translate` transform, and play it back to zero.

Rejected alternatives:

- **View Transitions API** (`document.startViewTransition`): snapshots the
  whole document and its availability inside a privileged XUL/chrome document
  is unverified. Too much machinery for a one-axis slide, and an unverifiable
  dependency.
- **Animating layout properties** (`margin-top` on the strip): forces reflow
  every frame and needs stylesheet state that can be left stuck if the script
  errors mid-way. FLIP animates only `transform`, which is compositor-cheap
  and cannot corrupt layout.
- **Pure CSS**: impossible; no CSS rule can observe "this element used to be
  lower in the DOM".

### Web Animations API, not CSS classes

The playback uses `element.animate()` rather than adding a CSS class plus a
transition rule. Rationale: `element.animate` is self-cleaning (the effect
ends and leaves no attribute or inline style behind) and needs no addition to
the stylesheet. Cost: the durations live in JS instead of CSS, so the
motion-speed scaling must be read at animation time instead of applying
automatically.

### Which elements slide (measured, not the design's first guess)

Field debugging rewrote this section. The first build measured and animated
the `<tab-group>` element itself — and every delta came back 0,0 while the
strip visibly jumped, because **`<tab-group>` generates no layout box**:
`getBoundingClientRect()` on it returns 0,0,0 permanently, and a transform on
a boxless element paints nothing. So:

- a group's position is read off its **label** (`.tab-group-label`), the one
  child visible in both collapse states;
- the transform plays on the group's **element children** (label container
  and tab container), which do have boxes;
- the playback uses `composite: "add"`, because the fold preset keeps its own
  `translateY` on the tab container — a replacing animation would stomp it
  for the slide's duration and snap on release.

The measured set is the moved group plus every other system group of the same
Space; groups the move did not displace come out with a zero delta and are
skipped, which implements "only the displaced ones slide" without computing
the between-range by hand. Loose tabs and native/foreign groups are not
animated (touching foreign elements is outside the mod's scoping rule). Both
axes of the delta are applied (`translate(dx, dy)`) so the slide is correct
regardless of strip orientation.

The invert step runs one `requestAnimationFrame` after the move and waits (up
to a bounded number of frames) for the label's rect to actually change before
playing — rAF callbacks run before paint, so there is no flash either way. In
practice the move is synchronous and the wait resolves on the first frame;
the bound exists so a layout that never changes ends in a logged give-up, not
an eternal loop.

### Timing and its sources

One duration for the slide — 150ms at 100% speed, settled by field trials at
250, 750 and 150 (the 750 pass existed to make the motion studyable; 150 won
on feel) — a standard ease-in-out, multiplied by the same speed factor the
presets use. Skip entirely — play nothing —
when the instant motion option is selected or `prefers-reduced-motion` matches,
mirroring the "Collapse and expand are animated" requirement's fallback. The
slide deliberately has no preset character of its own: it is positional glue,
not a fourth motion, so it stays identical under every preset.

### Failure contract

All measurement and playback sits inside the existing `try` of
`resettleGroupOrder` (or an inner one): any exception logs via `dbg` and the
move stands un-animated. The animation never delays the move — the DOM order
is final before the first frame plays.

## Risks / Trade-offs

- [The rise plays while the expand animation is still growing the group's
  height, so rects measured at move time drift as the expand continues; the
  slide's end position may be a few pixels off mid-flight] → the slide is
  short and transform-only; the final layout is the browser's own, so any
  drift self-corrects the moment the effect ends. Whether the combination
  reads well is a real-browser judgment — it is an explicit user-verified
  task, and tuning (duration, or measuring after a frame) happens there.
- [A second expand/collapse can fire while a slide is playing, stacking a new
  FLIP on a mid-flight transform] → `getBoundingClientRect` includes the
  current transform, so the new FLIP starts from the visually current
  position; the previous animation is cancelled before the new one plays.
- [`element.animate` behavior on XUL elements inside the chrome document] →
  verified in the field: it plays on the group's children (which have boxes);
  the failure path remains the cosmetic no-op. The related trap — a boxless
  `<tab-group>` measuring 0,0,0 forever — is now a stated decision above.
