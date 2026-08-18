# Animate the focus-mode group reorder

## Why

With focus mode's reorder option on, a group that expands rises above the
collapsed cluster — but the move is a raw DOM reposition (`gBrowser.moveTabTo`),
so the group teleports to its new place in a single frame. The expand itself is
animated by the chosen motion preset, which makes the instant jump right next to
it read as a glitch, exactly the effect the motion presets exist to avoid. With
several collapsed groups the jump distance is large and the disorientation is
daily: the user expands a group at the bottom and has to visually re-find it at
the top.

## What Changes

- The rise (on expand) and the sink (on collapse) performed by the reorder
  option animate as a slide: the moved group glides from its old position to
  its new one, and the groups it passes glide the opposite way to fill the gap
  (a FLIP animation over the same `moveTabTo` call — the DOM move itself is
  unchanged).
- The slide obeys the existing motion contract: it is instant when the instant
  motion option is chosen or when the OS asks for reduced motion, and its
  timing stretches with the motion speed percentage. No new preference.
- The animation is cosmetic by the same contract as the reorder itself: any
  failure to measure or animate skips the slide and leaves the move intact.

Out of scope:

- The reorder logic itself — what moves, when, and to where is untouched.
- Animating any other strip movement (drags, the nest corrector, tab adoption,
  group creation).
- A new preference or panel control for this slide.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `group-presentation`: the "Open groups sit above collapsed ones" requirement
  gains the animated-slide behavior, wired to the motion rules (instant option,
  OS reduced motion, speed scaling) that the collapse/expand animation
  requirement already establishes.

## Impact

- `src/zen-space-tab-groups.uc.mjs`: `resettleGroupOrder` grows the FLIP
  measurement/animation around its existing `moveTabTo` calls.
- `src/zen-space-tab-groups.uc.css`: possibly a helper rule for the slide
  transition, scoped to `tab-group[zstg-key]` as everything else is.
- `docs/MANUAL.md`: the reorder option's description mentions the slide.
- No new preferences, no i18n strings, no panel changes.
