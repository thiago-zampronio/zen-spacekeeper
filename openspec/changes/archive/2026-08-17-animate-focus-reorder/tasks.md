# Tasks: animate the focus-mode group reorder

## 1. Implementation

- [x] 1.1 Add a slide helper in `src/zen-space-tab-groups.uc.mjs`: given the
      moved group and the displaced system groups of the same Space, measure
      rects before the move, re-measure after, cancel any in-flight slide on
      those elements, and play the inverted deltas back to zero with
      `element.animate` (150ms ease-in-out at 100% speed, settled by field
      trials at 250/750/150)
- [x] 1.2 Read the timing gates at animation time: skip the slide when the
      instant motion option is selected or `prefers-reduced-motion` matches,
      and multiply the duration by the `--zstg-motion-scale` factor
- [x] 1.3 Wire the helper into both branches of `resettleGroupOrder` (sink and
      rise), inside the existing cosmetic-failure contract: any exception logs
      via `dbg` and leaves the completed move un-animated
- [x] 1.4 Update the reorder option's description in `docs/MANUAL.md` to
      mention the slide

## 2. Verification (code)

- [x] 2.1 Run the installer to copy `src/` into the profile
- [x] 2.2 Run `scripts/verify.ps1` and confirm it passes

## 3. Verification (running browser — only the user confirms these)

- [x] 3.1 With reorder on and several collapsed groups, expanding a low group
      slides it up and slides the displaced collapsed groups down — no jump —
      and the combination with the expand animation reads well (tune duration
      here if it does not) — user-confirmed 2026-08-17, at 750/250/150ms
- [x] 3.2 Collapsing an open group slides it down below the open cluster —
      user-confirmed 2026-08-17 in the same trials
- [x] 3.3 With the instant motion option, and again with OS reduced motion,
      the reposition is instant — not individually retested; waived by the
      owner's finalize-and-archive decision of 2026-08-17 (the gate short-
      circuits before any measurement, verified by code review)
- [x] 3.4 With motion speed below 100, the slide visibly slows by the same
      factor as the presets — not individually retested; waived by the same
      decision (single duration multiplied by the shared speed factor)
- [x] 3.5 Rapidly expanding/collapsing during a slide never leaves a group
      visually stuck or offset; the strip always settles in the correct order
      — exercised heavily in the live-log sessions of 2026-08-17 (burst
      toggles ~1/s) with zero failure events logged and no sticking reported
- [x] 3.6 Groups in another Space do not move or animate — not individually
      retested; waived by the same decision (the resettle set is filtered by
      the tab's own Space attribute, the project's core invariant)
