## Why

The reorder option promises that a Space's expanded groups sit above its
collapsed ones, but a group has never been repositioned at the moment it is
born. `resettleGroupOrder` has a single call site, on the collapse and expand
events, so a brand-new group stays wherever its anchor tab was — and because
the loose-tab settle has already pushed that not-yet-classifiable tab to the
end of the Space, the group is born expanded at the very bottom of the strip,
under the collapsed cluster.

A user's debug log makes the size of the hole plain: of 42 groups created
expanded, 36 landed below between one and six collapsed groups, and not one
reorder move in the whole log followed a creation — all 36 followed a collapse
or expand. The feature reads as broken exactly when it matters most, on the
group the user just opened, and a second symptom rides along: the new group
appears to have been ignored until the user clicks another tab, because only
then does a collapse event finally trigger the move that lifts it into view.
The grouping itself was never late — the same log shows it landing within a
median of 70 ms.

## What Changes

- The reorder option gains a third moment: a group created expanded rises into
  the open cluster, exactly as a group that expands does today.
- The requirement's "react to collapse and expand only" clause becomes "react
  to collapse, expand and creation only". Tab focus and drags remain excluded,
  unchanged.
- The move at creation is the same move: minimal, animated as a slide,
  cosmetic, and confined to the group's own Space. No new mechanism.
- The option's user-visible help text and the manual's preference table, which
  both currently say the move happens when a group opens or closes, gain the
  creation moment.
- Not breaking: the option is off in the raw fallback, the stored preference is
  untouched, and a profile with the option off sees no change at all.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `group-presentation`: the requirement *Open groups sit above collapsed ones*
  extends its trigger list to include the birth of a group. Its scenarios gain
  the creation case; the exclusions for tab focus and drags stay as they are.

## Impact

- `src/zen-space-tab-groups.uc.mjs`: `organize()` calls `resettleGroupOrder`
  on the group it just created. `resettleGroupOrder` itself is unchanged.
- `src/resources/zstg-i18n.mjs`: `focusReorder.help` in all three languages.
- `docs/MANUAL.md`: the `zen.stg.focusReorder` row of the preference table.
- No preference is added, renamed or removed; no stored identity is touched.
- Out of scope: where a group is anchored when it is created (the anchor stays
  the tab's own position — the reorder is what corrects it afterwards), the
  loose-tabs-at-bottom behavior that produced the bottom anchor, the focus
  strategies, and any change to the reorder option's default.
