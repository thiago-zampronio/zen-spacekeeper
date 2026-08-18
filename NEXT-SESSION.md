# What is open, and what to run next

Scratch notes between sessions. Not documentation — delete it when the one change
below is archived and the node verifier question is settled.

## State

Windows is current as of 2026-08-18: the repository, the profile and the local
tags are all on 0.58.0, and **both** `scripts/verify.ps1` and
`scripts/verify.mjs` pass here. Releases through v0.58.0 are published on GitHub,
with their changelog entries as notes.

**One change is left open**, and it is blocked on machines, not on work:

| Change | Left | Needs |
| --- | --- | --- |
| `add-installer-restart` | 5.5, 5.6 | Windows (interactive), Linux |
| ~~`add-cross-platform-install`~~ | **archived** | — |
| ~~`add-stale-version-detection`~~ | **archived** | — |
| ~~`update-as-a-banner`~~ | **archived** | — |

Both remaining tasks are the same interactive installer-restart checks, on two
systems. Everything else in this file is background for them, or for the
node-verifier decision below.

`installation` is now a real capability in the living spec, with nine requirements
verified on all three systems. Archiving it immediately caught a conflict worth
knowing about: `add-installer-restart` modifies one of those requirements, and its
delta had renamed a scenario the main spec now carries — so archive refused it. A
MODIFIED block replaces the whole requirement, so every existing scenario name has
to survive in it. Fixed by keeping the original name on the branch that is still
the original behavior.

## Linux is done, on WSL

Ubuntu 26.04 under WSL turned out to be a better test bed than the Docker plan:
systemd runs as PID 1, `/bin/sh` is `dash`, and WSLg renders windows onto the
Windows desktop. Zen 1.21.14b installs from its own tarball into
`~/.local/share/zen`, which needs no root, and the only missing library was
`libasound2t64`.

Everything in section 7 passed except the flatpak case, and the run found **nine
real defects** — five of them impossible to see anywhere but Linux. They are
written up in that change's `tasks.md`.

Two limits worth knowing before repeating it: WSLg renders Zen in software
(`[WARN:COPY MODE]` in the title) so the window paints blank, which makes it
useless for judging appearance; and the taskbar shows a generic Linux icon because
a tarball install registers no `.desktop` entry. Neither is a product problem.

To bring the WSL side back up:

```sh
wsl -d Ubuntu
curl -fsSL https://raw.githubusercontent.com/thiago-zampronio/zen-spacekeeper/main/install.sh | sh -s -- --guard
~/.local/share/zen/zen --profile ~/.config/zen/*.default about:spacekeeper &
```

## On the Mac: the banner walkthrough is spent

`add-stale-version-detection` and `update-as-a-banner` were both archived on
2026-08-18, so the long banner script that used to live here (8.2–8.8, and the
staged-stale releases v0.55.0 and v0.57.0 that fed it) has been run and is gone.
Each archived `tasks.md` records which checks were confirmed in the field and
which the owner waived.

What the Mac is still useful for is the interactive restart, if a browser is
easier to sacrifice there than on Windows. Tasks 5.1–5.4 are already confirmed
on macOS.

### The three interactive checks still open (5.5, Windows)

Still open for the same reason as before: each one closes the browser. Accept
the restart prompt, decline it, and leave an unsaved-changes dialog open so the
bounded wait expires. The non-interactive case is done, and was exercised again
on 2026-08-18 — `.\install.ps1` with no flag and no terminal consent skipped
the restart cleanly. Evidence, not impression: Zen had been up since 22:42:30 the
previous day and was still the same process afterwards, and the startup cache
kept its 22:42:34 timestamp from that startup. Nothing was closed, and nothing
was deleted.

## Archived on the Mac (2026-08-17): the slide and the fold fix

Both shipped, field-tested, synced into `group-presentation`, and archived
(`2026-08-17-animate-focus-reorder`, `2026-08-17-fix-fold-stale-sheet`).
`verify.ps1` passes end to end on the Mac — pwsh installed via brew this
session. Not yet released; the working tree carries the commits.

