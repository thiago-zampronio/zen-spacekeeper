## Why

Loose tabs — the ones with no group — end up sandwiched between groups as groups
form around them, and finding them means scanning the whole sidebar. They should
have one predictable place: below every group.

## What Changes

- Within each Space, ungrouped eligible tabs are kept **below the last group**:
  whenever the system organizes (a tab opens, navigates, is regrouped), loose tabs
  that sit above or between groups are moved down, within their Space, preserving
  their relative order.
- What is never moved: pinned tabs, essential tabs, Zen folders and their
  contents, tabs inside manual groups, and tabs in Spaces the organization is not
  touching. No tab ever changes Space (the invariant, as always).
- A preference (`zen.stg.looseTabsAtBottom`, default on) turns it off, with a
  toggle in the panel.

Out of scope:

- Ordering the groups themselves (they keep their creation/manual order).
- Sorting the loose tabs (their relative order is preserved, only their region
  changes).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `tab-grouping`: new requirement — loose tabs live below the groups, gated by the
  preference.

## Impact

- `src/zen-space-tab-groups.uc.mjs`: a settle pass after organization; pref +
  config.
- Panel + `zstg-i18n.mjs`: the toggle, three languages.
- `README.md`: pref table row.
- Depends on Zen's tab-move APIs behaving within per-Space containers — the design
  flags this as the risk to iterate in a running browser.
