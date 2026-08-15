## Why

Groups collapse and expand by teleport: tabs vanish, the sidebar reflows, done. In
focus mode it is worse — the collapse happens seconds after the user's last
action, so something disappears "on its own" in front of them, which reads as a
bug, not a feature. The maintainer's framing: a delay alone makes that WORSE;
delay and motion belong together, so the eventual collapse is a legible animation
instead of a silent vanishing.

## What Changes

- **Collapse and expand animate**: the tabs of a system group slide closed and
  open instead of blinking out of existence, scoped — as all styling is — to the
  groups the system created. Respects the OS "reduce motion" setting: with it on,
  behavior returns to instant, exactly as today.
- **Focus mode gains a configurable close delay** (`zen.stg.focusDelay`, in
  milliseconds): groups leave the recent set only after the delay, and a group the
  user returns to before it fires never collapses at all — killing the flicker of
  fast switching.
- The motion is a CHOICE: one string preference (`zen.stg.collapseMotion`) with
  four values rendered as a single radio group in the panel — `off` (instant,
  today's behavior), `swift` (default), `fold`, `cascade` — designed by a motion/
  product panel under Apple's HIG frequency rule: collapse repeats constantly in
  focus mode, so every preset's collapse is faster than its expand, and no preset
  may gate reaching a tab mid-animation.

Out of scope:

- Animating tab MOVES (the settle pass, group reordering) — those are the
  browser's own layout, not ours to animate.
- Animating group creation/removal — revisit after the collapse motion proves
  itself.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `group-presentation`: the collapse-hides-tabs requirement gains the animated
  transition (with the reduced-motion and preference escapes); the focus-mode
  requirement gains the delay.

## Impact

- `src/zen-space-tab-groups.uc.css`: the collapse mechanism changes from
  `display: none` (unanimatable) to an animatable hiding — the heart of the change.
- `src/zen-space-tab-groups.uc.mjs`: focus-mode delay with cancellation; pref
  plumbing.
- Panel + `zstg-i18n.mjs`: two controls in the Appearance/Grouping sections, three
  languages.
- `scripts/verify.ps1`: the `display: none` anchor follows the new mechanism.
- `docs/MANUAL.md`: pref table rows.
