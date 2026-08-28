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

The price this was written to justify has since dropped, and the decision is kept
anyway. It assumed an `api.github.com` call, rate-limited to 60 requests an hour
per IP where `raw.githubusercontent.com` is not — so an office, a CI runner or a
shared NAT could hit a wall that does not exist today. D2 removed that: following
a redirect is not an API call. What remains is an ordinary HTTPS request that can
still fail for ordinary reasons — no network, DNS, a GitHub outage — and stopping
is still the right answer to those.

The alternative is worse in a way that is hard to detect: a silent fall back to
`main` reintroduces exactly the behaviour this change removes, at the moment nobody
is watching, on a machine whose owner believes they installed a release. A loud
failure with an override to hand is recoverable in one command; a quiet branch
install is discovered months later, if ever.

*Rejected:* falling back to `main` with a warning. Warnings in a piped installer
scroll past; the install still happens, and the guarantee is gone.

### D2: SETTLED — the installers ask, they do not compute

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

**The decision: the installers learn the tag by following the redirect at
`https://github.com/<owner>/<repo>/releases/latest`, and implement no version
comparison at all.** The final URL names the tag; `curl -sIL` gives it on one side
and a redirect-following request on the other. No API call, so none of the
`api.github.com` rate limit that D1 was written around. No second implementation of
the rule, so nothing to drift.

What makes this correct rather than merely convenient is that GitHub's "latest"
pointer is **our deliberate act, not its guess**. The release checklist already
publishes with `--latest`. A hotfix on an older line is published WITHOUT it, and
the pointer keeps naming the higher version — which is exactly the outcome the
version sort exists to produce, reached by declaring it once at release time
instead of deriving it three times at install time. It matches the capability's own
principle: a release is a deliberate act.

The rule does not disappear. It stays in `latestRelease()` in `zstg-core.mjs`,
where it is tested, and it gains a second job: **auditing the flag**. If GitHub
marks a release latest that is not the highest by version, that is a release-time
mistake, and the rule is what can say so.

#### Rejected, and why each was rejected

1. **Reimplement in `sh` and PowerShell, with `verify.mjs` proving agreement** —
   the original preference, withdrawn on evidence. It needs `pwsh` present to check
   the third implementation, and a machine without it would pass the build with two
   of three proven. Commit `6f74ac1` retired `verify.ps1` for precisely that
   reason, stating the goal as running the full verify "on every commit and every
   platform" instead of skipping whenever pwsh was absent. Choosing this would
   undo a decision taken ten days earlier without noticing.
2. **Publish the answer as a release asset** — the shape this decision started as.
   Superseded because GitHub already publishes exactly that pointer, for free, with
   no asset to forget to upload and no second thing to keep in sync.
3. **Take GitHub's `/releases/latest` blindly** — recorded here because it looks
   identical to what was chosen and is not. Taken blindly, the pointer is whatever
   GitHub decided; taken with the release checklist setting `--latest` deliberately
   and `verify` auditing it, the pointer is ours. The difference is entirely in the
   discipline around it, which is why that discipline is a task and not a note.

#### The cost this carries

The correctness moves from a rule to a habit. A hotfix published with `--latest`
by mistake would point every fresh install at the lower version, and nothing at
install time would notice — where option 1 would have compared and disagreed. The
mitigation is an audit that uses `latestRelease()` against the published flag, and
it is worth naming that this audit needs the network, so it belongs to the release
step rather than to the per-commit `verify.mjs`, which runs offline in the
pre-commit hook and must keep doing so.

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

- ~~Which of D2's three options is taken~~ → settled: the installers follow the
  `releases/latest` redirect and implement no version comparison. See D2.
- Where the audit of GitHub's latest flag lives. It needs the network, so it
  cannot join the per-commit `verify.mjs`, which runs offline in the pre-commit
  hook. The release step is the obvious home; whether it is a check inside the
  release skill or a script the skill calls is open.
- Whether the fallback in D1 should have any exception at all — for example, a
  cached answer from a previous successful resolution on the same machine.
- Whether `--branch` should be renamed or kept as an alias of the ref option once
  the default is no longer a branch, given that the name would then describe the
  exception rather than the rule.
