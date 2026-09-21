## MODIFIED Requirements

### Requirement: Startup canary for the browser contract

The system SHALL, once initialization completes, verify every browser internal it
depends on, and SHALL report a single error naming each missing point when the
contract does not hold. When the contract holds, the canary SHALL stay silent.
The contract SHALL include the shape of the tab strip the stylesheet depends on to hide
a collapsed group's tabs, and not only the browser's scriptable internals: a browser
release that moves the tabs breaks the hiding with nothing thrown and nothing logged.

The mod is deliberately defensive: when an internal disappears, features degrade
without throwing. That is right for resilience and wrong for diagnosis — the user's
report is "it stopped working", with nothing in the console to quote.

#### Scenario: The contract holds

- **WHEN** the script initializes against a browser that provides every internal it uses
- **THEN** no canary error is reported

#### Scenario: An internal is missing

- **GIVEN** a browser update removed or renamed an internal the mod depends on
- **WHEN** the script initializes
- **THEN** one error is reported
- **AND** it names each missing point of the contract

#### Scenario: The strip no longer has the shape the style needs

- **GIVEN** a browser update that moved a group's tabs to another place in the strip
- **WHEN** the script initializes
- **THEN** one error is reported
- **AND** it names the shape the style expected
