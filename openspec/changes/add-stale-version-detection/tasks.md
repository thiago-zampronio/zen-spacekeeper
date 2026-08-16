## 1. The script notices

- [ ] 1.1 Read the installed script file at startup and extract its version
- [ ] 1.2 Compare it against the compiled-in `VERSION`
- [ ] 1.3 Record the outcome in the log whether or not they differ
- [ ] 1.4 Treat an unreadable or unparsable file as "cannot tell", never as a mismatch
- [ ] 1.5 Defer the read so a missing `IOUtils`/`PathUtils` cannot take the script down
- [ ] 1.6 Expose the outcome on the public surface for the panel to read

## 2. The panel says it

- [ ] 2.1 A banner stating the running version, the installed version and the remedy
- [ ] 2.2 The remedy names both the restart and the startup cache
- [ ] 2.3 The banner is not dismissible and clears only when the condition ends
- [ ] 2.4 Preference controls keep working while the banner is shown
- [ ] 2.5 Split "not connected to a browser window" from "the mod is not loaded here"
- [ ] 2.6 New texts in English, Brazilian Portuguese and Spanish

## 3. The installer warns

- [ ] 3.1 Write an install marker at install time, in both installers
- [ ] 3.2 `--check` compares the browser's start time against the marker
- [ ] 3.3 Report staleness with the remedy; stay silent when the browser is not running
- [ ] 3.4 Stay silent when the browser started after the install
- [ ] 3.5 A missing or unreadable marker reports nothing, not a warning
- [ ] 3.6 `--uninstall` removes the marker
- [ ] 3.7 Keep the wording identical between the two installers

## 4. Verification tooling

- [ ] 4.1 Anchors in `verify.ps1` for the three layers
- [ ] 4.2 `verify.ps1` checks the staleness wording matches between the installers
- [ ] 4.3 Catalog parity across the three languages still passes

## 5. Documentation

- [ ] 5.1 Document the mismatch banner and what it means
- [ ] 5.2 Document that `--check` reports staleness, and what it cannot know

## 6. Verification on a real machine

Needs a running browser, and the mismatch has to be produced deliberately.

- [ ] 6.1 Install an older version, start Zen, install the current one: the log
      records the mismatch without any user action
- [ ] 6.2 The panel names both versions and the remedy
- [ ] 6.3 Following the remedy clears the banner
- [ ] 6.4 With versions in agreement, no banner and a recorded agreement in the log
- [ ] 6.5 `--check` reports staleness in the same scenario, and stays quiet once Zen
      has been restarted
- [ ] 6.6 `--check` stays quiet with Zen closed
- [ ] 6.7 The panel's two "cannot reach the mod" states show their own messages
- [ ] 6.8 Windows, macOS and Linux: the installer half behaves the same
