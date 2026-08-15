## 1. Stylesheet

- [x] 1.1 Shared hiding mechanism: replace `display: none` with the animatable
      collapsed state (max-height + opacity + overflow + pointer-events per tab
      row), scoped to `tab-group[zstg-key]`, selected tab excluded
- [x] 1.2 Preset transition blocks keyed by the `zstg-motion` attribute:
      swift (110ms collapse / 140ms expand, opacity leads), fold (150/200,
      one-sheet), cascade (140 single-beat collapse / 180 expand with 15ms-per-row
      stagger capped at row 6, translateY(-6px) toward the chip)
- [x] 1.3 `prefers-reduced-motion: reduce` zeroes every preset's durations
- [x] 1.4 The animated cap is measured, not guessed: the script publishes a real
      row's height as `--zstg-row-cap` (re-measured on pref change), so the
      transition has no dead zone and the presets stay distinguishable — found
      in field testing, where a 4em cap crammed every preset into the same
      "beat, then vanish"

## 2. Script

- [x] 2.1 Prefs `zen.stg.collapseMotion` (string: off|swift|fold|cascade, default
      swift) and `zen.stg.focusDelay` (int ms, default 800, 0 = immediate) in
      DEFAULTS/cfg; stamp `zstg-motion` on the system's groups, restamp on pref
      change
- [x] 2.2 Focus mode: per-group cancellable timers — collapse only if the group is
      still outside the keep-set when the timer fires; cancel on re-entry, clear
      on unload and when focus mode turns off

## 3. Panel and docs

- [x] 3.1 One radio group of four (Off first, then Swift/Fold/Cascade) with the
      felt-trade captions from the product review; the focus-delay field; strings
      in three languages
- [x] 3.2 MANUAL pref table rows; version bump
- [x] 3.3 One animated preview beside the radio group, in the mockup style:
      plays the selected preset's collapse and expand once on selection change
      (mirroring the real durations and easings), rests expanded, instant under
      OS reduced motion

## 4. Verification

- [x] 4.1 verify.ps1: the collapse anchor follows the new rule; anchors for the
      reduced-motion block and the preset attribute; EVERYTHING IN SYNC
- [ ] 4.2 In a running Zen: toggle the four presets back-to-back and feel the
      difference; the panel preview plays the selected preset once; collapse
      never gates clicks; quick return cancels the focus collapse;
      reduced-motion restores instant; native folders unaffected —
      user confirms and picks the shipping default by eye
