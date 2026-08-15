## Purpose

The panel becomes the place where Spacekeeper's whole lifecycle is managed: not
just configured, but updated and removed — one click, honestly reported.

## ADDED Requirements

### Requirement: One-click uninstall, after one confirmation

The panel SHALL offer an uninstall that, after an explicit confirmation stating
what will be removed and what will be kept, removes every file Spacekeeper put in
the profile — the mod files and, when installed, the guard's watcher, script and
cache — while keeping the loader and the preferences, and stating both.

Removal must not require finding an installer the user may have deleted the day
they installed. Making leaving easy is what makes staying trustworthy.

#### Scenario: Uninstalling from the panel

- **WHEN** the user clicks uninstall and confirms
- **THEN** the mod files are removed from the profile
- **AND** the guard's watcher, script and cache are removed when present
- **AND** the loader and the preferences are kept, and the result states both

#### Scenario: Declining the confirmation

- **WHEN** the user clicks uninstall and does not confirm
- **THEN** nothing is removed

#### Scenario: The running session

- **GIVEN** the uninstall completed
- **WHEN** the user keeps using the current session
- **THEN** the result states that the mod disappears on the next restart

### Requirement: Update controls report honestly

The panel SHALL offer the update check and the update action defined by the
self-update capability, SHALL show the outcome of each — up to date, update
available naming both versions, updated pending restart, or the exact failure —
and SHALL disclose next to these controls that they are the one action that
contacts the network.

#### Scenario: Up to date

- **WHEN** the user checks and the running version is the latest release
- **THEN** the panel states it is up to date, naming the version

#### Scenario: The disclosure is visible

- **WHEN** the user looks at the update controls
- **THEN** a plain-language note states that clicking them contacts the repository
- **AND** nothing else in the product does

### Requirement: A clean handover is offered, never imposed

The panel SHALL offer the full reset — dissolve every group the system created, in
every Space, clear the startup cache and restart the browser — without ever
imposing it, in the shape each flow calls for. In the uninstall flow the offer is a
checkbox on the single confirmation dialog, born checked, whose consequences —
including that the dissolved groups are NOT recreated, since the thing that would
recreate them is being removed — are stated in that dialog's body. In the update
flow the offer is a dialog shown only after the update succeeded, with explicit
button labels, where the restarting button SHALL NOT be the keyboard default (the
dialog appears asynchronously; a keystroke in flight must not restart the
browser). Dialog buttons SHALL carry action labels, never a bare OK. Declining, in
either flow, SHALL change nothing beyond showing the manual steps; a failed
operation SHALL discard the reset answer entirely.

Dissolving the groups is what makes structure changes safe: the next start finds no
group carrying an old marking, and the new version rebuilds the organization from
scratch (after an update) or the sidebar is simply clean (after an uninstall). Tabs
are never closed — only the system's own groups are dissolved; manual groups,
folders, pinned and essential tabs stay untouched, as always.

#### Scenario: Accepting the reset after an update

- **GIVEN** an update finished
- **WHEN** the user accepts the reset
- **THEN** every group the system created, in every Space, is dissolved
- **AND** no tab is closed and no tab changes Space
- **AND** the startup cache is cleared and the browser restarts
- **AND** the new version regroups on the next start

#### Scenario: Accepting the reset after an uninstall

- **GIVEN** an uninstall finished
- **WHEN** the user accepts the reset
- **THEN** every group the system created is dissolved before the restart
- **AND** the browser comes back without the mod and without its groups

#### Scenario: Declining the reset

- **WHEN** the user declines
- **THEN** nothing is dissolved and nothing restarts
- **AND** the manual steps (restart, startup cache) are shown
