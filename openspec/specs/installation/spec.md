# installation Specification

## Purpose
Put the mod and the loader it depends on into a working state on Windows, macOS and
Linux, finding the browser and the profile the browser actually uses, and reporting
plainly whenever it cannot.

## Requirements

### Requirement: The guard is offered, never imposed

The installers SHALL install the guard only when explicitly requested by an
option, SHALL state what will be created (the watcher and the cache) before
creating it, and SHALL keep the plain install unchanged for everyone who does not
ask.

#### Scenario: Plain install

- **WHEN** the user runs the installer without the guard option
- **THEN** the install behaves exactly as today
- **AND** no watcher, schedule or cache is created

#### Scenario: Guard requested

- **WHEN** the user runs the installer with the guard option
- **THEN** the output states what will be created and where
- **AND** the watcher and the profile-side cache are installed

#### Scenario: Check reports the guard

- **WHEN** the user runs the check option
- **THEN** the guard's state is reported as its own part
- **AND** an installed guard whose watcher or cache is missing is reported as broken

#### Scenario: Uninstall removes the guard

- **WHEN** the user runs the uninstall option
- **THEN** the guard's watcher, schedule and cache are removed with the mod
- **AND** the loader keeps today's rule of being left in place
