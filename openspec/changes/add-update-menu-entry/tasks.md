## 0. Installer plumbing — prerequisite of the loader hand-off

Not decoration: without the ref option the hand-off would fetch from a branch, which
the requirement *Updates come from a release, not a branch* forbids.

- [x] 0.1 Add an explicit ref option to `install.sh` and `install.ps1` so a caller
      can pin a release tag, and route `fetch()` (`install.sh:585`) through it
- [x] 0.2 Route the Windows self-elevation re-download (`install.ps1:576`) through
      the same ref, so the elevated child cannot come from a different source than
      the parent
- [x] 0.3 Add a non-interactive flag to both installers, so a headless run takes its
      defaults by contract rather than through the `</dev/tty ||` and `Read-Host`
      catch paths it relies on today
- [x] 0.4 Keep `verify.mjs`'s installer checks green — both installers must still
      declare the same options and the docs must document every one of them

## 1. The reinstall entry point

- [x] 1.1 Add a `reinstallLatest()` in `src/zen-space-tab-groups.uc.mjs` that
      resolves the latest release tag and calls the existing `applyUpdate(tag)`
      with it, with no version comparison anywhere in the path
- [x] 1.2 Confirm by reading that no version gate lives inside `applyUpdate` itself
      (it is in the callers), so nothing has to be refactored out of it — if one is
      found there, extract it rather than duplicating the writer
- [x] 1.3 Expose `reinstallLatest` on the `window.ZSTG` object so it is reachable
      from the console as a last resort, alongside `applyUpdate`

## 2. The menu entry

- [x] 2.1 Insert a menuitem into the menu returned by
      `UC_API.Scripts.getScriptMenuForDocument(document)`, carrying our own id and
      **no** `data-filename` attribute (the loader's shared popup listener falls
      through to `toggleScript` for anything that has one)
- [x] 2.2 Append at the end of `#menuUserScriptsPopup`, leaving the loader's own
      block untouched — the menu is built once per window and never regenerated
      (`boot.sys.mjs:553-558`, listener `{once: true}` at `:543-545`), so no
      anti-duplication guard is needed
- [x] 2.3 Make the entry unconditional — present whenever the mod is loaded,
      regardless of `zen.stg.updateCheck` and regardless of whether an update exists
- [x] 2.4 Remove the entry when the window closes, matching how the panel's address
      registration is undone

## 3. Confirmation, results and the loader hand-off

- [x] 3.1 Show the confirmation with `UC_API.Notifications.show`, naming the release
      about to be installed and stating that current files will be overwritten
- [x] 3.2 Wire Cancel to write nothing and fetch nothing
- [x] 3.3 Point at where the published notes can be read, without reproducing them
- [x] 3.4 Report success, and offer the existing `restartToApply`
- [x] 3.5 Report failure with its reason, and confirm by reading that
      `applyUpdate`'s rollback left the previous files in place
- [x] 3.6 When `applyUpdate` returns `loaderChanged`, offer to run the installer;
      keep the current message as the fallback when the launch cannot be performed
- [x] 3.7 Implement the installer launch with `Subprocess.sys.mjs` for the three
      platforms (`install.sh` on macOS and Linux, `install.ps1` on Windows), passing
      the ref option from task 0.1 with the same release tag the files came from,
      plus the non-interactive flag from 0.3

## 4. Texts

- [x] 4.1 Add every new string to `src/resources/zstg-i18n.mjs` in all three
      languages — `verify.mjs` fails on a key missing from any of them
- [x] 4.2 Keep all of it out of the chrome script: no user-visible literal outside
      the catalog

## 5. Specification and documentation

- [x] 5.1 Add an anchor in `scripts/verify.mjs` for
      `self-update/repair does not depend on the panel`
- [x] 5.2 Document the repair route in `docs/MANUAL.md`, including its limit: it
      cannot help a profile whose chrome script does not load
- [x] 5.3 Rewrite the panel's network disclosure string in `zstg-i18n.mjs`, all
      three languages: it currently ends "This is the only thing in the whole
      product that touches the network", which the repair makes false. It must name
      the repair and say that `zen.stg.updateCheck` does not silence it
- [x] 5.6 Check every other place that enumerates what touches the network —
      `docs/MANUAL.md` and `README.md` — and correct any claim the repair falsifies
- [x] 5.4 Run `node scripts/verify.mjs` and get EVERYTHING IN SYNC
- [x] 5.5 Run the vitest suite and keep it green

## 6. Needs a running browser — check only after the user confirms

These cannot be verified by reading code. Leave them unchecked until the user says
they tested it.

- [x] 6.1 The entry appears in Tools > userScripts, and is still there after opening
      and closing the menu several times — confirmed on Zen/macOS: three separate
      activations in one session, each necessarily a fresh menu open, no
      `repairEntryUnavailable` in the log
- [x] 6.2 Clicking the entry shows the confirmation; Cancel writes nothing —
      confirmed: three `repairConfirm`, two `repairCancelled`, and zero `updated`
      events after the session's `started` at 13:06:10
- [x] 6.3 Confirming reinstalls over an **already current** installation, and the
      restart offer appears — confirmed on Zen/macOS: running 0.59.1, installed
      0.59.1, reinstalled anyway with no version gate (D2), and the user restarted
      through the offered button, so `restartToApply` succeeded and the
      `repair.restartUnavailable` fallback was never reached
- [x] 6.4 The repair works with `about:spacekeeper` deliberately broken — the case
      this exists for. Confirmed on Zen/macOS: `zstg-panel.mjs` removed from the
      profile, the panel rendered as a bare title, the menu repair was the only way
      in, and it restored the panel without the panel ever being usable.
      `repairConfirm` 13:12:25 → `updated` 13:12:37, `files: 6`
- [x] 6.5 The entry is present with `zen.stg.updateCheck` set to false — confirmed
      by the user on Zen/macOS, and the log shows no request accompanied the menu
      opening
- [x] 6.6 A failure midway leaves the previous files in place and reports the reason
      — confirmed on Zen/macOS by making `chrome/resources` read-only, so the commit
      loop moved the script and the stylesheet and then failed on the third file.
      The bar named `NS_ERROR_FILE_ACCESS_DENIED`. All six files ended byte-identical
      (sha256 before/after), and the rollback is proven distinct from "nothing was
      written": the two moved files carry a LATER mtime than the untouched third,
      which is the signature of having been replaced and restored
- [ ] 6.7 The loader hand-off launches the installer on Windows, including whether
      the UAC prompt appears at all when the parent is not a console, and whether a
      cancelled UAC throws out of the second `Start-Process` (`install.ps1:582-585`,
      which carries no `-ErrorAction SilentlyContinue`)
- [ ] 6.8 The same hand-off on macOS and on Linux (WSL)
- [ ] 6.9 The installer run headless takes its defaults and completes — the
      non-interactive path from task 0.3, on each platform
