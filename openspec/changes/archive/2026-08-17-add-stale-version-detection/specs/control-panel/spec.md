## ADDED Requirements

### Requirement: The panel names the reason it cannot reach the mod

The panel SHALL distinguish being opened where no browser window is reachable from
the mod not being loaded in the window that is reachable, and SHALL NOT use one
message for both.

A single message covering both sends the reader after the wrong cause. The observed
case was a version mismatch, and the panel reported a browsing-context problem —
which is a different subsystem, and the half hour spent on it went entirely into
hypotheses the message had invited.

Both conditions are rare, and neither can be produced on demand: the address is
registered once per process, while the mod is loaded once per window, so reaching
the second state means one window loaded the mod and another did not. That happens
when the mod fails in a single window — the address stays registered by the window
where it succeeded. Private windows do **not** produce it; the mod loads there like
anywhere else.

Being unreproducible on demand is the reason the requirement is written as a
contract about the message rather than about the screen: what must hold is that the
two conditions never share one sentence.

#### Scenario: The messages are distinct

- **WHEN** the panel reports that it cannot reach the mod
- **THEN** the message for an unreachable browser window and the message for a
  window without the mod are different texts
- **AND** neither is used for the other condition

#### Scenario: The window is reachable but the mod is not loaded

- **GIVEN** a browser window the panel can reach
- **AND** the mod is not loaded in it
- **WHEN** the user opens the panel
- **THEN** the panel states that the mod is not loaded in this window
- **AND** the message SHALL NOT attribute it to the page's connection

#### Scenario: No browser window is reachable

- **WHEN** the panel cannot reach a browser window at all
- **THEN** it states that it is not connected to a browser window

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
