# Design

## Context

The update flow is panel-only and user-initiated; the self-update spec forbade
any scheduled network. The owner wants an alert where the tabs live, notes in
the check, and an enforced changelog. The privacy posture must widen honestly,
not silently.

## Goals / Non-Goals

**Goals:** a quiet, accurate alert; one-click distance from alert to update;
notes in front of the decision; no version ships without written changes.

**Non-Goals:** auto-installing anything; polling (once per session is the
ceiling); an in-panel changelog browser (the notes shown are the latest
release's, fetched with the check).

## Decisions

**The check result gains `notes`.** `checkForUpdate` already receives the
release JSON; it returns `body` as `notes`. The panel prints it under the
from → to line, markdown lightly flattened (strip heading markers and bold),
in the maintenance output area, which gains a max-height and scrolls.

**The background check is one deferred shot per window.** 45s after init —
far from the startup path — `backgroundUpdateCheck()` runs iff
`zen.stg.updateCheck` (default true): calls `checkForUpdate()`, compares with
the same semver logic the panel uses (`isNewerVersion`, now in the script),
and on a newer release shows the pill. Failures are logged and swallowed — an
offline start must not surface an error for a feature nobody asked to run.

**The pill is a toolbarbutton in the strip's periphery.** Anchored at
`#tabbrowser-arrowscrollbox-periphery` (where the new-tab button lives) so it
sits at the end of the tab strip; if Zen renames that element the pill simply
does not appear (logged), and the panel path is untouched — the alert is an
enhancement, never a dependency. Styled in the mod's stylesheet, accent-tinted
and small. Click = `openPanel()` with the `#update` hash; removed on unload
and after an update is applied.

**The panel honors `#update`.** After the maintenance section is built, if
`location.hash === "#update"` the section scrolls into view and the check
handler runs — the same function the button calls, extracted as
`runUpdateCheck()`. The user lands with the versions and the Update button
already on screen.

**The changelog is the enforcement, the release notes are the copy.**
`CHANGELOG.md` at the root, one `## x.y.z` entry per version, newest first;
`verify.ps1` fails when `VERSION` has no entry. CLAUDE.md's releasing section
gains the rule: the GitHub release notes are the changelog entry, written
before the bump is pushed.

## Risks / Trade-offs

- [The periphery element disappears in a Zen update] → pill skipped, logged;
  the panel and the pref remain the working path.
- [The automatic check reads as telemetry] → it is disclosed in the panel's
  update section and the manual, off with one pref, metadata-only, GitHub
  only — and the spec now says exactly that.
- [Release body too long for the output area] → max-height with scroll, and
  the notes are the release's own summary, not the full commit log.

## Open Questions

- None blocking.
