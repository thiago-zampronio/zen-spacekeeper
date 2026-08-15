## Purpose

The guard's removal gains a second entry point: the panel's uninstall reaches the
same end state as the installer's.

## ADDED Requirements

### Requirement: Removal is invokable from the panel

The guard's complete removal — watcher, schedule, script and cache — SHALL be
invokable by the panel's uninstall, and SHALL leave the same end state as the
installer's uninstall option.

Two entry points, one outcome: whichever the user finds first must not leave a
different machine behind.

#### Scenario: Panel uninstall removes the guard

- **GIVEN** the guard is installed
- **WHEN** the user uninstalls from the panel
- **THEN** the guard's watcher, schedule, script and cache are removed
- **AND** the end state equals the installer's uninstall
