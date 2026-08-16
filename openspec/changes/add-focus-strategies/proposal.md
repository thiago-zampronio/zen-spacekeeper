# Focus mode grows strategies: max groups, max idle time, and active-on-top

## Why

Focus mode today is a single binary: on means "keep the N most recently used
groups open, collapse the rest". The owner, using it daily, asked for focus to
become a **choice of strategies** — because "how many at once" and "how long
since I touched it" are different mental models of focus, and different days
call for different ones. He also asked for an option that makes the focus
visible in the ordering itself: active groups on top, inactive sinking down.

## What Changes

**Focus mode becomes a three-way choice** in the panel (one radio group, like
the motion presets):

- **Off** — nothing collapses automatically. Today's disabled state.
- **Max groups at once** — today's behavior, unchanged mechanics: the N most
  recently used groups stay open, the rest collapse (after the existing close
  delay, cancellable on quick return).
- **Max idle time** — a group that nobody touched for N minutes collapses on
  its own, so stale groups stop occupying the eye. Touching any tab of the
  group (selecting, opening, closing) resets its clock; the active tab's group
  never collapses.

**Active groups can float to the top** (opt-in toggle, available with either
strategy): when focus mode is active and the option is on, the group that
becomes active moves to the top of its Space's strip, so the working set reads
top-down and the collapsed leftovers sink. Loose tabs stay at the bottom, as
specified elsewhere.

**Stored identity is preserved** (CLAUDE.md rule: pref names are never
renamed): `zen.stg.focusMode` (bool) and `zen.stg.focusKeep` keep their
meaning; the strategy choice is a NEW pref `zen.stg.focusStrategy`
("groups" | "idle"), the idle window is `zen.stg.focusIdleMinutes` (int,
default 60), the reorder option is `zen.stg.focusReorder` (bool, default
false). A user upgrading with focus mode on lands on the "groups" strategy —
exactly what they had.

## Impact

- `openspec/specs/group-presentation/spec.md` — the focus requirement gains
  the strategy split, the idle requirement, and the reorder requirement.
- `src/zen-space-tab-groups.uc.mjs` — idle clocks per group, idle sweep,
  reorder-on-activation; new prefs in DEFAULTS/cfg/observer.
- `src/resources/zstg-panel.html` — the Focus mode card becomes a radio
  choice of three plus per-strategy fields and the reorder toggle.
- `src/resources/zstg-i18n.mjs` — new strings, three languages.
- `docs/MANUAL.md` — pref table rows and the focus section.
- `scripts/verify.ps1` — anchors for the new requirements.

**Risk worth naming**: the reorder moves groups on the strip. Strip moves are
this project's most burned ground (the 0.27 bounce). The reorder is therefore
opt-in, default off, uses the same native move-first/rebuild-fallback path as
`fixNestedGroups`, runs only at activation moments (never mid-drag), and is
debug-logged per move.
