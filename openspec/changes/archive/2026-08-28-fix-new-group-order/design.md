## Context

`resettleGroupOrder` already implements the whole reorder — the partition into
open and collapsed clusters, the minimal move, the slide animation, the
per-Space scoping, and the cosmetic contract that swallows any failure. It has
exactly one call site: `onGroupCollapseChanged`, at
`src/zen-space-tab-groups.uc.mjs:2511`, reached through
`setTimeout(..., 0)` wrapped in `guarded`.

Group creation happens in `organize()`. The new group is anchored by
`anchorFor(tab, spaceId)`, which walks up from the tab to its direct child of
the Space container — so the group is born exactly where its anchor tab sat.
`settleLooseTabs` has already moved that tab to the end of the Space, because
at the 120 ms `schedule` pass the tab is still on `about:blank` and has no
resolvable key. The result is structural, not intermittent: the group is born
at the bottom of the strip, and nothing ever lifts it.

The user's debug log measures both halves. 36 of 42 expanded creations landed
below one to six collapsed groups. All 37 reorder moves in the log followed a
`collapseEvent`; none followed a `groupCreated`. And the grouping itself was
never slow — `looseSettled` to `groupCreated` ran with a median of 70 ms, so
the "it did not notice my tab" symptom was the group being invisible at the
bottom, not the group being late.

## Goals / Non-Goals

**Goals:**

- A group born expanded ends up in the open cluster, without the user having to
  collapse or expand anything.
- Reuse `resettleGroupOrder` unchanged, so the slide, the minimality, the Space
  scoping and the cosmetic failure contract come along for free.
- Keep the exclusions intact: tab focus still moves nothing, drags are still
  never fought.

**Non-Goals:**

- Changing where a group is anchored at birth. The anchor stays the tab's own
  position.
- Changing `settleLooseTabs`, which is what put the anchor at the bottom. It is
  doing its own job correctly.
- Any change to the reorder option's default, to the focus strategies, or to
  the collapse presets.

## Decisions

**Reorder at birth, rather than anchoring the new group inside the open
cluster.** Anchoring correctly at creation would avoid the visible travel from
the bottom, but it means computing the open/collapsed partition in a second
place — `organize()` would need its own copy of the logic that
`resettleGroupOrder` already owns, and the two would drift the first time one
of them is touched. It would also have to duplicate the "leave loose tabs
alone" and per-Space guarantees. Reusing the existing function costs one call
site and keeps a single definition of what "on top" means. The cost is honest:
the group does appear at the bottom for one frame before sliding up. Since the
move is animated as a slide by design, that travel is the feature announcing
itself, not a glitch.

**Deferred through `setTimeout(..., 0)` and `guarded`, mirroring the collapse
path.** `organize()` already runs inside `guarded`, so a synchronous call would
execute with the busy flag held and would sit between the group's creation and
`applyFaviconColor`. The collapse path deliberately defers so the browser's own
group bookkeeping settles before positions are read, and `resettleGroupOrder`
reads `_tPos` off live tabs. There is no reason for the creation path to be the
one that reads them early. Deferring also puts the move after the caller's
`settleLooseTabs`, which is the right order: the loose tabs are parked at the
end of the Space, and lifting the group past the collapsed cluster does not
disturb them.

**No new preference and no new log event of its own.** The existing
`focusRise` / `focusSink` entries already name the key and the target index, so
a creation-triggered move is visible in the log as a `focusRise` immediately
after the `groupCreated` it belongs to — which is exactly the signal whose
absence diagnosed the bug. Adding a separate event would make the two moments
harder to compare, not easier.

**The user-visible help text and the manual both change.** Both currently
promise that the move happens "when a group opens or closes". Leaving them
would make the option's own description contradict what it does. Three
languages in `zstg-i18n.mjs` plus the `zen.stg.focusReorder` row in
`docs/MANUAL.md`.

## Risks / Trade-offs

**A Space activated for the first time can create several groups in one pass,
each scheduling its own reorder** → `organizeSpaceOnce` loops over the Space's
ungrouped tabs, so the timers queue up and the strip could visibly shuffle a
few times. Mitigated by the move already being minimal and by
`resettleGroupOrder` returning early when nothing is misplaced; most tabs in a
restored Space arrive inside reclaimed groups rather than newly created ones,
so the realistic count is low. Accepted rather than special-cased: suppressing
the reorder during the restore pass would leave exactly the bug being fixed on
the strip the user sees first.

**`moveTabTo` fires `TabMove`, which re-arms the debounced nest fix** → this is
already true of every collapse-triggered reorder, and `onTabMove` converges by
design: the corrective pass finds nothing misplaced and stops. The creation
path adds no new shape of move, only a new moment for the same one.

**Behavior verification needs a running browser.** The reorder is a DOM move
with an animation; `verify.mjs` cannot see it and `zstg-core.mjs` holds no
logic for it. The creation case has to be confirmed by hand, with the debug log
showing a `focusRise` right after a `groupCreated`. That check stays in the
user-confirmed section of `tasks.md`.
