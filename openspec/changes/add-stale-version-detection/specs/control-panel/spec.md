## ADDED Requirements

### Requirement: The panel names the reason it cannot reach the mod

The panel SHALL distinguish being opened where no browser window is reachable from
the mod not being loaded in the window that is reachable, and SHALL NOT use one
message for both.

A single message covering both sends the reader after the wrong cause. The observed
case was a version mismatch, and the panel reported a browsing-context problem —
which is a different subsystem, and the half hour spent on it went entirely into
hypotheses the message had invited.

#### Scenario: No browser window is reachable

- **WHEN** the panel cannot reach a browser window at all
- **THEN** it states that it is not connected to a browser window

#### Scenario: The window is reachable but the mod is not loaded

- **GIVEN** a browser window the panel can reach
- **AND** the mod is not loaded in it
- **WHEN** the user opens the panel
- **THEN** the panel states that the mod is not loaded in this window
- **AND** the message SHALL NOT attribute it to the page's connection

### Requirement: The panel remains usable while a mismatch is reported

The panel SHALL keep its preference controls working when the running version
differs from the installed one, and SHALL keep the report visible while the
mismatch lasts.

Preferences are read and written directly, so they do not depend on the running
script's version and there is no reason to disable them. What the report must not do
is be dismissible into invisibility: the condition persists until the browser is
restarted, and a warning that can be closed while the problem remains teaches the
user that it was not important.

#### Scenario: Changing a setting during a mismatch

- **GIVEN** the panel is reporting a version mismatch
- **WHEN** the user changes a setting
- **THEN** the setting is saved

#### Scenario: The report does not disappear on its own

- **GIVEN** the panel is reporting a version mismatch
- **WHEN** the user interacts with the rest of the panel
- **THEN** the report stays visible
