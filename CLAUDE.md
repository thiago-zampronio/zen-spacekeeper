# Spacekeeper

Automatic tab grouping for the Zen Browser, scoped to Spaces. A privileged chrome
script (`.uc.mjs`) loaded by fx-autoconfig — not an extension, not a Zen Mod.

## Two rules that override convenience

**1. OpenSpec first.** Every behavior change goes through a proposal before any code
is written. Use the `openspec-propose` skill; do not skip straight to editing
`src/`. The living specification is `openspec/specs/` — one directory per
capability, each requirement anchored in the code by `scripts/verify.ps1`. A change that alters
behavior without touching the spec leaves the spec lying.

Wording fixes, translations, tooling and installer plumbing do not need a proposal.
Anything a user could notice as different behavior does.

**2. Everything in English.** Specification, proposals, code, identifiers, comments,
commit messages, user-visible text. `verify.ps1` fails if a source file contains
Portuguese accented characters, so this does not regress quietly.

The one exception: `openspec/changes/archive/` is in Portuguese. It is the record of
decisions taken before the rule existed, and is deliberately not retranslated.

## Never rename these

They are stored identity. Renaming any of them silently breaks the groups users
already have on screen, with no error and no migration path:

- the `zstg-key` attribute (`KEY_ATTR`) and `zen-workspace-id` (`SPACE_ATTR`)
- the `zen.stg.` preference prefix, and every preference name under it
- the `"host"` and `"sub"` values of `zen.stg.subdomainLabel`
- the order and contents of `COLORS`, and the FNV constants in `colorFor`: the
  hash color of every key a user never overrode is derived from them, so touching
  either silently recolors groups and freezes false "manual" colors into the pref

The `zstg-` prefix on filenames is internal and may look inconsistent with the
Spacekeeper name. Leave it: the cost of changing it is paid by users, not by us.

## The core invariant

Group identity is the pair **(spaceId, key)**, and `spaceId` is always read **from
the tab** (`tab.getAttribute("zen-workspace-id")`), never from the active workspace.

This is the whole point of the project. Each Space has its own DOM tab container, so
a group lives inside one Space's strip and `group.addTabs(tab)` reparents the tab
into that Space. Reading the Space from anywhere but the tab reintroduces the exact
bug this exists to fix: a tab dragged out of the Space the user is in.

`gBrowser.addTabGroup` requires a non-null `insertBefore`, and inserts the group into
that node's parent — which is what guarantees the group is born in the right Space.

## Where things live

```
install.ps1              Windows installer: loader + mod, detects Zen and profile
install.sh               the same installer for macOS and Linux (POSIX sh)
eslint.config.mjs        no-undef + no-unused-vars over src/, nothing of style
package.json             dev tooling only (eslint); the mod has no dependencies
package-lock.json        pins that tooling
src/*.uc.mjs             the chrome script (window-scoped ES module)
src/guard/               the loader guard scripts, deployed to <profile>/spacekeeper/
src/*.uc.css             collapse and appearance, scoped to tab-group[zstg-key]
src/resources/           served over chrome://userchrome/content/
  zstg-panel.html        the about:spacekeeper panel, chrome-privileged
  zstg-i18n.mjs          every user-visible string, 3 languages
  zstg-core.mjs          the pure logic; verify.ps1 runs its tests under node
scripts/verify.ps1       spec ↔ code ↔ docs ↔ installation sync check
vendor/fx-autoconfig/    vendored loader (MPL 2.0) — do not edit
openspec/specs/          the living specification
openspec/changes/        proposals in flight; archive/ is history, in Portuguese
```

No user-visible text goes anywhere but `zstg-i18n.mjs`. The panel and the chrome
script import the same catalog, so a phrase exists in exactly one place. Adding a
key means adding it to all three languages — `verify.ps1` fails otherwise.

## Working loop

```powershell
.\install.ps1            # copy src/ into the profile (macOS/Linux: ./install.sh)
.\scripts\verify.ps1     # spec, docs, syntax, languages, installed files
```

Then restart Zen. If the script does not load, clear the startup cache in
`about:support` — a stale cache is the most common cause of "my change did nothing".
The installer's `-Restart` / `--restart` option does the restart and the cache
clearing in one step.

Enable the repo's pre-commit gate once per clone — it runs the syntax, lint and
language checks on every commit, and the full `verify.ps1` when `pwsh` is
installed — and install the dev tooling (eslint) it and verify.ps1 expect:

```sh
git config core.hooksPath scripts/hooks
npm install
```

## Releasing

A release is a version bump plus a push to `main` — the piped installers serve
whatever `main` holds. The version lives in three places that `verify.ps1` keeps
honest: the `@version` header and the `VERSION` constant in the script, and the
`[ZSTG] x.y.z ready` literal in the README. Bump all three, run the installer to
refresh your profile, run `verify.ps1`, and only then push. For milestones, also
tag it and publish notes (`gh release create vX.Y.Z`) — releases are where new
users judge whether the project is alive.

`verify.ps1` catches a requirement with no implementation, a pref with no
documentation, a README citing a function that no longer exists, and a stale file in
the profile. It does **not** catch an implementation that is present and wrong. For
behavior, `ZSTG.selfTest()` in the browser console.

## Debugging

Turn on `zen.stg.debugLog` and read `zstg-debug.log` in the profile folder. Reach for
it early: the hardest moments here — session restore, reclaiming groups, the favicon
arriving after the group was created — all happen before anyone opens the console,
and every one of them was diagnosed in a single read once the log existed. Guessing
from symptoms wasted far more time than the log ever cost.

Reading `prefs.js` from disk beats asking what the configuration is.

## Things that will bite

- **Every Zen update deletes the loader** (`config.js` and
  `defaults/pref/config-prefs.js` in the program directory). The symptom is the mod
  silently not loading. `.\install.ps1 -Check` / `./install.sh --check` diagnoses
  it; running the installer again fixes it.
- **`chrome/resources/` is copied, not linked.** Editing the panel in `src/` changes
  nothing until the installer runs again.
- **The panel page runs with UI privilege.** It reads and writes prefs directly. Keep
  it strictly local: no font, image, script or fetch from the network. Its CSP
  (`default-src chrome:`, inline script/style allowed for its own code) enforces
  the no-network rule, and a requirement in the spec depends on it.
- **`attr()` in CSS only reads the pseudo-element's own element.** The hidden-tab
  count is written on the label, not on the group, for that reason.
- **Zen only styles `zen-folder[collapsed]`.** A regular group toggles the attribute
  and hides nothing; our stylesheet fills that gap.

## Honesty requirements

Do not mark a task complete because the code looks right. Tasks that need a running
browser — languages switching in the menu and the panel together, the dark theme,
`about:spacekeeper` opening, tabs in two Spaces — live in their own section of every
`tasks.md` and are checked **only** when the user confirms they tested it. This has
been gotten wrong before and had to be reverted.

The same applies to reporting: if `verify.ps1` fails, say so and paste the output.
