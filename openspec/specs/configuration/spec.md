# configuration Specification

## Purpose
Keep the organizer's configuration persistent across sessions, applicable without
restarting the browser and resilient to malformed values.

## Requirements

### Requirement: Persistent configuration

The system SHALL store its configuration in the browser preferences, so that
settings survive a restart.

#### Scenario: Setting survives a restart

- **GIVEN** the user has disabled subdomain grouping
- **WHEN** the browser is restarted
- **THEN** subdomain grouping remains disabled

### Requirement: Real-time application

The system SHALL apply configuration changes without requiring a browser restart.

#### Scenario: Toggling an option with the browser open

- **GIVEN** the browser is open
- **WHEN** the user changes the subdomain grouping preference
- **THEN** the next organized tab uses the new value

### Requirement: Master enable key

The system SHALL provide a preference that disables all automatic organization,
without undoing groups that already exist.

#### Scenario: Disabling automatic organization

- **GIVEN** groups already exist in the Space
- **WHEN** the user disables automatic organization
- **AND** opens a new tab
- **THEN** the tab is not grouped
- **AND** existing groups remain as they are

#### Scenario: Manual commands remain available

- **GIVEN** automatic organization is disabled
- **WHEN** the user triggers the regroup Space command
- **THEN** the command runs normally

### Requirement: Diagnostic logging

The system SHALL log relevant organization events to a file, SHALL allow that
logging to be turned off by preference, and a logging failure SHALL NOT
interrupt organization.

This exists because the hardest moments to diagnose — session restore and
group recognition — happen before any console is open.

#### Scenario: Events are logged

- **GIVEN** logging is enabled
- **WHEN** the system initializes and creates a group
- **THEN** the log file contains the initialization and the group creation

#### Scenario: A logging failure interrupts nothing

- **GIVEN** the log file cannot be written
- **WHEN** the system organizes tabs
- **THEN** organization happens normally
- **AND** the logging failure is reported in the console

#### Scenario: Logging turned off

- **GIVEN** logging is disabled
- **WHEN** the system organizes tabs
- **THEN** nothing is written to the file

### Requirement: Tolerance of invalid configuration

The system SHALL, upon encountering a malformed configuration value, use that
preference's default value and SHALL continue operating.

#### Scenario: Malformed custom rules

- **GIVEN** the custom rules preference contains text that is not valid JSON
- **WHEN** the system loads the configuration
- **THEN** no custom rule is applied
- **AND** domain grouping keeps working

#### Scenario: Invalid minimum tabs

- **GIVEN** minimum tabs is configured as zero or negative
- **WHEN** the system loads the configuration
- **THEN** the default value is used
