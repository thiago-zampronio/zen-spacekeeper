## ADDED Requirements

### Requirement: The check notices code older than the installation

The system SHALL, when reporting installation state, determine whether the browser
has been running since before the current files were installed, and SHALL report
that condition together with the remedy.

Every existing check compares files to files, and all of them are satisfied the
moment the copy succeeds. Installing while the browser is open is the ordinary case,
not an edge one, and it leaves the browser executing the previous version with every
report saying the installation is complete — which it is. The missing question is
not whether the files arrived but whether they are the ones in use.

#### Scenario: Installed while the browser was running

- **GIVEN** the browser has been running since before the files were installed
- **WHEN** the user asks the installer to check the installation
- **THEN** the report states that the browser is running an earlier version
- **AND** it states that restarting and clearing the startup cache resolves it

#### Scenario: Browser started after the installation

- **GIVEN** the browser was started after the files were installed
- **WHEN** the user asks the installer to check the installation
- **THEN** nothing is reported about staleness

#### Scenario: Browser not running

- **GIVEN** the browser is not running
- **WHEN** the user asks the installer to check the installation
- **THEN** nothing is reported about staleness

Nothing is running, so nothing can be stale; reporting a warning here would train the
user to ignore it.

#### Scenario: The installation time is known independently of the copied files

- **WHEN** the installer records that an installation happened
- **THEN** the record does not depend on the timestamps of the copied files

The copy preserves each source file's own modification time, so the deployed files
carry the timestamps of the checkout rather than of the install. Reading them would
answer a different question and, on a fresh clone, would answer it wrongly.
