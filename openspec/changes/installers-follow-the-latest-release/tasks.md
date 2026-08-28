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

- [x] 1.1 In `install.sh`, learn the tag from the final URL of
      `https://github.com/$REPO/releases/latest` (`curl -sIL -o /dev/null -w
      '%{url_effective}'`, with a `wget` path alongside the existing one), and
      implement NO version comparison — `resolve_latest()` follows the redirect with curl, wget alongside it; proven live, resolves v0.60.1
- [x] 1.2 The same in `install.ps1`, following redirects and reading the resolved
      URI — again with no comparison — `Resolve-LatestRef` via HttpWebRequest (the final-URI property moved between PS 5.1 and 7); the resolution itself proven live on pwsh 7.6.5
- [x] 1.3 Route the Windows self-elevation re-download (`install.ps1:576`) through
      the ref the parent already resolved, never a second independent lookup — the elevated child receives the RESOLVED ref, so it cannot fetch from a different source than its parent
- [x] 1.4 Use the resolved tag as the default source; keep the explicit ref option
      as the override, still accepting a branch — precedence proven: --ref wins, then --branch, then the release; each verified by whether the resolution line appears
- [x] 1.5 Leave the clone path untouched — `FROM_CLONE` (`install.sh:558-559`) must
      still install local files and fetch nothing — proven: a clone run never prints the resolution line and reaches the network for nothing

## 2. Failing loudly

- [x] 2.1 When the redirect cannot be followed, stop with a message naming the
      reason and pointing at the ref override — never fall back to a branch — proven against a repository with no releases: the message names the reason and both overrides, and the real exit code is 1
- [x] 2.2 Confirm by reading that no path reaches `raw.githubusercontent.com` with a
      branch after a failed resolution — confirmed by reading; the resolution is a hard stop with no branch path after it
- [x] 2.3 Name the resolved release in the installer's output, on both installers,
      with matching wording — `verify.mjs` already checks wording parity between them — `Installing release v0.60.1.` on both, same wording

## 3. The pointer is ours, not GitHub's

This is what separates the chosen option from "take `/releases/latest` blindly",
which D2 rejects. Without this section they are the same thing.

- [x] 3.1 Record in the release skill that a release on the current line publishes
      with `--latest`, and a hotfix on an older line publishes WITHOUT it, so the
      pointer keeps naming the higher version — the release skill now states that a hotfix on an older line publishes WITHOUT --latest, and why
- [x] 3.2 Add a release-time audit that compares the tag GitHub marks latest
      against `latestRelease()` from `zstg-core.mjs`, and fails when they disagree — `scripts/check-latest-pointer.mjs`, using latestRelease() from zstg-core.mjs; passes against the real state and names the `gh release edit` commands that fix a disagreement
- [x] 3.3 Keep that audit OUT of the per-commit `verify.mjs`: it needs the network,
      and the pre-commit hook must keep running offline on every platform — the
      property commit `6f74ac1` bought — it is a separate script the release skill calls, never part of verify.mjs
- [x] 3.4 Add an offline check to `verify.mjs` instead: neither installer contains
      version-comparison logic, so a second implementation cannot creep back in — verify.mjs now fails if either installer grows a version comparison; PROVEN to fail by injecting `version_gt` and watching it name the offender
- [x] 3.5 Extend `test/release.test.mjs` with the audit's own cases — a hotfix on
      an older line published later must not be the head — three cases in test/release.test.mjs, including the hotfix-published-later mistake the audit exists to catch

## 4. Specification and documentation

- [x] 4.1 Update `.claude/skills/release/SKILL.md`, which currently states that the
      piped installers serve `main` — done
- [x] 4.2 Update `docs/MANUAL.md` wherever the install source is described — the MANUAL now leads with what a standalone run installs, and that a branch is the exception
- [x] 4.3 Document the ref override and the new failure mode in both installers'
      option help — `verify.mjs` requires every option to be documented — both installers' option text updated; the ps1 param comment carries it, which is what verify reads
- [x] 4.4 Run `node scripts/verify.mjs` and get EVERYTHING IN SYNC
- [x] 4.5 Run the vitest suite and keep it green — 82 tests

## 5. Exercised on macOS

- [x] 5.1 A piped one-liner install on macOS lands the latest release, and says
      which — run from outside the clone: `Installing release v0.60.1.`, then the
      files, with the loader correctly skipped as already up to date
- [x] 5.3 An install with an explicit ref still takes that ref, including a
      branch — neither `--ref v0.60.0` nor `--branch main` printed the resolution
      line, so neither reached the redirect
- [x] 5.4 A resolution failure stops with the intended message — run against a
      repository with no releases: it named the URL it asked, offered both
      overrides, installed nothing, and exited 1
- [x] 5.6 A clone install still fetches nothing over the network — no resolution
      line, and `--check` does not reach it either, since both exit above the
      point where the ref is decided

## 6. Owed on other machines — does NOT block this change

- [ ] 6.1 A piped one-liner install on Windows lands the latest release
- [ ] 6.2 The same on Linux (WSL)
- [ ] 6.3 The Windows elevated child installs the same release as its parent
- [ ] 6.4 `Resolve-LatestRef` inside a real `install.ps1` run on Windows — the
      redirect resolution itself is proven on pwsh 7.6.5 on macOS, but the
      installer around it has never executed on Windows
