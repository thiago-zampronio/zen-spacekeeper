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

### Requirement: The log file does not grow without end

The system SHALL bound the size of the diagnostic log, clearing it and starting
over once it passes that bound.

A diagnostic left on and forgotten must not become a file that grows for as long as
the browser is used. Bounding it is what makes leaving it on an acceptable thing to
suggest.

#### Scenario: The bound is reached

- **GIVEN** diagnostic logging is enabled
- **AND** the log has passed its size bound
- **WHEN** the system records another event
- **THEN** the file is cleared and recording continues
- **AND** logging keeps working from that point on

#### Scenario: The bound is documented where it is offered

- **WHEN** the user is offered the option to enable logging
- **THEN** the explanation states that the file is bounded and starts over

### Requirement: The log states what it records

The system SHALL, where diagnostic logging is offered, state that each entry
records the site of the tab involved, and SHALL keep the option disabled by
default.

Because every entry names a site, the file amounts to a history of the sites
visited, in plain text inside the profile. That is a decision the user has to take
deliberately, not a default they discover later.

#### Scenario: Default state

- **GIVEN** a fresh installation
- **WHEN** the user inspects the logging option
- **THEN** it is disabled

#### Scenario: What the file contains is stated up front

- **WHEN** the user is offered the option to enable logging
- **THEN** the explanation states that the file records the sites of the tabs
  involved
- **AND** it states where the file is written

### Requirement: The log records sites, not addresses

The system SHALL record in the diagnostic log at most the host of any address
involved in an event, and SHALL NOT record a full address with path or query.

The documentation states that each entry records the site of the tab involved. A
full address can carry query-string tokens and paths that identify documents, which
is a materially different privacy exposure than a hostname.

#### Scenario: A tab switch is logged

- **GIVEN** diagnostic logging is enabled
- **WHEN** an event involving an address is recorded
- **THEN** the entry contains at most the host of that address

#### Scenario: The address cannot be parsed

- **WHEN** an event's address cannot be parsed
- **THEN** the entry records no part of the raw input in its place

### Requirement: Logging recovers when re-enabled

The system SHALL treat a failure to write the log as disabling logging only until
the logging preference is next changed, at which point writing SHALL be attempted
again.

A single failed write (a locked file, a full disk moment) must not kill the
diagnostic channel until the browser restarts — the log exists precisely for the
moments things are going wrong.

#### Scenario: A write fails and the user toggles the preference

- **GIVEN** a log write failed and logging shut itself off
- **WHEN** the user toggles the logging preference
- **THEN** the next event attempts to write to the log again
