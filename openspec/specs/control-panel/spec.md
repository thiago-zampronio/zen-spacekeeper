# control-panel Specification

## Purpose
Give the organizer's configuration a screen of its own, where the options are
discoverable and editable without knowledge of the internal preferences.

## Requirements

### Requirement: An address of its own

The system SHALL serve the panel at `about:spacekeeper`, reachable from the address
bar like any browser page.

#### Scenario: Open by address

- **WHEN** the user types `about:spacekeeper` in the address bar and confirms
- **THEN** the control panel is displayed in the tab

#### Scenario: Panel reachable from the menu

- **WHEN** the user triggers the preferences item in the organization menu
- **THEN** the panel is opened

### Requirement: A view over the preferences

The panel SHALL read and write exclusively the `zen.stg.*` preferences, keeping no
storage of its own, and changes made outside it SHALL show up when it is reopened.

#### Scenario: An external change shows up in the panel

- **GIVEN** the user changed a preference in `about:config`
- **WHEN** the panel is opened
- **THEN** the value displayed is the one in the preference

#### Scenario: A change in the panel takes effect immediately

- **GIVEN** the panel is open
- **WHEN** the user changes an option
- **THEN** the corresponding preference is written
- **AND** the organizer's behavior changes without restarting the browser

### Requirement: Editing lists without JSON

The panel SHALL allow creating, editing and removing custom rules and excluded
domains through the interface, without requiring the user to write JSON.

#### Scenario: Create a rule

- **WHEN** the user creates a rule with a name and two domains
- **THEN** the rule starts applying to the grouping
- **AND** the rules preference reflects the change

#### Scenario: Invalid configuration written outside the panel

- **GIVEN** the rules preference contains text that is not valid JSON
- **WHEN** the panel is opened
- **THEN** the panel reports the problem
- **AND** it SHALL NOT erase the existing content without an action from the user

### Requirement: Commands and diagnostics within reach

The panel SHALL offer the organization commands for the current Space and the
execution of the self-test, displaying the result.

#### Scenario: Run a command

- **WHEN** the user triggers regroup from the panel
- **THEN** the current Space is reorganized
- **AND** the panel reports the result

#### Scenario: Run the self-test

- **WHEN** the user triggers the self-test
- **THEN** the panel shows how many assertions passed and which ones failed

### Requirement: Sober appearance, adapted to the theme

The panel SHALL follow the light or dark theme in use and SHALL present the options
grouped by subject, with the label on the left and the control on the right.

#### Scenario: Dark theme

- **GIVEN** the browser is in dark theme
- **WHEN** the panel is opened
- **THEN** the panel is displayed in dark theme

#### Scenario: An option with its effect explained

- **WHEN** the user looks at an option
- **THEN** there is a short description of its effect, in plain language

### Requirement: Local confinement

The panel SHALL NOT load any resource from the network — no font, no image, no
external script.

#### Scenario: No network

- **WHEN** the panel is displayed
- **THEN** no network request is made by the page

### Requirement: Registration undone on close

The system SHALL undo the address registration when the window is closed, leaving no
`about:spacekeeper` pointing at a target that no longer exists.

#### Scenario: Window closed

- **WHEN** the last browser window is closed
- **THEN** the address registration is removed

### Requirement: A pending edit survives the page closing

The panel SHALL commit the value of a field still being edited when the page is
closed or hidden, through the same path a completed edit takes.

Fields commit when they lose focus. Closing the tab, closing the window or quitting
the browser never blurs the field, so the typed text silently vanished — the only
path where an edit was lost.

#### Scenario: The page closes with a field mid-edit

- **GIVEN** the user typed into a field and did not leave it
- **WHEN** the page is closed or hidden
- **THEN** the field's value is committed as if the field had lost focus
