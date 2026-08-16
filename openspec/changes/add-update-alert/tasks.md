# Tasks

## 1. Script

- [x] 1.1 `zen.stg.updateCheck` (bool, default true) in DEFAULTS/cfg;
      `checkForUpdate` returns the `notes` of EVERY missed release, newest
      first under its version (owner question: "3 versions behind shows each
      release's changes or only the last?" — now each); `isNewerVersion`
      semver compare in the script
- [x] 1.2 `backgroundUpdateCheck` 45s after init and then every 4 hours per
      window (field finding: windows outlive releases — once per session never
      fired again in a long-lived window), gated on the pref, failures logged
      and swallowed; pill shown only when newer, deduped on repeats
- [x] 1.3 The pill: a floating toolbarbutton fixed over the sidebar's lower
      corner, anchored to the window document — the first cut used the tab
      strip's periphery, an element Zen keeps in the DOM but never renders in
      vertical layout (field finding: log said updatePill, screenshot said
      nothing); solid blue so it reads over any wallpaper; label with the
      version, click opens `about:spacekeeper#update`, removed on unload;
      spans the tab sidebar's measured width; a \u2715 dismiss hides it and
      silences the session's remaining checks (owner ask), logged as
      updatePillDismissed

## 2. Panel, styles and strings

- [x] 2.1 `runUpdateCheck()` extracted; `#update` hash scrolls to maintenance
      and runs it; notes rendered under the from → to message, markdown
      lightly flattened; maintenance output gains max-height + scroll
- [x] 2.2 Pill styling in the mod stylesheet, accent-tinted, quiet
- [x] 2.3 Strings ×3 (pill label/tooltip, "What changed", disclosure rewritten
      for the two-shape network story); MANUAL pref row and network wording;
      README "only action that contacts the network" line updated

## 3. Enforcement

- [x] 3.1 `CHANGELOG.md` seeded (current release + recent history pointer);
      verify.ps1 fails when VERSION lacks a changelog entry; CLAUDE.md
      releasing section: notes = the changelog entry
- [x] 3.2 verify anchors for the new requirements; EVERYTHING IN SYNC

## 4. In a running Zen (user confirms)

- [ ] 4.1 Pill appears when a newer release exists and not when current; click
      lands on the update section with versions + Update visible; notes show
      under the message; `zen.stg.updateCheck=false` silences everything
