# An update announces itself, and a check tells what changed

## Why

Updates today are invisible until the user thinks of opening about:spacekeeper
and clicking Check for updates — which nobody does on a schedule. And when the
check finds something, it says only `0.38.0 → 0.39.0`: two numbers, no reason
to care. The owner asked for the last piece: a quiet alert where the tabs
live, a check that shows what the release actually brought, and a repo-side
guarantee that every release publishes its changes.

## What Changes

**A quiet update pill at the bottom of the tab strip.** Once per session,
shortly after startup, the mod asks GitHub for the latest release — metadata
only, nothing downloaded. If it is newer, a small pill appears at the end of
the tab strip: "Update x.y.z available". Clicking it opens
`about:spacekeeper#update`, where the check has already run: the versions
message and the blue Update button are on screen, one click from done.

**This widens the no-network exception, honestly.** The self-update spec said
"nothing happens without a click"; it now says "nothing is INSTALLED without a
click": the automatic check reads one release-metadata endpoint, runs at most
once per session, is disclosed in the panel and the manual, and turns off with
`zen.stg.updateCheck` (default on). Downloads still require the user's click,
exactly as before.

**Check for updates shows the release notes.** The check result already
carries the release body; the panel now prints it under the from → to line,
so the user decides with the changelog in front of them.

**Every release must publish its changes — enforced.** A root `CHANGELOG.md`
gains one entry per version; `verify.ps1` fails when the current `VERSION` has
no entry, so a version bump cannot ship silent. The release notes on GitHub
are that entry — CLAUDE.md's releasing section makes it the rule.

## Impact

- `openspec/specs/self-update/spec.md` — the no-click requirement is modified
  (check may be automatic, metadata-only, disclosed, disableable); a new
  requirement covers the alert and the notes.
- `src/zen-space-tab-groups.uc.mjs` — background check, the pill, notes in the
  check result, pref `zen.stg.updateCheck`.
- `src/zen-space-tab-groups.uc.css` — the pill's appearance.
- `src/resources/zstg-panel.html` — `#update` deep link (auto-check + scroll),
  notes rendering.
- `src/resources/zstg-i18n.mjs` — pill and notes strings, disclosure rewrite.
- `CHANGELOG.md` (new), `scripts/verify.ps1` (entry-per-version check),
  `CLAUDE.md` (releasing rule), `docs/MANUAL.md` (pref row, network wording).
