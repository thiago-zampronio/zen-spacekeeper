## Context

Spacekeeper's only update trigger is a button inside `about:spacekeeper`
(`src/resources/zstg-panel.mjs:177-183`), which calls `ZSTG.applyUpdate(tag)` in
the chrome script. Everything the update needs already lives in the chrome script,
not the panel: `checkForUpdate`, `applyUpdate` (`src/zen-space-tab-groups.uc.mjs:2145`)
and `restartToApply`. The panel is only a caller.

`applyUpdate` is already the hard part, and it is already correct. It fetches the
manifest **from the release being installed** rather than from the running version
(`src/zen-space-tab-groups.uc.mjs:2149-2168`), stages every file, then commits with
per-file backup and rollback on any mid-loop failure (`2196-2219`). The all-or-nothing
guarantee this change needs is not new work — it needs to be reachable from a second
caller.

Constraints that shaped this design:

- `vendor/fx-autoconfig/` is never edited. The vendored loader (`0.10.16`) is
  byte-identical to the one installed in the live profile, and to upstream master.
- The loader's own "Check for updates" is unusable: `checkLoaderUpdate()` reads only
  `loaderModuleLink.loaderInfo`, hardcoded to the loader's own file
  (`utils.sys.mjs:1124`, `609-618`). It inspects no user script, writes nothing, and
  its `@downloadURL` parse (`boot.sys.mjs:79`) is dead code.
- The mod must work on Windows, macOS and Linux; a solution for one is incomplete.

## Goals / Non-Goals

**Goals:**

- A repair reachable from Zen's own chrome UI, working when `about:spacekeeper`
  does not render.
- Unconditional: it must run when the installed version is already the latest,
  because that is the broken-installation case.
- Same all-or-nothing write guarantee as the panel's Update.
- Close the loader hand-off: stop ending at "go run the installer".

**Non-Goals:**

- Recovering a profile whose chrome script does not load. The entry is inserted by
  that script; if it never runs, there is no entry. Out of reach by construction.
- Replacing or altering the panel's update banner, the pill, or the automatic check.
- Making the installer the normal update path.
- Detecting whether the panel rendered.

## Decisions

### D1: Append our own menu item; do not extend the loader's

`UC_API.Scripts.getScriptMenuForDocument(doc)` (`uc_api.sys.mjs:63-66`) returns the
`userScriptsMenu` element, creating it if needed. A menuitem appended there with its
own `command` listener is runtime DOM — no vendor edit.

Verified safe against the loader's shared popup listener: its `default:` branch only
acts when `ev.target.dataset.filename` is set (`boot.sys.mjs:608-611`). An item
without that attribute falls through to nothing, so our own listener is the only
handler.

*Timing — resolved from source.* The menu is built **once per window**, not on every
popup: `generateScriptMenuItemsIfNeeded` returns early when `#userScriptsMenu`
already exists (`boot.sys.mjs:553-558`), and the `popupshown` listener that triggers
it is registered `{once: true}` (`boot.sys.mjs:543-545`). There is no regeneration to
survive: once appended, the item stays for the life of the window.

The only listener that runs on every popup is `updateMenuStatus`, and it touches only
children with `type="checkbox"` (`boot.sys.mjs:324-327`). Our item carries no such
type, so it is never inspected or rewritten.

*Placement.* Append at the end of `#menuUserScriptsPopup`. The loader prepends the
per-script checkboxes above its own static block (`boot.sys.mjs:592-593`); appending
leaves that fragment untouched, and an action that rewrites files should not sit
above the loader's own items.

Verified that Zen does not decorate this menu: `userScriptsMenu` occurs zero times in
the installed Zen's `omni.ja` and `browser/omni.ja`, with `menu_openDownloads` as a
control confirming the search reads the archives (1 and 6 occurrences). The menu is
the loader's alone.

*Rejected:* declaring `@updateURL` in the script header so the loader's item picks us
up. It does not — the loader never reads a user script's update fields. This would be
a change with no observable effect.

