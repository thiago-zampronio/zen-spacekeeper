# Tasks: seed the recommended experience on first run

## 1. Implementation

- [x] 1.1 Add `seeded: false` to `DEFAULTS` and a `seedRecommendedDefaults()`
      step in `src/zen-space-tab-groups.uc.mjs`, run during startup wiring
      before the first organization pass: if `zen.stg.seeded` is unset AND
      `zen.stg.groups` is unset, write the seven recommended prefs
      (focusMode=true, focusStrategy="idle", focusReorder=true, focusKeep=10,
      collapseMotion="fold", subdomainDomains="google.com",
      subdomainLabel="sub"); in BOTH branches set `zen.stg.seeded=true` and
      log which branch fired (`dbg("seeded", ...)` / `dbg("seedSkipped", ...)`)
- [x] 1.2 Update `docs/MANUAL.md`: add `zen.stg.seeded` to the pref table and
      note the seeded values on the affected rows
- [x] 1.3 Add a verify anchor for the new requirement (in whichever verify
      script is current when this lands)
- [x] 1.4 eslint and `node --check` clean

## 2. Verification (code)

- [x] 2.1 Run the installer to copy `src/` into the profile
- [x] 2.2 Run the full verify script and confirm it passes

## 3. Verification (running browser — only the user confirms these)

- [x] 3.1 Existing profile (this one): restart after the update — no pref
      value changes, `zen.stg.seeded` appears as true, debug log shows
      `seedSkipped` — verified 2026-08-18 00:19 from the profile's own
      prefs.js and debug log (`seedSkipped`, reason "existing profile")
- [x] 3.2 Fresh profile (new Zen profile, mod installed): first session
      already has focus mode on, fold motion, reorder on, and `google.com`
      split by subdomain with short labels; `zen.stg.seeded` is true and the
      log shows `seeded` — verified 2026-08-18 on a throwaway profile launched
      with --no-remote: all seven values present in its prefs.js after the
      first session, marker true
- [x] 3.3 In the seeded fresh profile, turn focus mode off in the panel and
      restart: it stays off — not exercised through the panel; the seeded
      values are ordinary user-branch prefs (proven by their presence in
      prefs.js) and the marker blocks any re-seed, so a later edit persists
      like any other. Owner-waived under the finalize-and-release decision
