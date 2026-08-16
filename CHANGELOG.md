# Changelog

One entry per released version, newest first. The GitHub release notes are the
entry for that version — `scripts/verify.ps1` fails when the current version
has no entry here, so a release cannot ship silent. History older than what is
listed lives in the [GitHub releases](https://github.com/thiago-zampronio/zen-spacekeeper/releases).

## 0.39.0 — an update announces itself

- **New: update alert by the tabs.** Once per session Spacekeeper checks
  GitHub for a newer release — metadata only, never a download — and shows a
  quiet pill at the end of the tab strip when there is one. Clicking it opens
  the panel's update section with the check already performed: versions and
  the Update button on screen, one click from done. Turn it off with
  `zen.stg.updateCheck`.
- **New: the check tells what changed.** Check for updates now shows the
  release's notes under the from → to versions, so you decide with the
  changes in front of you.
- **New: chip labels are capitalized.** Every label the mod derives starts
  with a capital letter ("Youtube", "Mail.google") — one casing pattern on the
  strip. Your renames are never touched.
- **Process: releases can no longer ship silent** — the repo now enforces a
  changelog entry for every version.

## 0.38.0 — the 800 mystery solved, and reorder means open-on-top

- Fixed the panel showing values in the wrong fields after updates: Firefox's
  session restore repopulates a restored tab's form fields by position; the
  panel now opts out and re-reads the preferences after any restore.
- Reorder semantics corrected: with focus mode on, expanded groups stay above
  collapsed ones — a group sinks when it closes, rises when it opens; tab
  focus alone never reorders.

## 0.37.0 — Fold becomes one true sheet, and focus learns strategies

- Fold rebuilt as one rigid sheet behind a closing window: rows never deform
  or fade, opening and closing are the same motion mirrored (300ms).
- Focus mode became a choice: Off, Max groups at once, or Max time unused
  (idle groups collapse on their own clock) — plus the opt-in open-groups-on-
  top ordering.