### D2: Force reinstall, with no version comparison

The entry always installs the latest release's full file set, whether or not it is
newer than the running version.

The cost is real and is accepted: a user who clicks it while perfectly up to date
downloads and rewrites six files for nothing, and pays a restart to see no change.
The alternative costs more. A version gate refuses precisely in the situation the
feature exists for — the version is right, the files are wrong — and a rescue that
declines to run when it is needed is worse than one that occasionally runs when it
is not.

*Rejected:* checking first and adapting the wording ("Update to X" / "Reinstall X").
It reads better, but it makes a network check a dependency of a rescue path, and
gives it a way to fail before it starts.

### D3: Reuse `applyUpdate`; do not fork it

`applyUpdate(tag)` already does exactly the required write. The version comparison
that would block a same-version reinstall is not inside it — it is in the callers.
So the reinstall path resolves the latest release tag, then calls `applyUpdate` with
it. No second implementation of staging, backup or rollback.

This is the single most important decision for correctness: a forked writer would be
a second place for the skew bug to come back, in the code whose whole purpose is to
prevent skew.

### D4: A notification bar for confirmation and results

`UC_API.Notifications.show({ label, priority, buttons })` wraps
`gNotificationBox.appendNotification` (`utils.sys.mjs:986-1030`) and accepts buttons
with callbacks. It is chrome UI, independent of the panel, and it is the same
mechanism the loader uses for its own update prompt — so it will look native rather
than invented.

The confirmation names the release and states that current files will be
overwritten. Results reuse it: success, failure with reason, loader-changed.

*Rejected:* a modal dialog. Heavier, and a rescue path should not be able to trap a
user behind a modal if it throws mid-flow.

### D5: The loader hand-off launches the installer, and only then

`applyUpdate` already returns `loaderChanged` (`src/zen-space-tab-groups.uc.mjs:2233`)
and already refuses to touch the application directory. That refusal stays. What
changes is only what happens after: instead of ending at a sentence, the result
offers to run the installer.

`Subprocess.sys.mjs` is confirmed present in the installed Zen (`modules/Subprocess.sys.mjs`
in `omni.ja`). This is the only part of the change that executes anything outside the
browser, and it is deliberately fenced: offered only when `loaderChanged` is true,
only after an explicit second click, never automatically.

The per-platform work is real — `sh install.sh` against `powershell -File install.ps1`,
different elevation behaviour, different failure reporting. That cost buys the one
thing the mod genuinely cannot do for itself.

*Rejected:* always running the installer instead of writing files ourselves. It would
mean downloading and executing a shell script on the normal path, which is a much
larger claim on the user's machine than writing files we already fetch, and it would
throw away `applyUpdate`'s rollback.

### D7: The installers gain `--ref`, because today they fetch from a branch

Handing off to the installer as it stands would break an existing requirement.
`install.sh` defaults `BRANCH="main"` and `fetch()` builds
`raw.githubusercontent.com/$REPO/$BRANCH/$1` (`install.sh:26-27, 585`); the Windows
self-elevation re-downloads `install.ps1` from the same `$Repo/$Branch`
(`install.ps1:576`). The `self-update` requirement *Updates come from a release, not
a branch* forbids exactly that, for the stated reason that a branch turns every later
push into immediate code on the user's machine.

So the installers gain an explicit ref option, and the repair passes the release tag
it already resolved. This keeps the resolution of "latest" in **one** place — the
chrome script's `checkForUpdate`, which sorts by version rather than by publish date
(`src/zen-space-tab-groups.uc.mjs:2001-2007`) — and adds no GitHub API call, and no
second copy of that sorting rule, to the installers.

*Deliberately not solved here:* what the piped one-liner should default to when
nobody passes a ref. Today it is `main`, and that asymmetry is a documented decision,
not an oversight — the release checklist states that the installers serve `main`
while the update flow serves the latest release. Changing it means giving the
installers a concept of "latest" of their own, which means either an `api.github.com`
dependency with its own rate limit and fallback, or GitHub's `/releases/latest`,
whose chronological ordering disagrees with ours precisely in the hotfix case the
version sort exists to prevent. That is a separate change against `installation`.

