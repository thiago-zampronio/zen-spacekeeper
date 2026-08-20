## 1. The reorder at birth

- [x] 1.1 In `organize()` in `src/zen-space-tab-groups.uc.mjs`, after
  `markAsOurs` / `applyFaviconColor` / the `groupCreated` log line, schedule the
  reorder for the group just created:
  `window.setTimeout(() => guarded(() => resettleGroupOrder(group)), 0)` —
  the same shape `onGroupCollapseChanged` uses
- [x] 1.2 Add a comment at that call site naming why creation is the third
  moment: the anchor is the tab's own position and the loose settle has already
  pushed it to the end of the Space, so without this the new group is the one
  group guaranteed to be born under the collapsed cluster
- [x] 1.3 Update the comment above `resettleGroupOrder` (currently
  "Triggered by collapse/expand events only, never from TabMove") so it names
  creation as a trigger and still records that TabMove is not one
- [x] 1.4 Leave `resettleGroupOrder` itself unchanged — no new parameter, no
  new branch

## 2. Text and documentation

- [x] 2.1 Update `focusReorder.help` in `src/resources/zstg-i18n.mjs` for all
  three languages: the move happens when a group opens, closes, or is created;
  keep the "never on tab focus, never during a drag" clause
- [x] 2.2 Update the `zen.stg.focusReorder` row of the preference table in
  `docs/MANUAL.md` to mention the creation moment
- [x] 2.3 Add the `CHANGELOG.md` entry, written for the person reading it in
  the panel: a group that appears now lands with the open ones instead of at
  the bottom

## 3. Checks that do not need a browser

- [x] 3.1 `node scripts/verify.mjs` passes — spec, docs, syntax, languages,
  installed files
- [x] 3.2 `npx eslint src/` finds nothing (no-undef, no-unused-vars): confirms
  `resettleGroupOrder` is in scope at the new call site
- [x] 3.3 The three i18n catalogs still hold the same key set
  (`verify.mjs` covers this; confirm it is the check that fired)

## 4. Verification that needs a running browser — check only after the user confirms

- [x] 4.1 With focus mode on, reorder on, and a Space whose strip ends in a
  cluster of collapsed groups: open a tab on a site with no group yet. The new
  group appears in the open cluster, not at the bottom
- [x] 4.2 The move is a visible slide, not a jump, under the `fold` preset
- [x] 4.3 `zstg-debug.log` shows a `focusRise` immediately after the
  `groupCreated` — the signal whose absence diagnosed the bug
- [x] 4.4 Opening a link with cmd+click (background tab, sidebar hidden) lands
  the new group in the open cluster without any further interaction
- [x] 4.5 A group created when no collapsed group sits above it does not move,
  and logs no `focusRise`
- [ ] 4.6 With the reorder option off, a newly created group stays where it was
  born
- [ ] 4.7 A group created in one Space leaves the other Space's group order
  untouched
- [x] 4.8 Collapse and expand still reorder as before, and switching tabs alone
  still moves nothing
- [ ] 4.9 The panel shows the updated help text for the option, in each of the
  three languages
