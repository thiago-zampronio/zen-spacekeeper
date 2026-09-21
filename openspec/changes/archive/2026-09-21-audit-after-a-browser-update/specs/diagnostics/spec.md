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

The system SHALL also verify its own work: every time it asks the browser to move a
group or a tab, it SHALL check afterwards that the move happened, and SHALL report a
move that did not, naming what it asked for. A report of a broken contract or of a move
that did nothing SHALL reach the console once per session even when the debug log is
disabled.

The system SHALL remember the browser build it last ran under, and SHALL, the first
time it runs under a different one, audit what only a running browser can answer:
whether a collapsed group's tabs are actually off the screen. That audit SHALL be
read-only — creating, deleting or moving nothing — and SHALL be performed on the first
group that collapses after the change, because a collapsed group may not exist at
startup. It SHALL record the new build as seen once the audit has run.

The browser accepts nonsense politely. A move asked for with a position it no longer
publishes returns normally and moves nothing, and a stylesheet rule that matches
nothing is not an error either. Three features failed that way at the same moment under
one browser release, in complete silence, and were found by eye a week later.

#### Scenario: The strip no longer has the shape the style needs

- **GIVEN** a browser update that moved a group's tabs to another place in the strip
- **WHEN** the script initializes
- **THEN** one error is reported
- **AND** it names the shape the style expected

#### Scenario: A move that did nothing is reported

- **GIVEN** a browser release where the mod's way of moving a group no longer works
- **WHEN** the mod asks for a move and the strip does not change
- **THEN** one report names the move it asked for
- **AND** the report reaches the console even with the debug log disabled

#### Scenario: A collapsed group that still shows its tabs is reported

- **GIVEN** the mod starts under a browser build it has not run under before
- **WHEN** a group collapses and its tabs stay visible on screen
- **THEN** one report names that group and how many tabs are still visible

#### Scenario: The audit moves nothing

- **GIVEN** the mod starts under a browser build it has not run under before
- **WHEN** the audit runs
- **THEN** no group and no tab is created, deleted or moved by it

#### Scenario: The same build is audited once

- **GIVEN** the audit has already run under the current browser build
- **WHEN** groups collapse and expand again in this session or a later one
- **THEN** the audit does not run again