Worth knowing later:

- The `zstg-` debug log gained events: `focusSlide`, `focusSlideGaveUp`,
  `sheetMeasured`, `sheetSkippedCollapsed`, `collapseEvent`. Both field bugs
  of this session were diagnosed from them in minutes.
- Design history that matters: `<tab-group>` has NO layout box (rects read
  0,0,0 — measure the label, animate the children), and sheet measurements
  taken mid-animation lie (hence the movement-gated, publish-once settle
  loop). Both are written into the archived changes' design.md files.
- A few browser checks were closed as owner-waived rather than individually
  retested — the notes in each archived tasks.md say exactly which.

## Done on the Windows machine (2026-08-18)

Both verifiers were run on this machine, on the same tree, at 0.58.0:

```powershell
node scripts/verify.mjs                    # EVERYTHING IN SYNC, exit 0
pwsh -NoProfile -File scripts/verify.ps1   # EVERYTHING IN SYNC, exit 0
```

They agree **check for check**: 54 identical checks, same order, same results,
same exit code. The port's only extra output is its own five-check parity
section, which is there by design. The Windows spawn path — the one piece never
exercised — works: `openspec` and `eslint` both ran through the `.cmd` shims.

Getting there surfaced two things worth keeping:

- **A misplaced pair of local tags.** The new tag check failed in BOTH
  verifiers: `v0.49.0` and `v0.50.0` pointed at the 0.51.0 commit. The cause
  was local only — GitHub's tags were right all along, and `git fetch` will not
  move a local tag that already exists. `git fetch --tags --force origin` fixed
  it, and nothing published was touched. This is exactly the cross-machine drift
  the check was added to catch, and it caught it on its first real outing.
- **The profile was five releases behind** (0.53.0 against 0.58.0), because the
  pull brought them all at once. `.\install.ps1` was re-run; the Installation
  section is green again.

## The node verifier exists, and is NOT yet the authority

`scripts/verify.mjs` is a check-for-check port of `verify.ps1` (adversarial
review + A/B mutation trials, 2026-08-17/18). Both pass this tree; seven
deliberate breakages — accent, unaccented pt token, header/const version
mismatch, missing CHANGELOG entry, i18n key missing in one language, broken
requirement anchor, deleted `src/guard/` — fail BOTH, and on the missing
directory the port is the better of the two (it names three failing checks
where verify.ps1 dies inside `Get-Content`). The pre-commit hook prefers
verify.ps1 and falls back to verify.mjs, so a machine without pwsh finally
runs a full verify.

**One thing now stands between it and retiring verify.ps1 — the review.** The
Windows run is done; both items stay listed so the history of what was demanded
remains readable.

1. ~~**It has never run on Windows.**~~ **Settled 2026-08-18** — it has now,
   and it agrees with `verify.ps1` check for check (see the Windows section
   above). The `shell: true` + cmd-quoting path for the `.cmd` shims
   (per CVE-2024-27980) is exercised and correct.
2. **The adversarial review never returned a final approval.** Two rounds
   rejected (blockers: missing directories waved through; Windows `.cmd`
   spawns) and both were fixed; the third round died in a retry loop after the
   reviewers' context filled up — reading an 800-line script plus a 58KB port
   plus both scripts' output is too much for one agent. If it is re-run, split
   the review by section instead of asking for the whole file at once.

Until the review is settled, verify.ps1 is the release gate. When it is, delete
verify.ps1 rather than keeping both: the port carries a parity section that
polices their shared literal lists, which is a live drift guard while they
coexist and dead weight the moment one is gone.

## Settled: the two restarts stay different

Raised and decided. After a successful update the panel's dialog calls
`resetAndRestart`, which dissolves every group; the stale banner calls
`restartToApply`, which touches nothing. That asymmetry is intentional — a version
change can alter the group marking and leave the old groups unrecognized, so an
update rebuilds them, while applying code already sitting on disk has no reason to.

Written into the source above `restartToApply` so the next person to notice it
finds the answer instead of the question. Nothing to do here.
