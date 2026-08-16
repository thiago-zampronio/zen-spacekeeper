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

**The motion is a preset, settled by a designer-vs-product panel.** One string
pref `zen.stg.collapseMotion`, stamped on each group as a `zstg-motion` attribute
(CSS cannot read prefs); the stylesheet carries one transition block per preset,
all sharing the same hiding mechanism. The axis is spatial narrative — how much
story the motion tells about where the tabs went — with the product numbers tuned
for focus-mode frequency (collapse fires ~6-10x/min; expand sits on the reach-a-
tab critical path):

- `swift` (DEFAULT, 110ms collapse / 140ms expand): opacity leads the collapse at
  80ms — the cheapest motion that still reads as caused; invisible by hour two.
  Default by the frequency rule: both directions are frequent in focus mode, so
  the binding HIG constraint is frequent-equals-faster, not the 200-300ms budget.
- `fold` (180ms collapse / 300ms expand, ease-in-out both ways): the group
  closes as one sheet and discloses open — native-sidebar vocabulary, the
  deliberate end of the spread. Slow motion exposed the first curve choice: a
  decelerate expand dumps nearly all movement into the opening instants and
  reads as Swift's pop, so both directions glide — the sheet never pops.
  First shipped at 150/200 ("tuned down from 180/240" by the frequency rule) and
  field-tested indistinguishable from Swift: a 40-60ms gap between presets sits
  under the noticing threshold. The presets only earn their existence if they
  differ, so Fold carries the slow end — its collapse still inside the
  frequent-action budget, its expand more than double Swift's.
- `cascade` (200ms expand with a 30ms-per-row stagger capped at row 6,
  translateY -10px / 140ms collapse gathering bottom-up at 15ms per row,
  nth-last-child, ~215ms total): rows deal out from the chip top-down and are
  gathered back bottom-first, like cards. The first draft collapsed in one
  un-staggered beat for focus-mode frequency — slow motion showed that collapse
  reading exactly as Swift's, so the gather-up stagger exists at half the
  expand's step, still inside the frequency budget. The original review feared a long stagger gating clicks, but a row
  is clickable the moment the group expands, mid-flight — the stagger delays
  sight, never reach. Field-tested at 15ms it read as Fold; at 30ms the
  dealing-out becomes the thing you see (last row visible from 150ms, settled
  by ~350ms).
- `off`: instant, exactly today's behavior — a peer choice in the same radio
  group, anchoring the baseline the other three are judged against.

`@media (prefers-reduced-motion: reduce)` zeroes every preset's durations: the OS
setting always wins. Off means instant — never "no collapse".

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
