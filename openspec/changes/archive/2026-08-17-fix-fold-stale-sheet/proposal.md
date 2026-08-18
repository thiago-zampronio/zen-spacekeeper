# Fix the fold preset's stale sheet height

## Why

With the fold motion, an expanded group can come up showing only some of its
tabs — the rest sit hidden under the container's clip until the next tab
switch. Field-diagnosed on 2026-08-17 (debug log `sheetMeasured` events): the
fold preset clips the tab container at a published sheet height, and that
height is measured by `scrollHeight` at moments when row heights are still
animating — a newly adopted tab mid insertion-animation, or fold's own
selected-row choreography mid flight. A measurement taken 4–6ms after the
triggering event published 40/80/121px for a group whose settled sheet is
160px, and nothing corrected it afterward. The code's assumption that
staleness lasts "at most one paint" is false whenever a height is itself
animating.

## What Changes

- The sheet measurement becomes settle-aware: after any trigger that
  republishes group metrics, the sheet height is re-read each animation frame
  and published only once it holds still for two consecutive frames, within a
  bounded window. Mid-animation values never become the clip.
- The collapsed-adoption gap closes by the same mechanism: a tab adopted into
  a collapsed group leaves the sheet unmeasured (as today), and the settle
  loop on the next expand publishes the right height once rows finish moving.
- No preference, panel, or i18n change. The `sheetMeasured` /
  `sheetSkippedCollapsed` diagnostic events added during the investigation
  stay.

Out of scope:

- The fold preset's mechanics (window-over-sheet, timings, curves) are
  untouched — only how the sheet height is obtained.
- The other presets (swift, cascade), which do not clip at a published
  height.
- The insertion animation of new tabs, which belongs to the browser.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `group-presentation`: the "Collapse and expand are animated, by a chosen
  preset" requirement already promises measured heights; it gains the promise
  that a published measurement reflects the settled layout — never a
  mid-animation snapshot — and that no tab of an expanded group stays clipped
  out of view because of a stale measurement.

## Impact

- `src/zen-space-tab-groups.uc.mjs`: `publishSheetMetrics` grows the
  settle-loop; its callers are unchanged.
- No CSS change: `--zstg-sheet-measured` keeps its meaning, it just stops
  lying.
