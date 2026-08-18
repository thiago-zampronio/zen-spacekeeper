# installation Specification

## Purpose
Put the mod and the loader it depends on into a working state on Windows, macOS and
Linux, finding the browser and the profile the browser actually uses, and reporting
plainly whenever it cannot.

## Requirements

### Requirement: The guard is offered, never imposed

The installers SHALL install the guard only when explicitly requested by an
option, SHALL state what will be created (the watcher and the cache) before
creating it, and SHALL keep the plain install unchanged for everyone who does not
ask.

#### Scenario: Plain install

- **WHEN** the user runs the installer without the guard option
- **THEN** the install behaves exactly as today
- **AND** no watcher, schedule or cache is created

#### Scenario: Guard requested

- **WHEN** the user runs the installer with the guard option
- **THEN** the output states what will be created and where
- **AND** the watcher and the profile-side cache are installed

#### Scenario: Check reports the guard

- **WHEN** the user runs the check option
- **THEN** the guard's state is reported as its own part
- **AND** an installed guard whose watcher or cache is missing is reported as broken

#### Scenario: Uninstall removes the guard

- **WHEN** the user runs the uninstall option
- **THEN** the guard's watcher, schedule and cache are removed with the mod
- **AND** the loader keeps today's rule of being left in place

### Requirement: Installation on the three desktop platforms

The system SHALL provide an installer for Windows, macOS and Linux, and the
installed result SHALL be equivalent on all three: the same script, stylesheet and
resources, in the locations the loader reads.

#### Scenario: Windows

- **GIVEN** Zen is installed on Windows
- **WHEN** the user runs the installer
- **THEN** the loader is placed in the Zen program directory
- **AND** the mod files are placed in the Zen profile

#### Scenario: macOS

- **GIVEN** Zen is installed on macOS
- **WHEN** the user runs the installer
- **THEN** the loader is placed inside the application bundle's resources directory
- **AND** the mod files are placed in the Zen profile

#### Scenario: Linux

- **GIVEN** Zen is installed on Linux
- **WHEN** the user runs the installer
- **THEN** the loader is placed alongside the Zen binary
- **AND** the mod files are placed in the Zen profile

### Requirement: The profile is the one the browser uses

The system SHALL determine the target profile by reading the browser's own
`profiles.ini`, giving precedence to the profile declared by the install section
over the `Default` flag, and SHALL NOT choose a profile by listing directories.

A profile marked `Default=1` is frequently not the profile the browser opens.
Installing into the wrong profile produces no error and no effect, which is the
hardest possible failure to diagnose.

#### Scenario: The install section disagrees with the Default flag

- **GIVEN** `profiles.ini` declares one profile under an install section
- **AND** a different profile carries `Default=1`
- **WHEN** the installer selects the profile
- **THEN** it selects the one declared by the install section

#### Scenario: Only the Default flag is present

- **GIVEN** `profiles.ini` has no install section
- **AND** one profile carries `Default=1`
- **WHEN** the installer selects the profile
- **THEN** it selects that profile

#### Scenario: A profile path given by the user wins

- **GIVEN** the user passes an explicit profile directory
- **WHEN** the installer runs
- **THEN** it uses that directory
- **AND** it does not read `profiles.ini`

### Requirement: Failed detection stops and instructs

The system SHALL stop without writing anything when it cannot locate the browser or
the profile, and SHALL report which one was not found, the option that overrides it,
and where the user can read the correct value.

Guessing a path risks writing into an unrelated application directory. Refusing
costs the user one message.

#### Scenario: Browser not found

- **WHEN** the installer cannot locate the Zen installation
- **THEN** no file is written
- **AND** the message names the override option for the browser directory

#### Scenario: Profile not found

- **WHEN** the installer cannot locate a Zen profile
- **THEN** no file is written
- **AND** the message names the override option and points at `about:profiles`

### Requirement: The loader is reported as separate from the mod

The system SHALL treat the loader and the mod as two distinct installed parts, and
SHALL report their state separately, stating that a browser update removes the
loader.

The loader lives in the application directory, which browser updates replace. The
mod lives in the profile, which they do not touch. When the mod silently stops
working, which of the two is missing is the entire diagnosis.

#### Scenario: Reporting what is installed

- **WHEN** the user asks the installer to check the installation
- **THEN** it reports the loader and the mod separately
- **AND** it lists which specific files are missing

#### Scenario: Loader removed by a browser update

- **GIVEN** a browser update removed the loader
- **WHEN** the user asks the installer to check the installation
- **THEN** the report identifies the loader as the missing part
- **AND** it states that running the installer again restores it

### Requirement: Elevation only for the loader, and only when needed

The system SHALL request elevated privilege only to write the loader into the
application directory, SHALL NOT request it when the loader is already present, and
SHALL install the mod without any elevated privilege.

#### Scenario: Loader already present

- **GIVEN** the loader is already installed
- **WHEN** the user runs the installer without elevated privilege
- **THEN** the mod is installed
- **AND** no elevation is requested

#### Scenario: Loader missing

- **GIVEN** the loader is not installed
- **WHEN** the user runs the installer without elevated privilege
- **THEN** the installer states why elevation is required before requesting it

