## ADDED Requirements

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
