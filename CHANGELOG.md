# Changelog

One entry per released version, newest first. The GitHub release notes are the
entry for that version — `scripts/verify.ps1` fails when the current version
has no entry here, so a release cannot ship silent. History older than what is
listed lives in the [GitHub releases](https://github.com/thiago-zampronio/zen-spacekeeper/releases).

## 0.48.2 — a rehearsal, on purpose

- Nothing changed here: this release exists so the update alert, its ✕ and
  the missed-release notes could be watched end to end with real releases. If
  you are reading this inside Spacekeeper before updating, the rehearsal is
  working.

## 0.48.1 — the right version wins the race

- Under the hood: when several releases pile up, the update now always points
  at the highest version — not the most recently published one. A small
  correctness fix caught while rehearsing the update flow.

## 0.48.0 — the update story is complete

- The whole update experience — the quiet corner alert, the notes you read
  before clicking, the one-click distance — is now finished, field-tested and
  written into the project's living specification. This release exists mostly
  so your new alert has something to announce: when it stretches across your
  sidebar with its little ✕, that is everything working exactly as designed.

## 0.47.0 — nothing you missed goes unmentioned

- Fell a few versions behind? Check for updates now shows what changed in
  every release you missed — newest first, each under its version — not just
  the latest one.
- The update alert now stretches across the sidebar and carries a ✕: not in
  the mood? Dismiss it and it stays quiet until you next open the browser.

## 0.46.0 — the pill never overstays

- If the little update alert ever outlives its reason — you already updated,
  or a release was withdrawn — it now clears itself the moment any check finds
  you current, instead of waiting for a restart.

## 0.45.0 — the update check signs its work

- For the curious with the diagnostic log on: every update check now records
  what woke it — opening the panel, a window starting, or the every-few-hours
  heartbeat. When something looks quiet, the log now tells the whole story.

## 0.44.0 — the pill no longer needs a restart

- Keep your browser open for days? Spacekeeper now notices new releases
  anyway: the quiet check repeats every few hours, so the update pill shows
  up in the corner on its own. (Opening a new tab was never the trigger —
  time is, and now it actually passes.)

## 0.43.0 — updates that speak your language

- The notes you are reading right now — before clicking Update — are written
  for you from here on: what changed and why you would care, in plain words.
  The "how to update" instructions are gone, because you are already in the
  exact place where updates happen.

## 0.42.0 — the pill becomes impossible to hide

- **Fixed: the update alert existed and nobody could see it.** It was anchored
  in the tab strip's periphery — an element Zen keeps in the DOM but never
  renders in its vertical layout. The pill is now a floating blue badge over
  the sidebar's lower corner, anchored to the window itself, readable over any
  wallpaper.

## 0.41.0 — Mail.Google, and the pill's field day

- **Changed: dotted labels capitalize both parts.** Host-style chips now read
  "Mail.Google" instead of "Mail.google" — every dot-separated part of a
  derived label starts with a capital letter. Renames stay untouched, keys
  never change case.

## 0.40.0 — the two judges agree on capital letters

- **Fixed: the panel self-test failed 4 label checks after 0.39.** The
  capitalization lived in the browser-side wrapper, so the shared derivation
  tests passed under node and failed in the browser — exactly the asymmetry
  the two-judges harness exists to catch. `capLabel` now lives in the core,
  where the labels are born: both judges see "Youtube", and a new case asserts
  the pattern itself.

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
