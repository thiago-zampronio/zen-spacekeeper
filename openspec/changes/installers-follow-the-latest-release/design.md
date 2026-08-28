## Context

Two code paths reach GitHub for Spacekeeper's files, and they use different sources.

`checkForUpdate` (`src/zen-space-tab-groups.uc.mjs:1990-2010`) calls
`api.github.com/repos/$REPO/releases?per_page=100`, drops drafts and prereleases, and
picks a head by **version**, with the reasoning written in the code:

> *"Sorted by VERSION, not by publish date: a hotfix published after a bigger release
> must never become the head — the API's order is chronological, and chronology is
> not semver."*

The installers call nothing. `install.sh` defaults `BRANCH="main"` and `fetch()`
builds a `raw.githubusercontent.com/$REPO/$BRANCH/$1` URL (`:26-27, 585`);
`install.ps1` mirrors it, including in the Windows self-elevation re-download
(`:576`). Both accept a ref override — added by `add-update-menu-entry` — and this
change is only about what happens when nobody passes one.

The clone path is separate and stays untouched: `FROM_CLONE` (`install.sh:558-559`)
installs local files and fetches nothing.

## Goals / Non-Goals

**Goals:**

- One definition of "latest" in the product, applied by every path that fetches.
- A standalone install receives a release, never an unreleased commit.
- A resolution failure is loud, not a silent fall back to a branch.

**Non-Goals:**

- Changing the ref override, the clone path, the update flow, or the repair.
- Changing how a release is cut.
- Authenticating to the GitHub API.

## Decisions

### D1: Stop, do not fall back to a branch

If the release list cannot be fetched, the installer fails with a clear message
naming the reason, and suggests the ref override.

This costs real installs. Unauthenticated `api.github.com` allows 60 requests per
hour per IP, and `raw.githubusercontent.com` does not throttle that way — so an
office, a CI runner or a shared NAT that installs repeatedly can hit a wall that does
not exist today. That is the price, and it is worth naming rather than smoothing
over.

The alternative is worse in a way that is hard to detect: a silent fall back to
`main` reintroduces exactly the behaviour this change removes, at the moment nobody
is watching, on a machine whose owner believes they installed a release. A loud
failure with an override to hand is recoverable in one command; a quiet branch
install is discovered months later, if ever.

*Rejected:* falling back to `main` with a warning. Warnings in a piped installer
scroll past; the install still happens, and the guarantee is gone.

### D2: The problem to solve is drift, not fetching

Fetching a JSON list and picking a tag is easy in all three languages. Keeping the
**same** answer in all three is the hard part, and this repository has already paid
for getting that wrong once: the version literal lived in four places and drifted
until `verify.mjs` was made to keep them honest — `inspect()` reported `0.2.0` while
the script was `0.16.0`, so the one number people are asked for when reporting a
problem was wrong.

A version-comparison rule is a worse candidate for duplication than a literal,
because copies fail only on inputs nobody has yet: a two-digit segment, a
double-digit minor, a tag without the `v`, a prerelease suffix. Three implementations
agreeing on `0.59.1` versus `0.60.0` proves nothing about `0.9.0` versus `0.10.0`.

Options, to be settled before implementation:

1. **Reimplement in `sh` and PowerShell, and make `verify.mjs` prove agreement** —
   feed all three implementations the same table of tricky version pairs and fail the
   build on any disagreement. `verify.mjs` already runs the pure core's cases under
   node and already shells out to both installers for other checks, so the harness
   exists.
2. **Have the installers ask a single source** rather than compute — for instance,
   publish the resolved answer as part of a release and have the installers read it.
   No duplicated rule at all, but it adds a release-time artifact that can go stale
   or be forgotten, which `verify.mjs` would then have to guard instead.
3. **Accept GitHub's `/releases/latest`** and drop the version rule for the install
   path. Simplest by far, and wrong precisely in the hotfix case the existing comment
   exists to prevent — the two paths would disagree rarely, which is the worst
   frequency for a disagreement.

Option 1 is the current preference: it keeps the rule where the behaviour is, and
turns "the three agree" from a hope into a check that fails. Option 3 is recorded
because it is genuinely tempting and should be rejected explicitly rather than
forgotten.

### D3: The installer states which release it installed

Today the output names files. With a resolved release it must name the version, or a
user cannot tell what they got, and neither can anyone reading a support report. This
also makes the failure in D1 legible: the line that would have named the release is
the line that says it could not be determined.

## Risks / Trade-offs

- **API rate limiting turns installs into failures** → accepted per D1; the ref
  override is the documented escape, and the failure message must name it.
- **Three implementations of the version rule drift** → the whole of D2; unresolved
  until an option is chosen, and the change should not be implemented before it is.
- **A fresh install between a merge and its tag now gets the previous release** →
  intended. It is the behaviour the requirement asks for. It does mean a fix merged
  but not yet released stops reaching new installs, which raises the cost of leaving
  `main` unreleased — arguably a healthy pressure, but a real change to how the
  project operates.
- **The release checklist's description becomes wrong the moment this ships** →
  updating it is in scope, not a follow-up.
- **`install.ps1`'s elevated child re-downloads the installer** (`:576`) → it must
  resolve to the same release as its parent, not re-resolve independently, or a
  release published between the two steps splits the install across versions.

## Migration Plan

No state to migrate. Existing installations are unaffected: this changes what a new
fetch retrieves, not what is already on disk. Rollback is restoring the branch
default.

One ordering constraint: this change depends on the ref option delivered by
`add-update-menu-entry`. It must not be implemented first.

## Open Questions

- Which of D2's three options is taken. This is the decision that gates
  implementation.
- Whether the fallback in D1 should have any exception at all — for example, a
  cached answer from a previous successful resolution on the same machine.
- Whether `--branch` should be renamed or kept as an alias of the ref option once
  the default is no longer a branch, given that the name would then describe the
  exception rather than the rule.
