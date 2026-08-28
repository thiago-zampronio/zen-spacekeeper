## ADDED Requirements

### Requirement: Repair does not depend on the panel

The system SHALL place an entry in the browser's userScripts menu, present
whenever the mod is loaded, that reinstalls the mod's profile-side files from the
latest published release — the highest version published, not the most recently
published; the entry SHALL NOT compare the running version against
that release, and SHALL install regardless of whether one is newer; it SHALL ask
for confirmation naming the release and stating that the current files will be
overwritten; the write SHALL use the same all-or-nothing path as the panel's
Update, leaving the previous files in place when any step fails; the system
SHALL run at most one update or repair at a time, whichever surface asked for
it, refusing any further attempt while one is in flight; and it SHALL report that a step has begun before that step
waits on the network, so that no activation looks like it did nothing.

The panel is the place an update is decided; it must not also be the only place an
update can happen. The panel is an HTML document rendered by an engine the project
does not control, and the mod is six files that must move together — a broken page
or a half-finished write leaves the user with no way in from inside the product.
The entry answers that with a repair rather than a second update button: it does
not ask what is wrong, it puts the published files back.

The version comparison is deliberately absent. The situation this exists for is the
one where the installed version is already the latest and the installation is
broken anyway; a check would refuse exactly when help is needed.

Highest version rather than most recent is the same rule the update check already
applies, and the repair is where it finally matters. The update path only ever
looked at releases newer than the running one, so a chronological head could never
surface there; the repair runs precisely when nothing is newer. A hotfix published
on an older line after a bigger release is chronologically first and semantically
older, and installing it would turn the rescue into a downgrade.

The reach of this requirement ends where the chrome script does. The entry is
inserted by the script, so a profile whose script does not load at all — the loader
deleted by a browser update — has no entry either, and is the installer's problem.

One at a time and say-it-started are one clause split in two, and both were paid
for. Every step waits on the network before it shows anything, so the first build
gave no sign a click had landed, and pressing again is the honest response to a
button that does nothing — the log recorded three confirmations against two
cancels. A second run is not merely wasteful: the staging directory is one fixed
path, so two runs write the same names into it, the first to finish moves them
out, the second finds them gone and rolls back over what the first correctly
installed. The all-or-nothing guarantee above holds for one repair and dissolves
for two, which is why the guard belongs in the requirement and not only in the
code.

#### Scenario: The entry is there before anything is wrong

- **GIVEN** the mod is loaded and the installed version is the latest
- **WHEN** the user opens the userScripts menu
- **THEN** the repair entry is present

#### Scenario: A hotfix published after a larger release

- **GIVEN** the most recently published release is a hotfix on an older version line
- **AND** a higher version was published before it
- **WHEN** the user runs the repair and confirms
- **THEN** the higher version is installed
- **AND** the repair never installs a version lower than the one running

#### Scenario: Reinstalling over the same version

- **GIVEN** the installed version equals the latest release
- **WHEN** the user runs the repair and confirms
- **THEN** every profile-side file of that release is written again
- **AND** no version comparison prevented it

#### Scenario: A second activation while one repair is running

- **GIVEN** a repair is in flight
- **WHEN** the user activates the entry again, or confirms a second time
- **THEN** no second repair starts
- **AND** the running one completes unaffected

#### Scenario: The panel's Update while a repair is running

- **GIVEN** a repair is in flight
- **WHEN** the user clicks Update in the panel
- **THEN** no second write starts
- **AND** the running repair completes unaffected

#### Scenario: A step says it has begun

- **WHEN** the user activates the entry, or confirms the reinstall
- **THEN** the system reports that the step has begun
- **AND** it does so before the step waits on the network

#### Scenario: A failed repair leaves the entry usable

- **GIVEN** a repair failed, or its confirmation was dismissed without answering
- **WHEN** the user activates the entry again
- **THEN** the repair runs

#### Scenario: Confirmation is required

- **WHEN** the user activates the entry
- **THEN** the release about to be installed is named
- **AND** nothing is downloaded or written until the user confirms

#### Scenario: Cancelling changes nothing

- **GIVEN** the confirmation is showing
- **WHEN** the user cancels
- **THEN** no file is downloaded or written

#### Scenario: A repair that fails midway

- **WHEN** any file of the repair cannot be fetched or written
- **THEN** the previously installed files remain in place
- **AND** the failure is reported with the reason

#### Scenario: The panel is unreachable

- **GIVEN** the panel does not render
- **WHEN** the user runs the repair from the menu and confirms
- **THEN** the mod's files are reinstalled without the panel being opened

## MODIFIED Requirements

### Requirement: Nothing happens without a click

The system SHALL contact the network for update purposes only in these shapes: a
metadata-only check — shortly after a window opens, every few hours, and when the
panel is opened, disclosed in the panel and the manual, disabled by a preference —
the user-initiated check and download from the panel, and the user-initiated
repair from the userScripts menu; SHALL NOT download or write any file except in
direct response to the user's click on Update or the user's confirmation of a
repair; and SHALL keep the automatic check silent except for the alert it may
raise.

