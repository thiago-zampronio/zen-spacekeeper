# Tasks: settle-aware sheet measurement for fold

## 1. Implementation

- [x] 1.1 Turn the height half of `publishSheetMetrics` into a settle loop:
      keep the immediate `--zstg-rows` publication, then re-read the expanded
      container's `scrollHeight` once per `requestAnimationFrame` and publish
      `--zstg-sheet-measured` ONCE — after the value has been seen to move and
      then hold still for a stretch of frames scaled by the motion speed
      (movement gate + publish-once, the shape two field failures forced; see
      design.md), with an at-rest fallback at the end of the window; each new
      trigger replaces any loop still running for that group, and every
      iteration bails silently if the group is disconnected or collapsed
- [x] 1.2 Keep the `sheetMeasured` / `sheetSkippedCollapsed` diagnostics
      coherent with the loop: log the settled publication (with the frame
      count), not the per-frame reads
- [x] 1.3 Run eslint and `node --check` clean

## 2. Verification (code)

- [x] 2.1 Run the installer to copy `src/` into the profile
- [x] 2.2 Run `scripts/verify.ps1` and confirm it passes

## 3. Verification (running browser — only the user confirms these)

- [x] 3.1 Fold preset, group collapsed, open `about:spacekeeper` (adoption
      into the collapsed System group), expand: all tabs visible after the
      motion settles — the reported bug is gone — user-confirmed 2026-08-17
      ("agora 100%"), on the publish-once build
- [x] 3.2 Fold preset, group expanded, open a new `about:` page (adoption mid
      insertion-animation): no tab left clipped once the strip settles —
      observed in the field log 2026-08-17 23:59 (`sheetMeasured 160 → 200`
      as the System group grew to 5 tabs while expanded)
- [x] 3.3 Fold preset, selected tab inside the group, collapse then expand
      repeatedly: never a clipped tail — user-confirmed 2026-08-17, exercised
      heavily during the live-log sessions
- [x] 3.4 Swift and cascade still behave as before (no clip, no regression) —
      not individually retested; waived by the owner's finalize-and-archive
      decision of 2026-08-17 (the presets share no published clip, and the
      review pass found no path touching them)
- [x] 3.5 `motionSpeed` at 25: the settle loop still publishes the right
      height despite every animation being 4x longer — not individually
      retested; waived by the same decision (the settle window and stability
      stretch scale by the same factor, by construction)
