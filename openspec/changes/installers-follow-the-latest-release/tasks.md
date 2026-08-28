## 0. Settle the design's gating decision

Implementation must not start before this is answered.

- [x] 0.1 Choose between design D2's three options for keeping the version rule from
      drifting across JavaScript, POSIX sh and PowerShell, and record the choice and
      its reason in `design.md` — settled: the installers follow the
      `releases/latest` redirect and implement no comparison at all. The
      reimplement-and-prove option was withdrawn on evidence: it needs `pwsh` to
      check the third implementation, and commit `6f74ac1` retired `verify.ps1`
      exactly to stop the verifier from skipping whenever pwsh was absent
- [ ] 0.2 Confirm this change is not implemented before `add-update-menu-entry` has
      delivered the ref option it depends on

## 1. Resolving the latest release

- [ ] 1.1 In `install.sh`, learn the tag from the final URL of
      `https://github.com/$REPO/releases/latest` (`curl -sIL -o /dev/null -w
      '%{url_effective}'`, with a `wget` path alongside the existing one), and
      implement NO version comparison
- [ ] 1.2 The same in `install.ps1`, following redirects and reading the resolved
      URI — again with no comparison
- [ ] 1.3 Route the Windows self-elevation re-download (`install.ps1:576`) through
      the ref the parent already resolved, never a second independent lookup
- [ ] 1.4 Use the resolved tag as the default source; keep the explicit ref option
      as the override, still accepting a branch
- [ ] 1.5 Leave the clone path untouched — `FROM_CLONE` (`install.sh:558-559`) must
      still install local files and fetch nothing

## 2. Failing loudly

- [ ] 2.1 When the redirect cannot be followed, stop with a message naming the
      reason and pointing at the ref override — never fall back to a branch
- [ ] 2.2 Confirm by reading that no path reaches `raw.githubusercontent.com` with a
      branch after a failed resolution
- [ ] 2.3 Name the resolved release in the installer's output, on both installers,
      with matching wording — `verify.mjs` already checks wording parity between them

## 3. The pointer is ours, not GitHub's

This is what separates the chosen option from "take `/releases/latest` blindly",
which D2 rejects. Without this section they are the same thing.

- [ ] 3.1 Record in the release skill that a release on the current line publishes
      with `--latest`, and a hotfix on an older line publishes WITHOUT it, so the
      pointer keeps naming the higher version
- [ ] 3.2 Add a release-time audit that compares the tag GitHub marks latest
      against `latestRelease()` from `zstg-core.mjs`, and fails when they disagree
- [ ] 3.3 Keep that audit OUT of the per-commit `verify.mjs`: it needs the network,
      and the pre-commit hook must keep running offline on every platform — the
      property commit `6f74ac1` bought
- [ ] 3.4 Add an offline check to `verify.mjs` instead: neither installer contains
      version-comparison logic, so a second implementation cannot creep back in
- [ ] 3.5 Extend `test/release.test.mjs` with the audit's own cases — a hotfix on
      an older line published later must not be the head

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
