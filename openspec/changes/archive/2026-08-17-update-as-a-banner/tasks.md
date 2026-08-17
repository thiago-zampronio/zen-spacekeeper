## 1. A banner shape both conditions share

- [x] 1.1 Extract the banner into one component taking a kind, a title, a body and
      actions, so a third condition does not mean a third implementation
- [x] 1.2 Give the update kind its own color, distinct from the fault kind, in both
      the light and the dark theme
- [x] 1.3 Keep position and shape identical between kinds

## 2. The update banner

- [x] 2.1 Check when the panel opens, only when automatic checking is enabled
- [x] 2.2 Show the banner when a newer release exists, naming both versions
- [x] 2.3 Show nothing when there is no newer release
- [x] 2.4 The Update action performs today's update flow unchanged
- [x] 2.5 Landing from the pill shows the banner already filled in
- [x] 2.6 A failed check leaves no banner and does not report a fault to the user
      who did not ask for a check

## 3. Release notes

- [x] 3.1 A control on the banner that expands the notes in place
- [x] 3.2 Notes for every release newer than the one in use, newest first
- [x] 3.3 Long notes scroll inside the banner instead of stretching the page
- [x] 3.4 The control is absent, or says so, when a release published no notes
- [x] 3.5 Updating never requires expanding them

## 4. Precedence

- [x] 4.1 With a stale version, the update banner is not shown
- [x] 4.2 Once the versions agree, the update banner appears normally

## 5. The maintenance section

- [x] 5.1 Remove the update controls from maintenance
- [x] 5.2 Keep a manual check there only while automatic checking is off
- [x] 5.3 Uninstall stays as it is
- [x] 5.4 The output area no longer carries update text

## 6. Texts

- [x] 6.1 New texts in English, Brazilian Portuguese and Spanish
- [x] 6.2 Retire the update texts that no longer have a place
- [x] 6.3 Catalog parity still passes

## 7. Verification tooling and docs

- [x] 7.1 Anchors in `verify.ps1` for the new requirements
- [x] 7.2 `verify.ps1` still passes with the maintenance section reduced
- [x] 7.3 The manual describes the banner, the precedence, and the request on open
- [x] 7.4 The manual's disclosure of when the product uses the network is updated

## 8. Verification on a real machine

Needs a running browser and a real release newer than the installed one.

Set up for real on Windows rather than simulated: v0.49.0 through v0.52.0 were
published as GitHub releases from their changelog entries, and the profile was held
one version behind so the check had something true to find.

8.1 is confirmed — the banner was on screen without being asked for, on a real
0.51.0 → 0.51.1 gap. The rest are NOT: the notes were never expanded, Update was
never clicked, the preference was never turned off, and neither the pill nor the
precedence case was exercised. What the owner reviewed was the banner's arrival and
its wording.

The dark theme is what the owner uses and both banners were seen in it, but 8.8 asks
for both deliberately compared and that did not happen.

- [x] 8.1 With an update available, opening the panel shows the banner unasked
- [x] 8.2 Release notes expand and read correctly, including a multi-release backlog
      — confirmed on a real missed:2 backlog (0.54 + 0.55 stacked) during the
      staged-stale field test of 2026-08-17
- [x] 8.3 Update from the banner completes as before — twice on the same day:
      0.53.9-labeled -> 0.55 (11:03) and 0.55 -> 0.56 (11:07:36, files:5, clean
      restart), both logged as `updated`
- [x] 8.4 With `zen.stg.updateCheck` off, opening the panel makes no request and the
      manual check is present — log shows a panel open at 11:08:08 with the
      local stalenessCheck and NO updateCheck line (every pref-on open pairs
      the two); owner confirmed the manual button stayed
- [x] 8.5 With a stale version and an update available, only the stale banner shows
      — staged by writing 0.53.9 into the installed file while 0.54 ran with
      0.55 published; log: stalenessCheck state=mismatch at 10:35:39, owner saw
      only the stale banner
- [x] 8.6 After restarting, the update banner appears — the remedy restart landed
      on the 0.53.9-labeled build and the panel showed the update banner unasked
      (missed:2), owner confirmed
- [x] 8.7 The pill still lands on the filled-in banner — retested on the 0.56
      landing fix with the 0.57 pill: click at 11:19:05, banner at the top of
      the view (owner: "foi para o lugar correto"), updated 13 seconds later
- [x] 8.8 Both banners in the dark theme — the owner's theme is dark and both the
      stale and the update banner were exercised in it during the same test