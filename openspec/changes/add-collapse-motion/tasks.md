## 1. Stylesheet

- [ ] 1.1 Replace `display: none` with the animatable collapsed state (max-height +
      opacity + overflow + pointer-events per tab row), transition ~150-200ms
      ease-out, scoped to `tab-group[zstg-key]`
- [ ] 1.2 `prefers-reduced-motion: reduce` zeroes the durations
- [ ] 1.3 The animation-off attribute (stamped by the script from
      `zen.stg.collapseAnimation`) also zeroes them

## 2. Script

- [ ] 2.1 Prefs `zen.stg.collapseAnimation` (bool, default true) and
      `zen.stg.focusDelay` (int ms, default 800, 0 = immediate) in DEFAULTS/cfg;
      the attribute stamping on groups
- [ ] 2.2 Focus mode: per-group cancellable timers — collapse only if the group is
      still outside the keep-set when the timer fires; cancel on re-entry, clear
      on unload and when focus mode turns off

## 3. Panel and docs

- [ ] 3.1 Panel controls (animation toggle; delay field) with strings in three
      languages
- [ ] 3.2 MANUAL pref table rows; version bump

## 4. Verification

- [ ] 4.1 verify.ps1: the collapse anchor follows the new rule; a reduced-motion
      anchor; EVERYTHING IN SYNC
- [ ] 4.2 In a running Zen: collapse/expand animate; fast group-switching in focus
      mode no longer flickers; quick return cancels the collapse; reduced-motion
      and the pref restore instant behavior; native folders unaffected — user
      confirms and tunes duration/easing by eye
