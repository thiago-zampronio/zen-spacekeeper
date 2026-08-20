# Spacekeeper — the manual

Everything the [README](../README.md) keeps light: installation in depth, every
preference, the commands, diagnostics, appearance, verification and the known
limitations.

## Installation

The everything-handled command — install, the update guard, restart with the
startup cache cleared. macOS and Linux:

```sh
curl -fsSL https://raw.githubusercontent.com/thiago-zampronio/zen-spacekeeper/main/install.sh | sh -s -- --guard --restart
```

Windows, in PowerShell:

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/thiago-zampronio/zen-spacekeeper/main/install.ps1))) -Guard -Restart
```

Prefer to keep it minimal? Drop the flags — `irm … | iex` on Windows,
`curl … | sh` elsewhere — and you get the plain install, restart questions asked
instead of assumed, no watcher created.

You may be asked for administrator rights once — only when Zen's application
directory is not writable by your user (typical on Linux system installs; a
per-user macOS install usually needs no prompt, and an already-present loader
skips the step entirely). Everything else goes into your profile and needs no
privilege.

If you would rather read a script before running it, download it first:

```sh
curl -fsSLO https://raw.githubusercontent.com/thiago-zampronio/zen-spacekeeper/main/install.sh
less install.sh && sh install.sh
```

Without `--restart`: close Zen, open `about:support` and click **Clear startup
cache** — without that, Zen ignores the freshly installed loader. Reopen it and go
to `about:spacekeeper`.

To confirm it loaded, **Ctrl+Shift+J** (**Cmd+Shift+J** on macOS) shows
`[ZSTG] 0.59.0 ready — active Space …`.

### When detection needs help

The installer finds Zen and your profile on its own, reading `profiles.ini`
rather than guessing — if you have more than one profile, it picks the one Zen
actually uses, which is frequently **not** the one flagged as default.

When it cannot find something it stops rather than guessing, and tells you which
option to pass. Read the values in `about:profiles` (profile) and
`about:support` (application):

```powershell
.\install.ps1 -ProfileDir "C:\path\to\profile" -ZenDir "C:\path\to\Zen Browser"
```

```sh
./install.sh --profile-dir ~/path/to/profile --zen-dir /Applications/Zen.app/Contents/Resources
```

Run from a clone, both installers use the local files instead of downloading.

### Other options

```powershell
.\install.ps1 -Check       # what is installed, and what a Zen update removed
.\install.ps1 -Uninstall   # removes the mod, keeps the loader and your settings
```

```sh
./install.sh --check
./install.sh --uninstall
```

Both installers also take a source override — `-Repo` and `-Branch` on Windows,
`--repo` and `--branch` elsewhere — pointing a standalone run at another
repository or branch. Useful mainly for development.

### Installing while Zen is open

Zen runs the version it loaded when it started. Installing over a running Zen
replaces the files on disk without touching what is in memory, so the browser goes
on running the previous version — and every check that compares files to files
correctly reports that everything is installed.

Three things notice this now, and each covers a gap the others leave:

- **The panel** shows a banner naming the running version, the installed one, and
  the remedy. It appears without being looked for, but only once you open the panel.
- **The mod itself** compares the two at startup and records the result in
  `zstg-debug.log` — with nobody present, and whether or not they differ. A check
  that only leaves a trace when it fails cannot be told from one that never ran.
- **`-Check` / `--check`** reports it before the browser is involved at all, which
  is the only one available when the mod is not loading in the first place.

The remedy always names both halves: close Zen, clear the startup cache in
`about:support`, then open it again. **Restarting alone is not enough** — a stale
startup cache reproduces the same state.

What none of them can do is fix it in place. fx-autoconfig offers no supported way
to reload a chrome script, and a half-swapped script would be a worse state than a
consistently stale one.

The installer's half compares an install marker against the profile lock file, and
stays silent whenever it cannot tell — Zen not running, no marker, no lock. It
answers "did the browser start before the install", not "which version is running";
only the mod itself can answer the second.

Uninstalling leaves the loader in place, because other mods may depend on it, and
keeps your preferences so a reinstall finds your configuration. Updating and
uninstalling are also one click inside `about:spacekeeper` (Updates / Removal) —
no installer needed; both end offering a clean restart that dissolves the mod's
groups and clears the startup cache for you.

### Restarting for you

The two steps left after installing — restarting Zen and clearing the startup
cache — can be done by the installer itself:

```powershell
.\install.ps1 -Restart
```

```sh
./install.sh --restart
```

Without the flag the installer asks, when a terminal is available to answer.
Piped runs without the flag skip the restart silently and print the manual steps,
so the one-line install commands above behave exactly as before.

The installer never closes Zen without a yes, and never kills it: it asks the
browser to quit the way the platform does, waits up to 20 seconds, and if Zen
stays open — an unsaved-changes dialog, usually — it says so and leaves
everything as it was, cache included. The cache cleared is only the
`startupCache` of the profile it detected; when the profile lives outside the
known profile root, the installer skips that step and says so rather than guess
at someone else's cache.

### The guard

`--guard` / `-Guard` installs a small watcher — a LaunchAgent on macOS, a systemd
user path unit on Linux, a Scheduled Task on Windows — that notices when a Zen
update deletes the loader: within seconds on macOS and Linux (directory
watchers), at the next logon or the daily noon run on Windows (a scheduled
task, nothing resident). Where the system allows a background write
it restores the loader from a copy cached in your profile (byte-for-byte, no
network); where it does not — macOS protects application bundles from background
processes — it notifies you with the exact next step instead. It never asks for a
password: a background process asking for one is indistinguishable from malware.

The guard is honest about its footprint: everything lives in one profile directory
(`<profile>/spacekeeper/`) plus the single watcher entry, `--check` reports it,
`--uninstall` removes it — and it removes **itself** if you ever delete the mod by
hand, so it never outlives its reason to exist. Once installed it depends on
nothing else: you can delete the installer and any clone.

**A flatpak Zen** keeps its application files in a read-only image, so the loader
cannot be installed into it this way. The installer says so and stops instead of
reporting a success that would never load.

## After every Zen update

**Every Zen update replaces the installation directory and deletes the loader.**
This has already been observed in practice: a staged update was applied on a
restart and removed `config.js` and `defaults/pref/config-prefs.js`.

**With the guard installed, this stops being your problem**: you get a
notification — within seconds on macOS and Linux, at the next logon or daily
run on Windows — either "restored, it loads on the next start" or the exact
command to run. Without it, the symptom is the mod simply not loading, with no
error — `about:spacekeeper` shows "invalid address", the context menu entry is
gone, and the console has no `[ZSTG]` line. Diagnosis and fix are the same
command, and they work without a clone, exactly like the install did:

```powershell
$i = irm https://raw.githubusercontent.com/thiago-zampronio/zen-spacekeeper/main/install.ps1
& ([scriptblock]::Create($i)) -Check   # tells you what is missing
irm https://raw.githubusercontent.com/thiago-zampronio/zen-spacekeeper/main/install.ps1 | iex   # puts it back
```

```sh
curl -fsSL https://raw.githubusercontent.com/thiago-zampronio/zen-spacekeeper/main/install.sh | sh -s -- --check
curl -fsSL https://raw.githubusercontent.com/thiago-zampronio/zen-spacekeeper/main/install.sh | sh -s -- --restart
```

From a clone, `.\install.ps1 -Check` / `./install.sh --check` and running the
installer again do the same.

The profile side (`chrome/utils`, `chrome/JS`, `chrome/resources`) is not
affected by updates.

## Configuration

Open **`about:spacekeeper`** — a control panel with every setting grouped by
subject, each one explained in plain language, plus the commands and the
self-test one click away. Rules and exclusion lists are edited there without
writing JSON by hand.

The panel is a **view over the preferences**, not a parallel store: everything it
writes goes to `zen.stg.*`, and a change made in `about:config` shows up in it.
Nothing stops working for anyone who prefers the raw pref.

In `about:config`, prefix `zen.stg.`. Changes take effect immediately, without
restarting.

**A new installation starts on the recommended experience.** The first time the
script runs in a profile that has never used it, it writes seven settings once:
focus mode on with the idle strategy, open groups on top, ten groups kept, the
fold motion, and `google.com` split by subdomain with short labels. They are
ordinary preferences from then on — change any of them and it stays changed. A
profile that already used Spacekeeper is never touched, on any update; the
`Default` column below is the value in play when nothing was seeded or chosen.

| Pref | Type | Default | Effect |
| --- | --- | --- | --- |
| `zen.stg.enabled` | bool | `true` | turns on automatic organization (manual commands remain available when off) |
| `zen.stg.seeded` | bool | `false` | marks that the first-run seed already ran in this profile; set once and never read again |
| `zen.stg.groupBySubdomain` | bool | `false` | `mail.google.com` separate from `drive.google.com` |
| `zen.stg.subdomainDomains` | string | `""` | sites split by subdomain, comma-separated (the rest of the web is unaffected) |
| `zen.stg.subdomainLabel` | string | `host` | name shown when a site is split: `host` (`mail.google`) or `sub` (`mail`) |
| `zen.stg.locale` | string | `auto` | interface language: `auto`, `en`, `pt-BR` or `es` |
| `zen.stg.minTabs` | int | `1` | minimum tabs with the same key to create a group |
| `zen.stg.focusMode` | bool | `false` | focus mode master switch; the strategy pref picks the mechanic |
| `zen.stg.focusStrategy` | string | `groups` | `groups` = the N most recently used groups stay open; `idle` = untouched groups collapse after a time window |
| `zen.stg.focusIdleMinutes` | int | `60` | idle strategy window, 1-1440: minutes a group can sit untouched before collapsing; any touch resets it |
| `zen.stg.focusReorder` | bool | `false` | with focus mode on, expanded groups stay above collapsed ones — a group slides down when it closes, slides up when it opens, and slides up when it is first created (instant when the motion is `off` or the OS asks for reduced motion) |
| `zen.stg.focusKeep` | int | `3` | how many groups focus mode keeps open, 1-10 (`1` = only the active one) |
| `zen.stg.focusDelay` | int | `800` | ms focus mode waits before collapsing; returning in time cancels it; `0` = immediate |
| `zen.stg.collapseMotion` | string | `swift` | collapse/expand motion: `off`, `swift`, `fold` or `cascade` |
| `zen.stg.motionSpeed` | int | `100` | speed of the motion presets, in percent (25-400); lower is slower, handy for comparing them |
| `zen.stg.updateCheck` | bool | `true` | asks GitHub for a newer release — shortly after a window opens, every few hours, when the computer wakes, and when the panel opens (metadata only) |
| `zen.stg.faviconColors` | bool | `true` | derives the group color from the site's favicon |
| `zen.stg.spaceScopedTabSwitch` | bool | `true` | prevents "switch to tab" from taking you out of the current Space |
| `zen.stg.systemGroup` | bool | `true` | `about:` and `chrome:` pages share one System group per Space |
| `zen.stg.looseTabsAtBottom` | bool | `true` | ungrouped tabs settle below the last group of their Space |
| `zen.stg.excludedDomains` | string | `""` | domains that are never grouped, comma-separated |
| `zen.stg.customRules` | string | `[]` | named rules, in JSON |
| `zen.stg.debugLog` | bool | `false` | writes diagnostics to `zstg-debug.log` in the profile |
| `zen.stg.colors` | string | `{}` | color persisted per key (managed by the script) |
| `zen.stg.groups` | string | `{}` | group id → key binding (managed by the script) |

Example of `customRules`:

```json
[
  { "name": "Dev", "domains": ["github.com", "stackoverflow.com"] },
  { "name": "Comms", "domains": ["slack.com", "discord.com"] }
]
```

Rules take precedence over the domain. Invalid JSON is ignored with a warning in
the console — domain-based grouping keeps working.

## Languages

English, Brazilian Portuguese and Spanish. By default the interface follows the
browser, matching by prefix: any `pt` variant — including European Portuguese —
gets Brazilian Portuguese, and a language with no translation gets English.
Pick one explicitly in the panel, or with `zen.stg.locale`.

English is the base language, not a translation of the others: it is the only one
required to be complete, and it is what a missing key falls back to. A key
missing everywhere shows up as the key itself, so a gap is visible instead of
silent.

Every visible string — panel, context menu and dialogs — lives in
`src/resources/zstg-i18n.mjs`, imported by both the panel and the chrome script.
To add a language:

1. Add its code to `LANGUAGES` and its own name to `LANGUAGE_NAMES`.
2. Copy the `en` object, translate the values, and add it to `CATALOG`.
3. Add the prefix to `chooseLanguage` if it should be picked automatically.
4. Run `node scripts/verify.mjs` — it fails if any language is missing a key.

## Commands

- **Right-click a tab → "Spacekeeper" → "Regroup this Space"**
- **Ctrl+Alt+A** regroups the current Space · **Ctrl+Alt+D** ungroups the current
  Space (**Cmd+Alt** on macOS)
- From the console (Ctrl+Shift+J; Cmd+Shift+J on macOS): `ZSTG.regroup()`, `ZSTG.ungroup()`,
  `ZSTG.collapseAll()`, `ZSTG.expandAll()`, `ZSTG.recoverOldGroups()`

`ZSTG.recoverOldGroups()` exists for migration: groups created by earlier versions
lack the internal marking and, without it, are neither reused nor reached by the
commands. The command recovers only groups whose tabs **all** produce the same key
— a thematic group of yours, with varied domains, is never recovered.

Shortcuts depend on the keyboard layout; on ABNT2 some `Ctrl+Alt` combinations do
not reach the browser. The context menu does not have that limitation.

## Tab switching across Spaces

Zen changed `switchToTabHavingURI` to look for tabs in **all** Spaces. The effect:
typing an address already open in another Space made the browser jump over there,
without opening any tab — it looked like a phantom click switching Space.

The project restricts that search to the current Space. Within the Space nothing
changes: jumping to an already open tab keeps working. It applies to every entry
point (address bar, bookmarks, history), and it can be turned off in
`zen.stg.spaceScopedTabSwitch`.

Essential tabs are candidates only when they declare no Space. In this version of
Zen essential tabs carry `zen-workspace-id`, and an essential tab from another
Space is precisely the case that pulled you out.

Two behaviors that are **not** from this project, and that confuse anyone
investigating:

- The active tab is never a switch target. Being on YouTube and asking for
  YouTube, Firefox opens a new tab — switching to where you already are would make
  no sense.
- With `browser.urlbar.secondaryActions.switchToTab` on (Firefox default), Enter
  navigates and the switch becomes a secondary button. For Enter to jump to the
  existing tab again, turn that pref off.

## Verification

```powershell
node scripts/verify.mjs
```

It runs anywhere PowerShell does — on macOS and Linux, install
[pwsh](https://github.com/PowerShell/PowerShell) and run
`node scripts/verify.mjs`. Node and the OpenSpec CLI are required; a missing tool
fails the run instead of silently passing with checks skipped.

It checks, without changing anything, whether the four layers are in sync: valid
specs in strict mode, every requirement anchored in the code, prefs documented in
the docs, script syntax, and the installed files identical to the repository's —
including the loader, which a Zen update tends to delete. It exits with code 1 if
anything diverges.

What it does **not** do: check behavior. It catches a requirement with no
implementation and an outdated file, not an implementation that is present and
wrong. For behavior, `ZSTG.selfTest()` in the console.

## Diagnostics

```js
ZSTG.inspect()            // per tab: Space, key, eligibility, current group
ZSTG.selfTest()           // derivation cases + invariants of the window's real state
ZSTG.keyFromText(url)     // which key a URL would produce
ZSTG.dumpStrip()          // the current Space's strip, in visual order
ZSTG.reloadConfig()       // re-reads the prefs
```

### Log file

With `zen.stg.debugLog` on, the script writes one JSON line per event to
`<profile>/zstg-debug.log`: initialization, recognition of restored groups, group
creation and movement, corrective passes with strip snapshots, and every tab
switch with the Space before and after.

It exists because the hardest moments to diagnose — session restore and group
recognition — happen before any console is open. The file is truncated once it
passes 1 MB, and entries older than a week are pruned at each startup, so leaving
it on does not grow a file forever nor hoard stale history; the guard's own
`guard.log` rotates past ~400 lines for the same reason. Write failures show
up in the console instead of being swallowed.

It ships **off**, and that is deliberate: every line records the site of the tab
involved, so the file amounts to a history of the sites you visit, in plain text
inside your profile. Turn it on to investigate something, not by default.

## Appearance

Zen only styles its native folders, so the project brings its own stylesheet
(`src/zen-space-tab-groups.uc.css`), applied **only** to the groups it creates.
Zen folders and groups you created are not affected.

- **Group color derived from the favicon.** The predominant color of the logo is
  approximated to the nearest native color: YouTube becomes red, dark logos become
  gray. The approximation is by hue, not by distance to fixed values, because the
  native colors change with the theme.
- **Hidden tab count** to the right of the row, when the group is collapsed. It
  counts hidden tabs, not the group's tabs — the active tab stays visible and does
  not enter the count.
- **Collapsed pulls back on emphasis:** the chip is dimmed instead of solid. What
  is hidden should not gain prominence.
- **Collapse motion presets** (`off`, `swift`, `fold`, `cascade`), chosen in the
  panel. The panel shows one animated thumbnail beside the choices that plays
  the selected preset once, so you know what to expect before feeling it on
  real tabs. The height each row animates through is measured from a real tab
  (published as `--zstg-row-cap`); Fold animates the whole group as one sheet
  behind a closing window, from a measured sheet height
  (`--zstg-sheet-measured`). The OS reduced-motion setting makes
  everything instant regardless of the preset. A speed field under the choices
  stretches every preset by the same factor — slow them down to compare, put
  100 back to live with one.

The taste adjustments live in variables at the top of the file:

| Variable | Effect |
| --- | --- |
| `--zstg-radius` | corners of the label chip |
| `--zstg-breathing` | vertical separation between groups |

**The colors are approximate by construction, not by defect.** The browser's native
groups accept a fixed palette of **nine colors**, so the color read from a logo is
snapped to the nearest one it contains. Sites with dark logos land on `gray`, and a
multicolored logo settles on whichever of its colors wins. An orange group for a red
logo is the feature working, not failing.

Classification is by hue rather than by distance to fixed values: the native colors
resolve differently under the light and dark themes, so a fixed table would be right
in one and wrong in the other, and a group would change color when you switched
themes.

## Updating

Open `about:spacekeeper`. If a newer release exists, a blue banner is already at
the top of the page naming the version you have and the one available, with
**Release notes** — which expand in place, for every release newer than yours —
and **Update**. Nothing is downloaded until you click Update, and updating never
touches your groups or your settings.

The check runs when the panel opens. That is one request to GitHub's release
endpoint, metadata only, and it is the same request the browser already makes on
its own a few seconds after a window opens and every few hours after that. Turning
`zen.stg.updateCheck` off stops all of it: the heartbeat, the pill, and the check
on open. With it off, the panel offers a manual **Check for updates** button
instead — the only case where that button appears, because with checking on the
answer is already on screen.

The alert over the sidebar opens the panel with the banner already filled in.

### Two banners, one place

The same position also carries the fault banner, in orange: **Zen is running an
older version than the one installed**. That happens when files are installed while
Zen is open — the browser keeps running what it loaded at startup. Its button
restarts with the startup cache cleared, which is what actually applies the new
version; restarting alone is not enough.

When both conditions hold, only the orange one is shown. Both end in a restart, and
updating while the browser runs older code writes files that will not take effect
either — so the restart comes first, and the update banner appears by itself
afterwards. The alert over the sidebar is unaffected either way.

## What the script never touches

Pinned tabs, essential tabs, native Zen folders, split view and **groups you
created by hand**. A regular group without the `zstg-key` marking is treated as
manual organization: it is not undone, and tabs inside it are not relocated.

## Manual verification checklist

The self-test covers key derivation and configuration. The scenarios below require
real tabs and must be checked by hand.

1. **Isolation between Spaces** — open `youtube.com` in Space A and then in Space B.
   There should be two independent `youtube` groups, and no tab should change
   Space.
2. **Background tab** — with Space A active, have a page open a Space B tab in the
   background. It should be grouped in Space B.
3. **Independence on close** — close all tabs of a group in one Space; the group
   with the same key in the other Space should remain.
4. **Native structures** — with an essential tab, a pinned one, a Zen folder and a
   split view open, run `ZSTG.regroup()`. None of that may change.
5. **Manual group** — create a group by hand, put a `youtube.com` tab in it and run
   `ZSTG.regroup()`. The group and the tab should stay where they are.
6. **Minimum tabs** — with `minTabs = 2`, the first tab of a domain stays loose and
   the second creates the group. Then close one: the group **must not** dissolve.
7. **Navigation** — navigate from `github.com` to `youtube.com` in the same tab: it
   changes group. Navigate between `github.com` pages: it does not move.
8. **Rename** — rename a group and open another tab of the same domain: it should
   enter the renamed group, without creating a new one.
9. **Colors** — change a group's color by hand, close its tabs and reopen the
   domain: the chosen color should come back.
10. **Collapse** — collapse a group and open another tab of the domain: it should
    stay collapsed.
11. **Focus mode** — with `focusMode = true` and `focusKeep = 1`, switch between
    tabs of different groups; only the active tab's group stays expanded (at the
    default `focusKeep = 3`, the three most recent stay open). Open a new tab
    (with no group): nothing may collapse.
12. **Master switch** — with `enabled = false`, opening tabs does not group, the
    existing groups remain and `ZSTG.regroup()` keeps working.

## Known limitations

- **Depends on internal Zen API** (`gZenWorkspaces`, `gBrowser.tabGroups`), which
  may change without notice between versions.
- **Groups do not persist across sessions** the way native folders do. They are
  rebuilt as tabs are restored — a consequence of using a regular group instead of
  a folder, a choice made so as not to pin every grouped tab.
- **Runs without a sandbox.** A chrome script has full privilege in the browser.
- **The panel page also runs with UI privilege.** `about:spacekeeper` reads and
  writes preferences directly, with no bridge between processes — which is why it
  is registered as trusted UI rather than as content. A script on that page has
  the same power over the browser that the mod does. The price is paid on the
  other side: the page is strictly local, loads no font, image or script from the
  network, and its CSP (`default-src chrome:`, with inline style allowed for its
  own code) blocks any network request that tried. Its logic ships as its own
  file, `zstg-panel.mjs`, loaded with `<script src="chrome://...">` rather than
  inline — Gecko's fixed baseline CSP for privileged "secure chrome UI" pages
  permits `chrome:` sources but not an inline `<script>` block.
- **One window at a time:** the script is window-scoped; each window keeps its own
  listeners.
- **Own styling for the collapse.** Zen only styles `zen-folder[collapsed]`; a
  regular group toggles the attribute and hides nothing. The project provides the
  stylesheet that fills that gap, restricted to the groups it creates. If Zen
  changes the internal structure of `tab-group`, the collapse will look broken
  again.
- **Migration between versions.** Changes to the group marking leave the previous
  ones unmarked; use `ZSTG.recoverOldGroups()` once after updating.

## Structure

```
CHANGELOG.md             one entry per released version; the release notes source
install.ps1              Windows installer: loader + mod, detects Zen and the profile
install.sh               the same installer for macOS and Linux
eslint.config.mjs        two rules: no-undef and no-unused-vars, nothing of style
package.json             dev tooling only (eslint); the mod has no dependencies
package-lock.json        pins that tooling
docs/                    this manual and the README's screenshots
src/                     script, stylesheet and panel (source of truth)
src/resources/           panel page, text catalog and core logic, over chrome://
scripts/verify.mjs       checks spec, code, docs and installation are in sync
vendor/fx-autoconfig/    vendored loader (MPL 2.0)
openspec/                specification and changes in progress
```

This project uses [OpenSpec](https://github.com/Fission-AI/OpenSpec): every
behavior change goes through a proposal in `openspec/changes/` before
implementation.

The living specification, the code and the in-flight proposals are in English.
The archived proposals under `openspec/changes/archive/` are in Portuguese: they
are the record of decisions already made, kept as they were written rather than
retranslated after the fact.

## Next steps

- The feature roadmap is empty by design: what comes next comes from daily
  use. In-flight proposals, when any exist, live in `openspec/changes/`.
