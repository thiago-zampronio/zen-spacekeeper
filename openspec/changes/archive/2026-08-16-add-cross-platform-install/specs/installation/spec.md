## Purpose

Put the mod and the loader it depends on into a working state on Windows, macOS and
Linux, finding the browser and the profile the browser actually uses, and reporting
plainly whenever it cannot.

## ADDED Requirements

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

### Requirement: The installer states what remains to be done

The system SHALL, after installing, state that the browser must be restarted and
that the startup cache may need clearing.

A stale startup cache makes a correct installation look like a failed one: the
browser starts normally and the mod simply does not exist.

#### Scenario: After a successful install

- **WHEN** the installation finishes
- **THEN** the output tells the user to restart the browser
- **AND** it tells the user how to clear the startup cache
- **AND** it names the address where the mod's panel can be opened
