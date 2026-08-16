# Tasks

## 1. Script

- [x] 1.1 Prefs `zen.stg.focusStrategy` ("groups" | "idle", default "groups"),
      `zen.stg.focusIdleMinutes` (int, default 60, clamped 1-1440) and
      `zen.stg.focusReorder` (bool, default false) in DEFAULTS/cfg and the
      pref observer; `focusMode`/`focusKeep`/`focusDelay` untouched (names are
      stored identity)
- [x] 1.2 Idle strategy: `groupLastTouch` Map updated on TabSelect / TabOpen /
      TabClose for tabs in our groups and on chip-expand; unseen groups seeded
      with "now" at first sight; a 30s sweep collapses groups past the window,
      never the active tab's group, through the normal collapse path (motion
      presets apply); Map entries cleared when groups die; sweep and clocks
      torn down on unload
- [x] 1.3 Groups strategy keeps today's mechanics untouched (`recentGroups`,
      `focusKeep`, cancellable `focusDelay` timers), now gated on the strategy
      choice
- [x] 1.4 Reorder (owner-corrected semantics: the event is collapse/expand,
      never tab focus): `resettleGroupOrder` from the group collapse/expand
      listener keeps open groups above collapsed ones — a closing group sinks
      below the last open group, an opening group rises above the first
      collapsed one; minimal moves preserving in-cluster order, native move
      only, skip-and-log on failure, never from TabMove; debug logs
      `focusSink`/`focusRise`

## 2. Panel and strings

- [x] 2.1 The Focus mode card becomes one radio group of three — Off / Max
      groups at once / Max idle time — writing `focusMode` + `focusStrategy`
      together; a pre-strategies profile with focus on lands on Max groups
- [x] 2.2 Per-strategy fields: Groups kept open + Focus close delay shown for
      the groups strategy, Idle minutes for the idle strategy, the Active
      groups on top toggle enabled with either; disabled-state sync in the
      `syncFocus` pattern; the focus mockup preview follows the choice
- [x] 2.3 Strings in three languages for the strategy names, captions, idle
      field and reorder toggle; MANUAL pref table rows and focus section
      rewrite

## 3. Verification

- [x] 3.1 verify.ps1 anchors: strategy pref, idle sweep, reorder guard;
      `openspec validate --all`; EVERYTHING IN SYNC
- [ ] 3.2 In a running Zen (user confirms): the three-way choice switches
      behavior live; idle window collapses an untouched group and a touch
      resets it; the active group never retires; with reorder on, closing a
      group sinks it below the open ones and opening lifts it back, tab focus
      alone never reorders, drags are never fought; upgrade from focus-on
      lands on Max groups
