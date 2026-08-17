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
- [ ] 7.3 The manual describes the banner, the precedence, and the request on open
- [ ] 7.4 The manual's disclosure of when the product uses the network is updated

## 8. Verification on a real machine

Needs a running browser and a real release newer than the installed one.

- [ ] 8.1 With an update available, opening the panel shows the banner unasked
- [ ] 8.2 Release notes expand and read correctly, including a multi-release backlog
- [ ] 8.3 Update from the banner completes as before
- [ ] 8.4 With `zen.stg.updateCheck` off, opening the panel makes no request and the
      manual check is present
- [ ] 8.5 With a stale version and an update available, only the stale banner shows
- [ ] 8.6 After restarting, the update banner appears
- [ ] 8.7 The pill still lands on the filled-in banner
- [ ] 8.8 Both banners in the dark theme
