## Why

Updating Spacekeeper today has exactly one trigger: the Update button inside
`about:spacekeeper`. Version 0.59.1 fixed a bug where that page rendered blank on
newer Zen builds, and in doing so exposed the structural problem — when the panel
is the casualty, the panel is also the cure, and the user has no way in. The
update alert made it worse by pointing straight at the broken page. Those users
could only recover by re-running the installer or typing into the browser console.

That failure mode is not specific to one bug. The panel is a privileged HTML
document rendered by an engine the project does not control, and the mod is six
files that must move together; every Zen release can break the first, and any
half-finished write can skew the second. What is missing is not a second update
button — it is a **repair**: one action that puts the published files back exactly
as a fresh install would, without asking what is wrong first.

Zen already surfaces a **Tools > userScripts** menu, built by the fx-autoconfig
loader, where Spacekeeper is listed. That menu is chrome UI: it keeps working when
the panel does not, and users already look there for script-level actions. It is
where the repair belongs.

### The limit, stated up front

The menu entry is inserted by Spacekeeper's own chrome script. If that script does
not load at all — the case when a Zen update deletes the loader — the entry does
not exist either, and only the external installer can help. This change covers the
band between "everything works" and "nothing loads": a script that runs, over
resources that are broken, stale or skewed.

## What Changes

- Spacekeeper adds its own entry to the **Tools > userScripts** menu, present
  whenever the mod is loaded, that reinstalls the mod over the current files.
- The entry is a **force reinstall, not a version check**. It never compares the
  running version against the latest release: it always fetches the latest
  release's own file manifest and rewrites all of the profile-side files. This is
  deliberate — the case it exists for is the one where the version is already
  correct and the installation is broken anyway.
- Before writing anything it asks for confirmation, naming the release it is about
  to install and stating that current files will be overwritten. Cancelling
  changes nothing.
- The write reuses the existing staging, backup and rollback path, so a failure
  midway leaves the previous files in place — the same all-or-nothing guarantee
  the panel's Update has.
- The confirmation names the version being installed and points at where the
  published notes can be read. It does **not** reproduce the notes. This narrows
  the current promise on purpose: the panel stays the place where an update is
  *decided* with the missed changes in view, and this is a repair action reached
  when the panel cannot be.
- When the release also changed the **loader**, the result offers to run the
  installer, which is the only component allowed to touch the application
  directory. Today that situation produces only a sentence telling the user to run
  the installer themselves; this closes the loop.
- The update alert (the floating pill over the sidebar) is **unchanged**. It keeps
  opening the panel with the banner filled in.

### Out of scope

- **Riding fx-autoconfig's own "Check for updates" item.** Investigated and
  rejected: that item calls `checkLoaderUpdate()`, hardcoded to the loader's own
  file (`utils.sys.mjs:1124`, `utils.sys.mjs:609-618`). It never inspects a user
  script, never writes anything to disk — its "Download…" button opens a GitHub
  page — and the `@downloadURL` header field it parses is read nowhere. It is also
  single-file by construction, while Spacekeeper is six files with a hard skew
  constraint. Declaring `@updateURL` in Spacekeeper's header would change nothing
  a user could see.
- **Editing `vendor/fx-autoconfig/`.** The entry is appended at runtime through the
  loader's public `UC_API.Scripts.getScriptMenuForDocument(doc)`.
- **Running the installer as the normal path.** Downloading and executing a shell
  script is a real escalation of what the mod does to the machine; it is reserved
  for the loader case, where nothing else can do the job.
- **Giving the installers their own concept of "latest".** The repair passes the
  release tag the chrome script already resolved, so no second implementation of
  that rule is needed here. What the piped one-liner should default to when nobody
  passes a ref — `main`, as today, or the latest release — is a real question with
  real costs, and it gets its own change against `installation`.
- **Changing the pill**, the panel's update banner, or the automatic check's
  cadence, endpoint or preference.
- **Detecting that the panel failed to render.** Rejected as the fragile part: the
  entry is unconditional, so nothing has to diagnose the panel to offer the repair.
- **Recovering when the chrome script itself does not load.** Out of reach by
  construction, as stated above.

## Capabilities

### New Capabilities

None. This extends an existing capability rather than introducing one.

### Modified Capabilities

- `self-update`: three requirements change and one is added.
  - *Nothing happens without a click* — the user-initiated download is currently
    scoped to the panel. The menu entry is a second click-shaped hole, and the
    requirement must name it, or the spec understates where a write can start. The
    absolute line is unchanged: nothing installs without a click.
  - *A check tells what changed* — the notes of every missed release currently
    accompany the decision. That stays true of the panel, but cannot hold on a
    path whose purpose is to work without the panel. The requirement must say
    where notes are guaranteed and where only the version and a pointer to the
    notes are.
  - *The update stays inside the profile* — currently, a release that also changed
    the loader produces a sentence pointing at the installer. The repair may now
    offer to launch it. The application directory is still never written by the
    mod; the rationale that elevation belongs to the installer is preserved, since
    a human clicked to get here.
  - **ADDED** *Repair does not depend on the panel* — the menu entry, its
    unconditional reinstall, the confirmation, and the outcomes.

- `control-panel`: one requirement changes.
  - *Update controls report honestly* — the panel's network disclosure must be
    exhaustive, and it currently ends by claiming that nothing else in the product
    touches the network (`openspec/specs/control-panel/spec.md:163`; the shipped
    string says "This is the only thing in the whole product that touches the
    network"). The repair is a second thing that does. This is the same shape of
    failure the requirement already records once — the disclosure previously called
    update clicks "the one action that contacts the network" until the automatic
    check made that false. The disclosure must name the repair, and must say that
    the preference silencing the automatic check does not silence it.

## Impact

- `src/zen-space-tab-groups.uc.mjs`: the menu entry, the confirmation flow, and a
  reinstall entry point that reuses `applyUpdate`'s staging/backup/rollback without
  its version gate. Adds the installer hand-off for the loader case.
- `src/resources/zstg-i18n.mjs`: new user-visible strings, in all three languages.
- `scripts/verify.mjs`: an anchor for the new requirement.
- `docs/MANUAL.md`: the update section gains the repair route and its limit.
- `openspec/specs/self-update/spec.md`: via the delta.
- Launching the installer uses `Subprocess.sys.mjs`, confirmed present in the
  installed Zen. It is a new kind of action for this codebase and needs its own
  per-platform verification in a running browser.
- `install.sh` and `install.ps1`: an explicit ref option, plus a non-interactive
  flag. Both are prerequisites of the hand-off, not decoration — the installers
  currently fetch from a branch (`install.sh:26-27, 585`), which the requirement
  *Updates come from a release, not a branch* forbids, and they survive having no
  terminal only through catch blocks rather than by contract. This is installer
  plumbing and carries no proposal of its own, but it is in this change's scope.
- No change to the loader guard, the panel, or any preference.
- No stored identity is touched: no attribute, no preference name, no colour.