### D8: A non-interactive flag, so headless is a contract and not luck

Both installers already survive having no terminal, but by rescue rather than by
design: `install.sh` uses `read -r answer </dev/tty || return 1` (`:361`) and
`|| answer=""` (`:791`), and `install.ps1` wraps `Read-Host` in a try/catch that
defaults to proceeding on the elevation prompt (`:557-566`). Launching from the
browser is exactly the no-terminal case, and relying on catch blocks to define
behaviour is the kind of thing that regresses silently when someone adds a prompt.

An explicit flag makes the intent checkable. This is installer plumbing and needs no
proposal of its own, but it is a prerequisite of the hand-off and is therefore
tracked here.

### D6: The entry is not hidden by `zen.stg.updateCheck`

That preference silences the automatic check. The entry involves no automatic
check — it does nothing until clicked. Hiding it behind that preference would let a
configuration remove the rescue, which defeats its purpose. The spec delta states
this explicitly so it does not get "tidied up" later.

## Risks / Trade-offs

- ~~The menu item does not survive the loader regenerating the popup~~ → **closed**:
  the menu is built once per window and never regenerated (D1). No mitigation needed.
- **A cancelled UAC on Windows takes an unhandled path** → `install.ps1` retries with
  `powershell.exe` after `pwsh.exe`, and that second `Start-Process` carries no
  `-ErrorAction SilentlyContinue` (`:582-585`), so a cancelled elevation may throw
  rather than return. The success path is defined — `Test-Path config.js` fails, the
  installer warns and exits 1 (`:598-599`) — but the throw is unverified. To be
  reproduced on Windows before the hand-off ships.
- **A user force-reinstalls while already current, and reads the restart prompt as
  something having gone wrong** → the confirmation says plainly that it reinstalls
  the same release over the current files. Accepted cost of D2.
- **`Subprocess` behaves differently across the three platforms, or is blocked** →
  fenced to the loader case; the pre-existing message stays as the fallback when the
  launch cannot be performed, so the worst case is today's behaviour.
- **Executing a downloaded installer widens what the mod does to the machine** →
  gated behind `loaderChanged` plus an explicit second click; never on the normal
  path; the installer is fetched from the same release tag the files came from.
- **A repair pulls a *newer* release than the one running, surprising a user who
  expected only a repair** → the confirmation names the release being installed, so
  the version is on screen before anything is written. Naming it is the mitigation;
  the behaviour itself is intended.
- **The notes promise is genuinely narrower now** → not mitigated, accepted, and
  written into the spec rather than left implicit. The panel keeps the full notes;
  the repair names the version and says where to read them.

## Migration Plan

None. Additive: a new menu entry and new strings. No preference, no stored
identity, no file layout change. Rollback is removing the entry — nothing persists
that a previous version would misread.

## Open Questions

**Closed since this document was written:**

- ~~Where the entry should sit~~ → append at the end of `#menuUserScriptsPopup`; the
  menu is built once per window, so the placement is stable (D1).
- ~~Whether Zen decorates the menu~~ → it does not. `userScriptsMenu` occurs zero
  times in the installed Zen's `omni.ja` and `browser/omni.ja` (D1).
- ~~Whether the installer can be pointed at a release~~ → not today; it fetches from
  a branch, and D7 adds the option it needs.

**Still open:**

- Whether a cancelled UAC throws out of `install.ps1`'s second `Start-Process`
  (`:582-585`). Needs Windows.
- Whether `Subprocess` can launch `powershell.exe` with elevation at all from a
  chrome script, or whether the UAC prompt is suppressed when the parent is not a
  console. The module's presence is proven; this behaviour is not.
- Whether the piped one-liner's default should become the latest release instead of
  `main`. Deliberately deferred to its own change (D7).
