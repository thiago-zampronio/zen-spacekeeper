# Changelog

One entry per released version, newest first. The GitHub release notes are the
entry for that version — `scripts/verify.ps1` fails when the current version
has no entry here, so a release cannot ship silent. History older than what is
listed lives in the [GitHub releases](https://github.com/thiago-zampronio/zen-spacekeeper/releases).

## 0.56.0 — the alert lands you on the banner, and logs clean up after themselves

- **Fixed:** clicking the update alert opened the panel scrolled below the
  banner it was pointing at. It now lands with the banner at the top of the
  view.
- **Improved:** the diagnostic log keeps one week of history and never passes
  1 MB; the guard's own log rotates too. Leaving diagnostics on can no longer
  slowly fill a disk.

## 0.55.0 — nothing new, on purpose

- Nothing user-visible changed in this one: it exists so the update flow
  shipped in the previous release could be proven on a real version gap. If
  the alert brought you here, it is doing its job.

## 0.54.0 — focus mode respects each Space again

- **Fixed:** entering a Space could collapse the groups you were just using
  there — focus mode counted recent groups across all Spaces. Each Space now
  keeps its own list, and closed groups no longer use up "Groups kept open"
  slots.
- **Fixed:** on laptops that sleep, the update alert could stay silent for
  days. The check now also runs when your computer wakes.
- **Fixed:** "Not now" on the update alert now silences every window until the
  next restart, and turning the update check off removes a visible alert.
- **Improved:** sturdier housekeeping — a tab whose grouping once failed is
  retried, an interrupted update rolls itself back, and a color you pick while
  a group is still loading is kept. The update banner and the manual now tell
  the exact truth about restarts, checks and the guard's timing on Windows.

## 0.53.0 — installing is now a specified, three-platform capability

- Cross-platform installation is finished and archived. Windows, macOS and Linux
  are each verified on a real machine, and the specification now carries nine
  requirements about installing that used to live only in a script.
- A flatpak Zen is handled honestly: it refuses before writing anything, and says
  why — the application files live in a read-only image, so the loader cannot go
  in. Nothing is left half-installed.
- Nothing changed in how tabs are grouped. This release is the installer and the
  specification catching up with each other.

## 0.52.3 — the guard stops panicking mid-update

- A Zen update replaces the whole application directory, so for a few seconds it
  does not exist — and that is precisely when the guard wakes up. It used to
  decide on the first look and tell you, four times over, that Zen was gone and
  you should re-run the installer. Wrong advice, at the worst possible moment.
- It now waits a missing Zen out before believing it. An update takes seconds; a
  browser you actually removed stays gone, and that message still appears — once,
  and only when it is true.
- Tested against a real update on Linux: the loader came back in three seconds,
  and the four spurious warnings became none.

## 0.52.2 — the guard, verified on Linux, and two more silent successes

- The guard now works end to end on Linux: deleting the loader has it restored
  **within a second** by a systemd path unit, with the restore recorded even where
  no desktop notifier exists. Uninstalling leaves no unit, no directory and no
  marker, and keeps the loader.
- **Asking for the guard no longer aborts the install.** On a system without
  systemd it used to stop everything — over an optional extra, when the mod itself
  installs and works perfectly without a watcher. Now it says the watcher is
  unavailable, tells you to re-run the installer after a Zen update, and finishes.
- **And it no longer claims a watcher it does not have.** Every registration
  command hid its errors, so the success line was printed either way; the check
  that decides now asks systemd whether the unit is enabled, not whether a file
  got written into your home directory.

## 0.52.1 — three Linux bugs, found by actually running it on Linux

- **The installer looked for your profile in the wrong place.** Zen keeps profiles
  in `~/.config/zen` on Linux; this looked only in `~/.zen`, which a real Zen
  install never creates. It now searches both, and the flatpak equivalents, and
  picks whichever actually holds `profiles.ini`.
- **The installer could hang forever.** It asked "is there a terminal?" by opening
  `/dev/tty`, which succeeds in automation where nobody is going to type — so the
  restart prompt waited for an answer that never came. It now asks whether stdout
  is a terminal, which still lets `curl … | sh` prompt a real person.
- **The report printed lines under the wrong heading.** Warnings went to stderr
  while the headings went to stdout, so anything capturing both interleaved them —
  a missing loader file was shown under the mod's section.
- It also announced "needs administrator rights" before checking whether it did.
  A per-user install under your home never needs them, and it asked for nothing
  after saying so.

## 0.52.0 — the section that lost its updates got its shape back

- "Updates and removal" kept its name and its network paragraph after the updates
  moved to the banner, leaving a heading about something that no longer happened,
  a promise floating with nothing to attach to, and an empty black box under both.
  It reads as a layout bug because it was one.
- Updates now have a section of their own, with the preference that governs them —
  which until now existed only in about:config, though the panel is supposed to be
  a view over the preferences. The network promise became its explanation, sitting
  on the setting it describes.
- Turning it off reveals the manual **Check for updates** button right there, and
  its answer appears in that section instead of in the removal one.
- Removal is now just that: a heading, a sentence, and the button. Both output
  boxes stay hidden until they have something to say.

## 0.51.1 — the manual catches up with the banner

- Documentation only; nothing in the product changed.
- The manual now has an Updating section: what the blue banner is, that the notes
  expand in place, that nothing downloads until you click, and that the check on
  panel open is the same disclosed request the heartbeat already makes — off with
  the same preference.
- It also explains the two banners sharing one position, why the orange one wins
  when both apply, and that restarting alone does not apply an update.

## 0.51.0 — the update announces itself, like a problem would

- The panel had two ways of saying "what you are running is not what you should be
  running", and they looked nothing alike: a banner at the top for a fault, and a
  Check button at the bottom reporting into a monospaced box for an update. The
  update now gets the banner too, in blue — a fault is orange, an opportunity is
  not.
- It checks when the panel opens, so an update finds you instead of the other way
  around. Same endpoint and same preference as the check that already ran on its
  own; with update checking off, this page makes no request at all.
- Release notes stopped being a text dump inside a diagnostic box. They sit behind
  a **Release notes** button on the banner, expand where they are, and scroll when
  you are several releases behind. Updating never requires opening them.
- A stale version is settled first: when Zen is running older code than what is
  installed, that banner shows and the update one waits. Both end in the same
  restart, and two stacked warnings saying "restart" is worse than one.
- Maintenance is down to uninstalling. The manual Check button stays only when
  automatic checking is off — where it is the only way to look.

## 0.50.0 — the stale-version banner does the restart for you

- The banner used to end with instructions: close Zen, go to about:support, clear
  the startup cache, open Zen again. All correct, and all of it work the product
  already knew how to do. Now it offers a button that does exactly that.
- It restarts with the cache cleared and touches nothing else. The clean-handover
  restart that dissolves your groups already exists for uninstalling; reusing it
  here would trade a stale version for lost organization. Your tabs come back the
  way they always do, and your groups and settings are untouched.
- The written steps stay as the fallback, for a browser that does not expose the
  restart utility — where the button cannot work, the instructions still can.

## 0.49.0 — it tells you when Zen is running an older copy

- Installing while Zen is open replaces the files without touching what the
  browser has in memory, so Zen keeps running the previous version. Every check
  said everything was installed, and every check was right — they compare files
  to files, and nobody was asking what the browser had actually loaded.
- Now three things notice. The panel shows a banner with both versions and the
  fix. The mod compares them at startup and writes the result to the debug log,
  with nobody present. `--check` catches it before the browser is even opened.
- The fix always names both halves: close Zen, clear the startup cache in
  about:support, open it again. Restarting alone puts you right back.
- The panel also stops using one message for two different problems. "Not
  connected to the browser window" now means exactly that, and "Spacekeeper
  isn't loaded in this window" says the other thing — which is what was actually
  happening the day this was found.

## 0.48.3 — the grand finale of the rehearsal

- The last of three rehearsal releases. If your panel is showing this note
  stacked on top of others you never installed, the "nothing you missed goes
  unmentioned" promise is holding. Update whenever you like — the pill can
  wait, and its ✕ means it will.

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
