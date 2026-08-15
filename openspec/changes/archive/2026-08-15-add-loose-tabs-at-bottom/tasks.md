## 1. Script

- [x] 1.1 `settleLooseTabs(spaceId)`: detect misplaced loose eligible tabs by DOM
      order against the Space's last group; move them after it, preserving relative
      order, via the browser's tab-move API; one debug-log event per move
- [x] 1.2 Run the settle after organize, regroup and the reclaim passes, gated by
      the preference
- [x] 1.3 Pref `zen.stg.looseTabsAtBottom` (default true) in DEFAULTS and cfg()

## 2. Panel and docs

- [x] 2.1 Panel toggle in the Grouping section; strings in three languages
- [x] 2.2 README pref table row; version bump

## 3. Verification

- [x] 3.1 verify.ps1 anchors; EVERYTHING IN SYNC
- [x] 3.2 In a running Zen: a loose tab wedged between groups settles to the
      bottom on the next organization; order among loose tabs preserved; pinned/
      essential/folders/manual untouched; toggle off stops it — user confirms