The no-network claim is the product's privacy posture. Its exception grows from "one
click-shaped hole" to "one click-shaped hole plus one disclosed, disableable
heartbeat that reads a single release-metadata endpoint" — and the line that matters
stays absolute: nothing is ever installed without a click. The heartbeat exists
because windows outlive releases: a browser that stays open for days must still
learn about an update without a restart.

Opening the panel joins that heartbeat rather than forming a new exception: it is
the same endpoint, the same metadata, and the same preference switches it off. The
panel is where an update is acted on, and arriving at it with the answer already
fetched is the difference between an update being noticed and being looked for.

The repair is a second click-shaped hole, not a second heartbeat: it contacts the
network only when the user has activated the entry and confirmed, and its
confirmation step is the click the absolute line names. The preference that
silences the automatic check does not hide the entry — a rescue that a
configuration can remove is not a rescue.

#### Scenario: The automatic check is metadata-only

- **GIVEN** the browser started and the automatic check ran
- **WHEN** the latest release is inspected
- **THEN** only release metadata was fetched
- **AND** no file was downloaded or written

#### Scenario: The automatic check can be turned off

- **GIVEN** `zen.stg.updateCheck` is false
- **WHEN** the browser runs for the whole session
- **THEN** no update request is made without a user click

#### Scenario: Opening the panel obeys the same preference

- **GIVEN** `zen.stg.updateCheck` is false
- **WHEN** the user opens the panel
- **THEN** no update request is made
- **AND** the panel offers a manual check instead

#### Scenario: A user check is only a check

- **WHEN** the user asks whether an update exists
- **THEN** only version information is fetched
- **AND** no file is downloaded or written

#### Scenario: Installing still requires the click

- **GIVEN** the automatic check found a newer release
- **WHEN** the user clicks nothing
- **THEN** nothing is downloaded, and the only visible effect is the alert

#### Scenario: The repair stays available when the check is off

- **GIVEN** `zen.stg.updateCheck` is false
- **WHEN** the user opens the userScripts menu
- **THEN** the repair entry is present
- **AND** no request was made to put it there

### Requirement: A check tells what changed

The system SHALL include, in the check result, the published notes of every
release newer than the installed version — newest first, each under its
version — and SHALL show them with the from → to message, so the decision to
update is made with all the missed changes in view; releases without notes
SHALL degrade to the version message alone. The repair reached from the
userScripts menu SHALL name the release it is about to install and SHALL point at
where the published notes can be read, without reproducing them.

The notes belong to the decision, and the decision belongs to the panel. The repair
is not that decision: it is reached when the panel cannot be, and a path whose
purpose is to survive the panel's absence cannot depend on the panel's ability to
lay out a list. Naming the version and saying where the notes live keeps the
promise honest at the size the surface allows, instead of pretending the notes
were never part of it.

#### Scenario: Notes with the versions

- **GIVEN** a newer release with published notes
- **WHEN** the check completes — clicked or automatic-then-opened
- **THEN** the panel shows the from → to versions and what the release brought

#### Scenario: Several versions behind means several sets of notes

- **GIVEN** the installed version is three releases behind
- **WHEN** the check completes
- **THEN** the notes of all three missed releases appear, newest first, each
  under its version

#### Scenario: The repair names the version and where to read the notes

- **WHEN** the repair asks for confirmation
- **THEN** the release being installed is named
- **AND** the user is told where the published notes can be read

### Requirement: The update stays inside the profile

The update SHALL replace only profile-side files, and when the release also
changed the loader, it SHALL say so and SHALL hand the loader over to the
installer — pointing at it, and from the repair offering to run it — instead of
touching the application directory.

The application directory may require elevation, and elevation belongs to the
installer, where a human is present by definition. Offering to launch it does not
weaken that: the user clicked the entry and confirmed, so the human is present, and
the installer still does the privileged work and still asks for elevation itself.
Telling a user to go and run something is where the old path stopped; the repair
exists to stop leaving them at that sentence.

#### Scenario: Release also changed the loader

- **GIVEN** the latest release changed the loader files
- **WHEN** the user updates from the panel
- **THEN** the profile-side files are updated
- **AND** the result states that the loader changed and the installer must be run

#### Scenario: The repair offers to finish the loader's half

- **GIVEN** the latest release changed the loader files
- **WHEN** the user completes the repair from the userScripts menu
- **THEN** the profile-side files are reinstalled
- **AND** the result states that the loader changed
- **AND** the user is offered the installer run that updates it

#### Scenario: The application directory is never written by the mod

- **GIVEN** a release that changed the loader
- **WHEN** the repair completes without the user accepting the installer run
- **THEN** no file in the application directory was written

#### Scenario: Download fails midway

- **WHEN** any file of the update cannot be fetched or written
- **THEN** the previously installed files remain in place
- **AND** the failure is reported with the reason
