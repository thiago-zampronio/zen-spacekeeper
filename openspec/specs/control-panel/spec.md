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

The panel SHALL NOT load any resource from the network — no font, no image,
no script. Its own logic is loaded from `chrome://`, which is the profile on
disk and not a request.

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

### Requirement: One-click uninstall, after one confirmation

The panel SHALL offer an uninstall that, after an explicit confirmation stating
what will be removed and what will be kept, removes every file Spacekeeper put in
the profile — the mod files and, when installed, the guard's watcher, script and
cache — while keeping the loader and the preferences, and stating both.

Removal must not require finding an installer the user may have deleted the day
they installed. Making leaving easy is what makes staying trustworthy.

#### Scenario: Uninstalling from the panel

- **WHEN** the user clicks uninstall and confirms
- **THEN** the mod files are removed from the profile
- **AND** the guard's watcher, script and cache are removed when present
- **AND** the loader and the preferences are kept, and the result states both

#### Scenario: Declining the confirmation

- **WHEN** the user clicks uninstall and does not confirm
- **THEN** nothing is removed

#### Scenario: The running session

- **GIVEN** the uninstall completed
- **WHEN** the user keeps using the current session
- **THEN** the result states that the mod disappears on the next restart

### Requirement: Update controls report honestly

The system SHALL report the update check's outcome truthfully in the panel — up
to date, update available, or the exact failure — and SHALL disclose, next to
where updates are managed, the product's full network behavior: the click-driven
check and download, and the automatic metadata-only check (shortly after a
window opens, every few hours, and when the panel opens), including that the
preference turns the automatic check off and that nothing else in the product
touches the network.

The maintenance buttons this requirement originally described were replaced by
the banner flow; the honesty obligations survive the furniture. The old
disclosure claimed update clicks were "the one action that contacts the
network", which the automatic check made false — the disclosure now describes
the network behavior the product actually has.

#### Scenario: Outcomes are reported truthfully

- **WHEN** a check ends — up to date, update found, or failed
- **THEN** the panel states that outcome, and a failure names the error

#### Scenario: The disclosure matches reality

- **WHEN** the user reads the network disclosure in the update area
- **THEN** it describes both the click-driven and the automatic checks
- **AND** it names the preference that silences the automatic one

### Requirement: A clean handover is offered, never imposed

The panel SHALL offer the full reset — dissolve every group the system created, in
every Space, clear the startup cache and restart the browser — without ever
imposing it, in the shape each flow calls for. In the uninstall flow the offer is a
checkbox on the single confirmation dialog, born checked, whose consequences —
including that the dissolved groups are NOT recreated, since the thing that would
recreate them is being removed — are stated in that dialog's body. In the update
flow the offer is a dialog shown only after the update succeeded, with explicit
button labels, where the restarting button SHALL NOT be the keyboard default (the
dialog appears asynchronously; a keystroke in flight must not restart the
browser). Dialog buttons SHALL carry action labels, never a bare OK. Declining, in
either flow, SHALL change nothing beyond showing the manual steps; a failed
operation SHALL discard the reset answer entirely.

Dissolving the groups is what makes structure changes safe: the next start finds no
group carrying an old marking, and the new version rebuilds the organization from
scratch (after an update) or the sidebar is simply clean (after an uninstall). Tabs
are never closed — only the system's own groups are dissolved; manual groups,
folders, pinned and essential tabs stay untouched, as always.

#### Scenario: Accepting the reset after an update

- **GIVEN** an update finished
- **WHEN** the user accepts the reset
- **THEN** every group the system created, in every Space, is dissolved
- **AND** no tab is closed and no tab changes Space
- **AND** the startup cache is cleared and the browser restarts
- **AND** the new version regroups on the next start

#### Scenario: Accepting the reset after an uninstall

- **GIVEN** an uninstall finished
- **WHEN** the user accepts the reset
- **THEN** every group the system created is dissolved before the restart
- **AND** the browser comes back without the mod and without its groups

#### Scenario: Declining the reset

- **WHEN** the user declines
- **THEN** nothing is dissolved and nothing restarts
- **AND** the manual steps (restart, startup cache) are shown

### Requirement: An available update is announced, not looked for

The panel SHALL report an available update as a banner at the top of the page,
stating the version in use and the version available, without the user asking.

An update the user never notices is an update that does not happen. Reporting it
where a fault is reported, in the same shape, means it is seen by someone who opened
the panel for an unrelated reason.

#### Scenario: An update exists when the panel opens

- **GIVEN** a newer release exists
- **WHEN** the user opens the panel
- **THEN** a banner states the version in use and the version available

#### Scenario: No update exists

- **WHEN** the user opens the panel and there is no newer release
- **THEN** no banner is shown

#### Scenario: Arriving from the alert

- **GIVEN** the alert in the tab strip is showing
- **WHEN** the user acts on it
- **THEN** the panel opens with the banner already filled in

### Requirement: The banner reads as an opportunity, not a fault

The panel SHALL present the update banner visually distinct from the banner that
reports something wrong, while keeping the same shape and position.

Two banners in the same place carrying opposite meanings must not look identical:
one says the product is misbehaving, the other says something good is available.
Same shape so it is recognized; different color so it is not confused.

#### Scenario: Both kinds are recognizable

- **WHEN** either banner is shown
- **THEN** it occupies the same position and shape as the other
- **AND** the two are visually distinguishable from each other

### Requirement: Release notes are readable, and out of the way

The panel SHALL offer the release notes from the banner, hidden until asked for and
readable when shown, and SHALL NOT require the user to read them to update.

Notes flattened into a diagnostic output area are technically present and
practically unread. Notes that expand on request are there for whoever wants them
and silent for whoever does not.

#### Scenario: Notes on request

- **GIVEN** the update banner is showing
- **WHEN** the user asks for the release notes
- **THEN** the notes for every release newer than the one in use are shown

#### Scenario: Updating without reading them

- **GIVEN** the update banner is showing
- **WHEN** the user updates
- **THEN** no interaction with the notes was required

#### Scenario: A release without notes

- **GIVEN** a newer release that published no notes
- **WHEN** the banner is shown
- **THEN** the notes control is absent or states that there are none

### Requirement: A stale version is settled before an update is offered

When the running version differs from the installed one, the panel SHALL report that
condition and SHALL NOT show the update banner at the same time.

Both conditions end in the same first step — restart — and the staleness one is a
prerequisite: applying an update while the browser runs older code writes new files
that will not take effect either, leaving the user one restart away from correct in
both cases while having read two stacked warnings. Once the restart happens, the
staleness clears and the update banner appears normally.

#### Scenario: Both conditions hold

- **GIVEN** the running version differs from the installed one
- **AND** a newer release exists
- **WHEN** the user opens the panel
- **THEN** only the stale-version banner is shown

#### Scenario: After settling the stale version

- **GIVEN** the user restarted and the running version now matches the installed one
- **AND** a newer release still exists
- **WHEN** the user opens the panel
- **THEN** the update banner is shown

### Requirement: The manual check survives the preference being off

The panel SHALL offer a manual update check when automatic checking is disabled, and
MAY omit it when automatic checking is enabled.

With checking on, a button asking for something that already happened on open is
noise. With it off, that button is the only way to look — removing it would turn a
preference the user set into a dead end, which is a different thing from respecting
it.

#### Scenario: Automatic checking disabled

- **GIVEN** automatic update checking is off
- **WHEN** the user opens the panel
- **THEN** a manual check is available

#### Scenario: Automatic checking enabled

- **GIVEN** automatic update checking is on
- **WHEN** the user opens the panel
- **THEN** the check has already run, and its result is what the panel reports
