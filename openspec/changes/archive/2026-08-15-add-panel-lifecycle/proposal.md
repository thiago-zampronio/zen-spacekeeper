## Why

Uninstalling and updating currently require the installer — fine for whoever keeps
the one-liner around, invisible to everyone else. With the guard adding one more
persistent piece, removal must be effortless or the discomfort of "code that never
leaves" is real: the honest answer is one click inside the product itself. And once
the panel can manage the lifecycle, an explicit Update belongs there too.

## What Changes

- **Uninstall from `about:spacekeeper`**: one button, one confirmation, and the
  panel removes everything Spacekeeper put in the profile — mod files, guard
  watcher/script/cache — keeping today's rules: the loader stays (other mods may
  use it), the preferences stay (a reinstall finds the configuration).
- **Update from `about:spacekeeper`**: a user-initiated check against the
  repository's latest release, and a user-initiated update of the profile-side
  files from that release. Never automatic, never in the background: no check and
  no byte moves without a click.
- The no-network claim is re-scoped honestly everywhere it appears: nothing of
  Spacekeeper's touches the network **except the update action the user explicitly
  clicks** — which fetches from the same repository the install one-liner already
  trusts, pinned to a release tag, never a moving branch.

Out of scope:

- Automatic or scheduled update checks of any kind.
- Updating the loader in the application directory — when a release changes the
  loader, the update reports it and points at the installer, which owns elevation.
- Any change to the panel page's CSP: the fetch happens in the chrome script, not
  in the panel document, which keeps loading nothing remote.

## Capabilities

### New Capabilities

- `self-update`: the explicit, user-initiated check and update, their trust and
  scope rules, and what happens when the release also changed the loader.

### Modified Capabilities

- `control-panel`: uninstall and update controls, with confirmation and honest
  reporting.
- `loader-guard`: the guard's removal is invokable by the panel's uninstall (same
  outcome as the installer's).

Note: depends on `add-loader-guard` (and transitively on
`add-cross-platform-install`); must be applied and archived after them.

## Impact

- `src/zen-space-tab-groups.uc.mjs`: the update fetch/write (chrome script side),
  invoked from the panel; restart offer via UC_API when available.
- `src/resources/zstg-panel.html` and `zstg-i18n.mjs`: the two controls, their
  confirmations and result texts, in the three languages.
- `README.md`, installers' headers: the re-scoped network claim.
- `scripts/verify.ps1`: anchors for the new requirements.
