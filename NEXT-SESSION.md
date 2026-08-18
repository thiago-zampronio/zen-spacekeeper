# What is open, and what to run next

Scratch notes between sessions. Not documentation. As of 2026-08-18 the only
thing still open is the decision under "The one decision left" below; when that
is taken, delete this file.

## State: nothing pending

Windows is current as of 2026-08-18. The repository, the profile and the local
tags are all on 0.58.0; **both** `scripts/verify.ps1` and `scripts/verify.mjs`
pass here, and `openspec validate` passes on all 15 items. Releases through
v0.58.0 are published on GitHub with their changelog entries as notes.

**No changes are active.** `add-installer-restart` was the last one, archived
2026-08-18 as `2026-08-18-add-installer-restart` after its delta was synced into
the `installation` capability, which went from 9 requirements to 12: the restart
offer, the graceful bounded close, and the detected-profile cache clearing.

Its two remaining verification tasks were closed on the owner's confirmation:

- **5.5 (Windows)** — the non-interactive case was observed directly here, twice.
  The other three (accept the prompt, decline it, and the bounded wait against an
  unsaved-changes dialog) are owner-confirmed as run previously, and were not
  re-observed in the closing session because each one closes the browser.
- **5.6 (Linux)** — owner-confirmed as done on another machine.

Both are marked as such in the archived `tasks.md`, following the precedent set
when earlier browser checks were closed as owner-waived. Anyone auditing later
can tell which checks were watched and which were reported.

The archive also cleared the conflict that once blocked it: a MODIFIED block
replaces a requirement wholesale, so the delta had to keep the original scenario
name `After a successful install` intact. It did, and the sync applied cleanly.

The banner walkthrough that used to fill this file is gone with it:
`add-stale-version-detection` and `update-as-a-banner` were archived on
2026-08-18, along with the staged-stale releases v0.55.0 and v0.57.0 that fed
them. Each archived `tasks.md` records which of their checks were confirmed in
the field and which the owner waived.

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

## The node verifier: both blockers settled, one decision left

`scripts/verify.mjs` is a check-for-check port of `verify.ps1` (adversarial
review + A/B mutation trials, 2026-08-17/18). Both pass this tree; seven
deliberate breakages — accent, unaccented pt token, header/const version
mismatch, missing CHANGELOG entry, i18n key missing in one language, broken
requirement anchor, deleted `src/guard/` — fail BOTH, and on the missing
directory the port is the better of the two (it names three failing checks where
verify.ps1 dies inside `Get-Content`). The pre-commit hook prefers verify.ps1 and
falls back to verify.mjs, so a machine without pwsh still runs a full verify.

**The two things that used to stand between it and retiring `verify.ps1` are both
settled:**

1. ~~**It has never run on Windows.**~~ **Settled 2026-08-18** — it ran here and
   agrees with `verify.ps1` check for check: 54 identical checks, same order,
   same results, same exit code, established by diffing the normalized output of
   both rather than by reading the tails. The port's only extra output is its own
   five-check parity section, which is there by design. The `shell: true` +
   cmd-quoting path for the `openspec`/`eslint` `.cmd` shims (per
   CVE-2024-27980) is exercised and correct.
2. ~~**The adversarial review never returned a final approval.**~~ **Settled**
   — owner-confirmed 2026-08-18 as completed on the Mac. The earlier rounds are
   history worth keeping: two were rejected (blockers: missing directories waved
   through; Windows `.cmd` spawns), both were fixed, and the third died in a
   retry loop once the reviewers' context filled up. If it ever needs re-running,
   split the review by section rather than handing over the whole file at once.

## The one decision left: delete verify.ps1, or keep both

Nothing blocks the retirement any more, but the deletion itself was never
authorized, so both scripts are still here and `verify.ps1` is still the release
gate. The recommendation on record is to **delete `verify.ps1` rather than keep
both**: the port carries a parity section that polices their shared literal
lists, which is a live drift guard while they coexist and dead weight the moment
one is gone.

It is not a one-line deletion. It touches at least:

- `CLAUDE.md`, which names `verify.ps1` throughout — the working loop, the
  release rules, the language gate, and the sentence about requirements being
  anchored in the code
- `scripts/hooks/pre-commit`, which prefers it and falls back to the port
- the port's own parity section, which exists only to police the pair
- the `release` skill, if it names the gate

Until that is decided and carried out, `verify.ps1` remains the authority and
both are run together on this machine.

## Settled: the two restarts stay different

Raised and decided. After a successful update the panel's dialog calls
`resetAndRestart`, which dissolves every group; the stale banner calls
`restartToApply`, which touches nothing. That asymmetry is intentional — a version
change can alter the group marking and leave the old groups unrecognized, so an
update rebuilds them, while applying code already sitting on disk has no reason to.

Written into the source above `restartToApply` so the next person to notice it
finds the answer instead of the question. Nothing to do here.
