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
