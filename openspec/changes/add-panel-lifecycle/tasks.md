## 1. Chrome script

- [ ] 1.1 Update machinery: fetch the latest release version; fetch a tag's
      profile-side files into a staging directory; all-or-nothing swap; loader
      difference detected against the cache and reported, never applied
- [ ] 1.2 Uninstall machinery: remove mod files and invoke the guard's removal;
      keep loader and preferences
- [ ] 1.3 Restart offer via UC_API's cache-clearing restart when present, manual
      steps otherwise

## 2. Panel

- [ ] 2.1 Uninstall control: confirmation naming what goes and what stays; result
      states the session lives until restart
- [ ] 2.2 Update controls: check and update, outcomes (up to date / available with
      both versions / updated pending restart / failure with reason)
- [ ] 2.3 The network disclosure next to the update controls
- [ ] 2.4 Every new string in the catalog, three languages

## 3. Claims and docs

- [ ] 3.1 Re-scope the no-network claim in the README, both installers' headers
      and CLAUDE.md: the explicit update click is the one exception
- [ ] 3.2 README: uninstall and update documented as panel actions; installer
      remains the alternative

## 4. Verification

- [ ] 4.1 verify.ps1: anchors for the new requirements; language parity passes
- [ ] 4.2 In a running Zen: check when up to date; update across a real release;
      failed fetch leaves the install untouched; uninstall from the panel removes
      mod + guard and survives restart — user confirms
