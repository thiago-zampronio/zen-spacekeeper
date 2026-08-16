## 1. Stylesheet

- [x] 1.1 Shared hiding mechanism: replace `display: none` with the animatable
      collapsed state (max-height + opacity + overflow + pointer-events per tab
      row), scoped to `tab-group[zstg-key]`, selected tab excluded
- [x] 1.2 Preset transition blocks keyed by the `zstg-motion` attribute:
      swift (110ms collapse / 140ms expand, opacity leads), fold (180/300,
      one-sheet), cascade (140 single-beat collapse / 200 expand with 30ms-per-row
      stagger capped at row 6, translateY(-10px) toward the chip) — spread
      widened after the field test: at fold 150/200 and a 15ms stagger the three
      presets were indistinguishable, a 40-60ms gap sits under the noticing
      threshold
- [x] 1.3 `prefers-reduced-motion: reduce` zeroes every preset's durations
- [x] 1.4 The animated cap is measured, not guessed: the script publishes a real
      row's height as `--zstg-row-cap` (re-measured on pref change), so the
      transition has no dead zone and the presets stay distinguishable — found
      in field testing, where a 4em cap crammed every preset into the same
      "beat, then vanish"
- [x] 1.5 Direction fixes from the slow-motion field test: Fold glides on
      ease-in-out in BOTH directions (its decelerate expand read as Swift's
      pop); Cascade gathers bottom-up on collapse (15ms per row via
      nth-last-child, half the expand step — its single-beat collapse read as
      Swift's), loose space closing with the last tucked row

## 2. Script

- [x] 2.1 Prefs `zen.stg.collapseMotion` (string: off|swift|fold|cascade, default
      swift) and `zen.stg.focusDelay` (int ms, default 800, 0 = immediate) in
      DEFAULTS/cfg; stamp `zstg-motion` on the system's groups, restamp on pref
      change
- [x] 2.2 Focus mode: per-group cancellable timers — collapse only if the group is
      still outside the keep-set when the timer fires; cancel on re-entry, clear
      on unload and when focus mode turns off
- [x] 2.3 Pref `zen.stg.motionSpeed` (int percent, default 100, clamped 25-400):
      published as the inverse to `--zstg-motion-scale` on the root, applied at
      startup and on pref change; every preset duration and stagger delay in the
      stylesheet multiplies by it — asked for by the user as a magnifying glass
      to judge the presets

## 3. Panel and docs

- [x] 3.1 One radio group of four (Off first, then Swift/Fold/Cascade) with the
      felt-trade captions from the product review; the focus-delay field; strings
      in three languages
- [x] 3.2 MANUAL pref table rows; version bump
- [x] 3.3 One animated preview beside the radio group, in the mockup style:
      plays the selected preset's collapse and expand once on selection change
      (mirroring the real durations and easings), rests expanded, instant under
      OS reduced motion; vertically centered against the list with a caption —
      top-aligned it sat in front of the first option and read as belonging
      to it
- [x] 3.4 Motion speed field under the radio group (percent, 25-400): the panel
      preview obeys it through the same scale factor and replays on change, so
      slowing down and watching is one gesture; strings in three languages;
      MANUAL pref row
- [x] 3.5 The Appearance card split in three — Appearance (color, language),
      Collapse motion (radios, preview, speed) and Focus mode (toggle, kept
      open, delay): one card holding all of it read as a single undifferentiated
      wall (user print)
- [x] 3.6 Number fields clamp on read, and cfg clamps focusKeep to 1-10: an
      out-of-range pref (800 typed into the wrong field) was displayed verbatim
      and silently neutered focus mode

## 4. Verification

- [x] 4.1 verify.ps1: the collapse anchor follows the new rule; anchors for the
      reduced-motion block and the preset attribute; EVERYTHING IN SYNC
- [ ] 4.2 In a running Zen: toggle the four presets back-to-back and feel the
      difference; the panel preview plays the selected preset once; collapse
      never gates clicks; quick return cancels the focus collapse;
      reduced-motion restores instant; native folders unaffected —
      user confirms and picks the shipping default by eye
