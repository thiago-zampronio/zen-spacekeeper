## 0. Settle the design's gating decision

Implementation must not start before this is answered.

- [ ] 0.1 Choose between design D2's three options for keeping the version rule from
      drifting across JavaScript, POSIX sh and PowerShell, and record the choice and
      its reason in `design.md`
- [ ] 0.2 Confirm this change is not implemented before `add-update-menu-entry` has
      delivered the ref option it depends on

## 1. Resolving the latest release

- [ ] 1.1 Resolve the latest release in `install.sh`: fetch the release list, drop
      drafts and prereleases, pick the head by version
- [ ] 1.2 The same in `install.ps1`, producing an identical answer for identical
      input
- [ ] 1.3 Route the Windows self-elevation re-download (`install.ps1:576`) through
      the ref the parent already resolved, never a second independent lookup
- [ ] 1.4 Use the resolved release as the default source; keep the explicit ref
      option as the override, still accepting a branch
- [ ] 1.5 Leave the clone path untouched — `FROM_CLONE` (`install.sh:558-559`) must
      still install local files and fetch nothing

## 2. Failing loudly

- [ ] 2.1 When the release list cannot be retrieved, stop with a message naming the
      reason and pointing at the ref override — never fall back to a branch
- [ ] 2.2 Confirm by reading that no path reaches `raw.githubusercontent.com` with a
      branch after a failed resolution
- [ ] 2.3 Name the resolved release in the installer's output, on both installers,
      with matching wording — `verify.mjs` already checks wording parity between them

## 3. Proving the three agree

Shape depends on task 0.1; these assume design D2 option 1.

- [ ] 3.1 Build a table of version pairs that a naive comparison gets wrong —
      `0.9.0` vs `0.10.0`, `0.59.1` vs `0.6.0`, tags with and without the `v`,
      prerelease suffixes, a hotfix on an older line
- [ ] 3.2 Extend `scripts/verify.mjs` to run that table through all three
      implementations and fail on any disagreement
- [ ] 3.3 Add a test in `test/` covering the JavaScript side of the rule against the
      same table, naming the requirement it covers

## 4. Specification and documentation

- [ ] 4.1 Update `.claude/skills/release/SKILL.md`, which currently states that the
      piped installers serve `main`
- [ ] 4.2 Update `docs/MANUAL.md` wherever the install source is described
- [ ] 4.3 Document the ref override and the new failure mode in both installers'
      option help — `verify.mjs` requires every option to be documented
- [ ] 4.4 Run `node scripts/verify.mjs` and get EVERYTHING IN SYNC
- [ ] 4.5 Run the vitest suite and keep it green

## 5. Needs a running install — check only after the user confirms

These cannot be verified by reading code. Leave them unchecked until the user says
they tested it.

- [ ] 5.1 A piped one-liner install on macOS lands the latest release, and says which
- [ ] 5.2 The same on Linux (WSL) and on Windows
- [ ] 5.3 An install with an explicit ref still takes that ref, including a branch
- [ ] 5.4 A resolution failure stops with the intended message — simulate by pointing
      the installer at a repository with no releases
- [ ] 5.5 The Windows elevated child installs the same release as its parent
- [ ] 5.6 A clone install still fetches nothing over the network