### Requirement: Installing without a copy of the repository

The system SHALL support installing directly from a single downloaded installer,
fetching the files it needs, and SHALL use local files instead when it is run from a
copy of the repository.

#### Scenario: Installer run on its own

- **GIVEN** only the installer file is present
- **WHEN** the user runs it
- **THEN** it retrieves the mod and loader files it needs
- **AND** the installed files match the published ones

#### Scenario: Installer run from a repository copy

- **GIVEN** the installer sits next to the project sources
- **WHEN** the user runs it
- **THEN** it installs the local files
- **AND** it retrieves nothing over the network

### Requirement: Removal leaves the browser as it was

The system SHALL offer removal of the mod files from the profile, SHALL leave the
loader in place, and SHALL leave the user's preferences untouched, stating both.

The loader is shared: other mods may depend on it, so removing this mod must not
disable them. Preferences are kept so that reinstalling restores the user's
configuration.

#### Scenario: Removing the mod

- **WHEN** the user runs the installer's removal option
- **THEN** the mod files are removed from the profile
- **AND** the loader remains installed
- **AND** the preferences remain stored
- **AND** the output states that both were kept

### Requirement: Restart offered after installing

The system SHALL, after a successful installation, offer to close the browser,
clear the detected profile's startup cache, and start the browser again — and
SHALL NOT close the browser without the user's explicit consent.

Consent SHALL be obtained by a prompt when a terminal is available to answer it,
or by an explicit opt-in option for scripted runs. When neither is available, the
system SHALL skip the restart silently and leave the manual instructions in place.
Running the installer piped into a shell SHALL keep working.

#### Scenario: User accepts the prompt

- **GIVEN** an installation just finished
- **AND** the browser is running
- **WHEN** the user accepts the restart prompt
- **THEN** the browser is asked to close
- **AND** the startup cache of the detected profile is cleared after it exits
- **AND** the browser is started again

#### Scenario: User declines the prompt

- **GIVEN** an installation just finished
- **WHEN** the user declines the restart prompt
- **THEN** no process is closed and nothing is deleted
- **AND** the output states the manual steps, as it does today

#### Scenario: Opt-in option given up front

- **GIVEN** the user runs the installer with the restart option
- **WHEN** the installation finishes successfully
- **THEN** the restart proceeds without a prompt

#### Scenario: No terminal to answer and no option given

- **GIVEN** the installer runs without a terminal available for the prompt
- **AND** the restart option was not given
- **WHEN** the installation finishes
- **THEN** the restart is skipped
- **AND** the output states the manual steps, as it does today

### Requirement: The close is graceful and bounded

The system SHALL ask the browser to quit the way the platform normally does, SHALL
wait a bounded time for it to exit, and SHALL NOT kill the process. When the
browser does not exit within the wait — an unsaved-changes dialog being the
expected cause — the system SHALL say so and fall back to the manual instructions,
leaving the browser running.

#### Scenario: Browser exits within the wait

- **WHEN** the browser is asked to quit
- **AND** it exits within the bounded wait
- **THEN** the restart continues with the cache clearing

#### Scenario: Browser does not exit

- **WHEN** the browser is asked to quit
- **AND** it is still running after the bounded wait
- **THEN** no process is killed and nothing is deleted
- **AND** the output states that the browser did not close and lists the manual steps

### Requirement: The cache cleared is the detected profile's

The system SHALL clear only the startup cache that belongs to the profile it
detected, resolving its per-platform location, and SHALL treat an absent cache
directory as already clear rather than as an error.

Clearing another profile's cache does nothing for the user and destroys a cache
that was doing its job.

#### Scenario: Cache directory exists

- **GIVEN** the browser has exited
- **WHEN** the cache is cleared
- **THEN** only the startup cache under the detected profile's cache location is removed

#### Scenario: Cache directory absent

- **GIVEN** the detected profile has no startup cache directory
- **WHEN** the restart reaches the cache step
- **THEN** the step succeeds without an error

#### Scenario: Browser not running

- **GIVEN** the browser is not running when the installation finishes
- **WHEN** the user consents to the restart
- **THEN** the cache is cleared without closing anything
- **AND** the browser is started

### Requirement: The installer states what remains to be done

The system SHALL, after installing, state that the browser must be restarted and
that the startup cache may need clearing — unless the offered restart already
performed those steps, in which case it SHALL state what was done instead.

A stale startup cache makes a correct installation look like a failed one: the
browser starts normally and the mod simply does not exist.

#### Scenario: After a successful install

The unqualified name is kept from the pre-restart spec on purpose: this branch IS
the original behavior, and the restart is what added a second case beside it.

- **GIVEN** the restart was declined, skipped or not completed
- **WHEN** the installation finishes
- **THEN** the output tells the user to restart the browser
- **AND** it tells the user how to clear the startup cache
- **AND** it names the address where the mod's panel can be opened

#### Scenario: After a successful install with the restart

- **GIVEN** the offered restart closed the browser, cleared the cache and started it again
- **WHEN** the installation finishes
- **THEN** the output states the browser was restarted and the cache cleared
- **AND** it names the address where the mod's panel can be opened
