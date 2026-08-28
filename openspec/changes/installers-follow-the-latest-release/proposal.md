## Why

Spacekeeper has two ways to get code onto a machine, and they disagree about which
code.

The piped installer fetches from a branch: `install.sh` defaults `BRANCH="main"` and
`fetch()` builds `raw.githubusercontent.com/$REPO/$BRANCH/$1` (`install.sh:26-27,
585`). The update flow fetches from the latest published release, and the
`self-update` requirement *Updates come from a release, not a branch* forbids the
branch outright — because a branch turns every later push into immediate code on the
user's machine, while a release is a deliberate act.

So the product holds the branch to be unsafe for updating and acceptable for
installing. The asymmetry is documented rather than accidental — the release
checklist states that the installers serve `main` while the update flow serves the
latest release — but the reasoning that condemns the branch does not stop applying
at install time. A person running the one-liner is trusting the project once, at a
moment they chose; what they receive is whatever the most recent push happened to
leave on `main`, which may be a commit nobody has released, tested as a whole, or
written a changelog entry for.

Two concrete consequences, today:

- Between a merge and the tag that follows it, a fresh install receives code that no
  release describes. `CHANGELOG.md` cannot explain what that user is running, and
  `verify.mjs`'s guarantee that a version has an entry does not cover it.
- The two paths can hand the same person different code for the same version
  number.

## What Changes

- The installers gain a concept of the **latest release**, and use it as the default
  source when no ref is given.
- "Latest" means what it already means in this product: the newest published,
  non-draft, non-prerelease release **sorted by version**, not by publish date. That
  rule exists in `checkForUpdate` (`src/zen-space-tab-groups.uc.mjs:2001-2007`) with
  a comment explaining why chronology is wrong — a hotfix published after a bigger
  release must not become the head. The installers must resolve it the same way, or
  the two paths still disagree, just less often and more confusingly.
- The existing explicit ref option (added by `add-update-menu-entry`) stays as the
  override, and continues to accept a branch for development and testing.
- Running from a clone is unchanged: `FROM_CLONE` (`install.sh:558-559`) installs
  local files and reaches the network for nothing.

### Out of scope

- **The `--ref` option itself.** Already delivered by `add-update-menu-entry`; this
  change only changes what happens when nobody passes it.
- **The in-product repair and the update flow.** They already resolve the release
  correctly; nothing about them changes.
- **Any change to how a release is cut.** The release checklist's steps stay; only
  its description of what the installers serve becomes wrong and needs rewriting.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `installation`: the requirement *Installing without a copy of the repository*
  currently says a standalone installer "retrieves the mod and loader files it
  needs" and that "the installed files match the published ones". That phrase is
  satisfied loosely today by whatever `main` holds. The requirement must say which
  published files, and must state the fallback when the latest release cannot be
  resolved — a rescue that cannot run because of an API rate limit is a worse
  failure than the one it replaced.

## Impact

- `install.sh` and `install.ps1`: resolving the latest release, the version-sort
  rule, and the fallback path.
- A new dependency on `api.github.com` in the installers, which today reach only
  `raw.githubusercontent.com`. Different host, different failure modes, and
  unauthenticated requests are rate-limited per IP where raw fetches are not.
- The version-sort rule would exist in three languages — JavaScript, POSIX sh and
  PowerShell. This repository has already been bitten by one rule living in several
  places: the version literal drifted across four copies until `verify.mjs` was made
  to keep them honest. The design must decide how this one is kept from drifting,
  and that is the hardest part of this change, not the fetching.
- `.claude/skills/release/SKILL.md` and any documentation stating that the
  installers serve `main`.
- `docs/MANUAL.md`, wherever the install source is described.
- No change to the panel, the guard, any preference, or any stored identity.
