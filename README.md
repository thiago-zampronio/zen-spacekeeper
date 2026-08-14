# Spacekeeper

Automatic domain-based tab grouping in the **Zen Browser**, with the Space
(workspace) as a first-class boundary: a `youtube` group in the "Personal" Space
and a `youtube` group in the "Work" Space are independent groups, and no tab
changes Space because of the organization.

## Why this is neither an extension nor a Zen Mod

It is a **userscript** — a privileged chrome script (`.uc.mjs`) loaded by
fx-autoconfig. That is the same category as the scripts people install through
[Sine](https://github.com/CosmoCreeper/Sine), and it is deliberately not one of
the other two:

| | Extension (`.xpi`) | Zen Mod | Userscript (this) |
| --- | --- | --- | --- |
| Runs JavaScript | yes, sandboxed | **no** | yes, privileged |
| Sees Spaces | **no** | n/a | yes |
| Installation | `about:addons` | mod store | one PowerShell command |

- The WebExtensions API (`browser.tabs.group()`) does not expose the concept of a
  Space. An extension cannot read or choose a tab's Space — that is why tools like
  Auto Tab Groups drag tabs across Spaces.
- Zen Mods load exactly two files per mod, `chrome.css` and `preferences.json`
  (see `ZenMods.mjs`). There is no JS execution, and CSS does not listen for
  `TabOpen` nor call `gBrowser.addTabGroup`.

What is left is a privileged chrome script (`.uc.mjs`) loaded by
[fx-autoconfig](https://github.com/MrOtherGuy/fx-autoconfig), vendored in
`vendor/fx-autoconfig/` (MPL 2.0).

## Installation

Windows, in PowerShell:

```powershell
irm https://raw.githubusercontent.com/thiago-zampronio/zen-spacekeeper/main/install.ps1 | iex
```

Windows will ask for administrator once — the fx-autoconfig loader has to be
written into Zen's program folder. Everything else goes into your profile and
needs no privilege.

Then: close Zen, open `about:support` and click **Clear startup cache**. Without
that, Zen ignores the freshly installed loader. Reopen it and go to
`about:spacekeeper`.

To confirm it loaded, **Ctrl+Shift+J** shows
`[ZSTG] 0.16.0 ready — active Space …`.

The installer finds Zen and your profile on its own, reading `profiles.ini`
rather than guessing — if you have more than one profile, it picks the one Zen
actually uses. Override it when needed:

```powershell
.\install.ps1 -ProfileDir "C:\path\to\profile" -ZenDir "C:\path\to\Zen Browser"
```

From a clone, `.\install.ps1` uses the local files instead of downloading.

Other flags:

```powershell
.\install.ps1 -Check       # what is installed, and what a Zen update removed
.\install.ps1 -Uninstall   # removes the mod, keeps the loader and your settings
```

## After every Zen update

**Every Zen update replaces the installation directory and deletes the loader.**
This has already been observed in practice: a staged update was applied on a
restart and removed `config.js` and `defaults/pref/config-prefs.js`.

Symptom: the mod simply stops loading, with no error. Diagnosis and fix are the
same command:

```powershell
.\install.ps1 -Check   # tells you what is missing
.\install.ps1          # puts it back
```

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

| Pref | Type | Default | Effect |
| --- | --- | --- | --- |
| `zen.stg.enabled` | bool | `true` | turns on automatic organization (manual commands remain available when off) |
| `zen.stg.groupBySubdomain` | bool | `false` | `mail.google.com` separate from `drive.google.com` |
| `zen.stg.subdomainDomains` | string | `""` | sites split by subdomain, comma-separated (the rest of the web is unaffected) |
| `zen.stg.subdomainLabel` | string | `host` | name shown when a site is split: `host` (`mail.google`) or `sub` (`mail`) |
| `zen.stg.locale` | string | `auto` | interface language: `auto`, `en`, `pt-BR` or `es` |
| `zen.stg.minTabs` | int | `1` | minimum tabs with the same key to create a group |
| `zen.stg.focusMode` | bool | `false` | keeps only the most recently used groups open |
| `zen.stg.focusKeep` | int | `3` | how many groups focus mode keeps open (`1` = only the active one) |
| `zen.stg.faviconColors` | bool | `true` | derives the group color from the site's favicon |
| `zen.stg.spaceScopedTabSwitch` | bool | `true` | prevents "switch to tab" from taking you out of the current Space |
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
4. Run `.\scripts\verify.ps1` — it fails if any language is missing a key.

## Commands

- **Right-click a tab → "Spacekeeper" → "Regroup this Space"**
- **Ctrl+Alt+A** regroups the current Space · **Ctrl+Alt+D** ungroups the current Space
- From the console (Ctrl+Shift+J): `ZSTG.regroup()`, `ZSTG.ungroup()`,
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
.\scripts\verify.ps1
```

It checks, without changing anything, whether the four layers are in sync: valid
specs in strict mode, every requirement anchored in the code, prefs documented in
the README, script syntax, and the installed files identical to the repository's —
including the loader, which a Zen update tends to delete. It exits with code 1 if
anything diverges.

What it does **not** do: check behavior. It catches a requirement with no
implementation and an outdated file, not an implementation that is present and
wrong. For behavior, `ZSTG.selfTest()` in the console.

## Diagnostics

```js
ZSTG.inspect()            // per tab: Space, key, eligibility, current group
ZSTG.selfTest()            // 16 assertions about key derivation and configuration
ZSTG.keyFromText(url)   // which key a URL would produce
ZSTG.reloadConfig()  // re-reads the prefs
```

### Log file

With `zen.stg.debugLog` on, the script writes one JSON line per event to
`<perfil>/zstg-debug.log`: initialization, recognition of restored groups, group
creation and movement, and every tab switch with the Space before and after.

It exists because the hardest moments to diagnose — session restore and group
recognition — happen before any console is open. The file is truncated once it
passes 1 MB, and write failures show up in the console instead of being swallowed.

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

The taste adjustments live in variables at the top of the file:

| Variable | Effect |
| --- | --- |
| `--zstg-raio` | corners of the label chip |
| `--zstg-respiro` | vertical separation between groups |

Limitation inherited from the browser: the native group accepts **nine colors**.
Sites with dark logos collide on `gray`, and multicolored logos (like Google's)
always pick arbitrarily among their colors.

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
11. **Focus mode** — with `focusMode = true`, switch between tabs of different
    groups; only the active tab's group stays expanded. Open a new tab (with no
    group): nothing may collapse.
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
  network, and its CSP (`default-src chrome:`) blocks any request that tried.
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
install.ps1              installer: loader + mod, detects Zen and the profile
src/                     script, stylesheet and panel (source of truth)
src/resources/           panel page and text catalog, served over chrome://
scripts/verify.ps1       checks spec, code, docs and installation are in sync
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

## License

MIT — see [LICENSE](LICENSE). `vendor/fx-autoconfig/` is a vendored third-party
copy under MPL 2.0 and keeps its own license.

## Next steps

- Rounded corners on the group container (it is CSS — probably a `chrome.css` or a
  real Zen Mod, not JS).
- Catch-all group for tabs that do not form a group of their own.
- Configurable delay in focus mode.
