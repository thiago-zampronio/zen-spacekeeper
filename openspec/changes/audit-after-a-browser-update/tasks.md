# Tasks

## 1. A report that does not need the debug log

- [x] 1.1 Add a report-once helper: one `console.error` per distinct message per session,
      plus the full entry in the debug log; verify: two identical reports produce one
      console line
- [x] 1.2 Route the broken-contract error through it; verify: the canary still names
      every missing point in a single error

## 2. Every move checks its own work

- [x] 2.1 Check the strip after the sink and after the rise, and report a move that
      changed nothing; verify: a forced no-op logs `moveDidNothing` with the two group
      names
- [x] 2.2 Check the loose-tab settle the same way; verify: the log entry names the tab's
      position before and after
- [x] 2.3 Leave the unnest path as it is, and say why in a comment: it already verifies
      its outcome and rebuilds the group when the move fails

## 3. The audit at the moment the browser changes

- [x] 3.1 Store the browser build in a new preference, and compare it at startup;
      verify: the log records the change once, and the same build is not audited twice
- [x] 3.2 Audit the first group that collapses after the change: are the non-selected
      rows really off the screen; verify: the log records how many rows were checked and
      how many were still visible
- [x] 3.3 Keep the audit read-only; verify: it calls nothing that creates, deletes or
      moves a group or a tab
- [x] 3.4 Report a group that still shows its tabs through the helper from task 1;
      verify: the message names the group and the count

## 4. The Zen fingerprint, as tooling

- [x] 4.1 Add `scripts/zen-snapshot.mjs`: extract the browser's own group markup and
      collapse selectors, plus a hash per source file; verify: running it twice in a row
      produces no diff
- [x] 4.2 Commit the first fingerprint under `vendor/`; verify: `node scripts/verify.mjs`
      passes and the file maps cite it

## 5. Documentation and sync

- [x] 5.1 Document the new preference and the two new log entries in `docs/MANUAL.md`;
      verify: `node scripts/verify.mjs` passes
- [ ] 5.2 Add the `CHANGELOG.md` entry at release time, with the version bump (the
      `release` skill); verify: `node scripts/verify.mjs` passes

## 6. Needs a running browser (check only after the user confirms the test)

- [x] 6.1 With the stored build forced to an old value, the audit runs on the first
      collapse and records its result
- [ ] 6.2 Nothing in the strip moves because of the audit
- [ ] 6.3 With the debug log off, a forced failure still reaches the console

Measured in the browser, from `zstg-debug.log`:

- a build never seen before logs `browserChanged` and then exactly one `renderAudit`
  (`rows: 4, visible: 0`), and the build is stored
- the same build again produces no `browserChanged` and no `renderAudit`, across seven
  collapse events
- no `moveDidNothing` while the three moves work

Two defects of this change were found by that test and fixed: the audit was scheduled
once per restored group instead of once per browser change, and the new preference was
read through `cfg()`, which is an explicit list and never carried it — so every start
looked like a new browser.

Task 6.1 is checked on the measurement above. 6.2 and 6.3 stay open: nobody watched the
strip during an audit, and nobody has seen the console with the debug log switched off.

The fingerprint tool deliberately excludes `tabbrowser.js`, where the move calls live:
Zen's optimized archive does not expose that entry reliably — `unzip` by name, `unzip`
by glob, `bsdtar`, a local-header walk and a raw text search all fail or disagree
between runs. The move calls are covered at runtime instead, by the canary probe and by
the post-condition from section 2.
