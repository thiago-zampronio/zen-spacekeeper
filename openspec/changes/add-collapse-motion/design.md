## Context

The collapse styling is ours (Zen only styles `zen-folder[collapsed]`), and today
it hides tabs with `display: none` — which cannot animate, by CSS definition. The
focus mode collapses groups the moment they leave the recent set, so the two
abrupt things compound: system-initiated AND instant.

## Goals / Non-Goals

**Goals:** collapse/expand read as motion; focus mode stops shaking the sidebar on
fast switches; accessibility (reduced motion) and taste (a preference) both
respected; everything scoped to `tab-group[zstg-key]` as always.

**Non-Goals:** animating tab moves or group creation/removal; touching how native
structures animate (or don't).

## Decisions

**The hiding mechanism changes from `display: none` to an animatable pair.**
`display` cannot transition; the collapsed state becomes
`max-height: 0; opacity: 0; overflow: hidden; pointer-events: none` on the
group's tabs (expanded: a max-height comfortably above one tab row), with a short
transition (~150-200ms, ease-out) on both properties. Max-height is the pragmatic
Gecko-safe way to animate height-to-zero without knowing intrinsic sizes; the cap
must stay tight so the expand does not lag visually on the first tab. Everything
stays inside the existing selectors — `tab-group[zstg-key][collapsed] > ...` — so
native structures and manual groups never inherit it.

**Reduced motion and the preference gate the ANIMATION, not the hiding.** A
`@media (prefers-reduced-motion: reduce)` block zeroes the transition durations;
the `zen.stg.collapseAnimation` pref does the same via an attribute the script
stamps on the group container (CSS cannot read prefs). Off means instant — the
exact current behavior — never "no collapse".

**Focus delay is a cancellable timer per group.** `applyFocusMode` stops
collapsing directly: groups that left the keep-set get a timer
(`zen.stg.focusDelay`, default ~800ms; `0` restores today's immediacy); the timer
collapses the group only if it is STILL outside the keep-set when it fires, and
re-entering the set cancels it. Timers are cleared on unload and when focus mode
turns off.

**The verify anchor follows the mechanism.** The
"group-presentation/collapse hides tabs" anchor points at `display: none` today;
it moves to the new collapsed-state rule, and a new anchor covers the reduced-
motion block — the accessibility promise is spec, so it gets an anchor too.

## Risks / Trade-offs

- [max-height transitions animate from the cap, not the content height, making
  tall groups close with a perceptible head start] → the cap is per-TAB (applied
  to each tab row, not the container), so every row animates its own 40-ish
  pixels uniformly; groups of any size close in the same beat.
- [Zen updates its tab markup and the transition targets drift] → same exposure
  the collapse styling already has; the canary-and-selfTest net is unchanged.
- [A delay default that feels laggy] → 800ms is a starting point, not a truth;
  the pref exists precisely because this is taste, and the panel explains it.

## Open Questions

- None blocking; the duration/easing values are tuned in a running browser during
  implementation, which only the maintainer can judge by eye.
