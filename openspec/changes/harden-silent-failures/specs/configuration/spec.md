## Purpose

Keep the diagnostic log honest about what it records, and recoverable when a write
fails.

## ADDED Requirements

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
