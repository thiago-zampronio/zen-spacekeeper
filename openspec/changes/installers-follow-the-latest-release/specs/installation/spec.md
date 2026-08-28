## MODIFIED Requirements

### Requirement: Installing without a copy of the repository

The system SHALL support installing directly from a single downloaded installer,
fetching the files it needs, and SHALL use local files instead when it is run from a
copy of the repository. When it fetches, it SHALL take the files from the
repository's latest published release — the newest non-draft, non-prerelease release
by version, not by publish date — unless the caller names a different ref; it SHALL
state which release it installed; and when the latest release cannot be resolved it
SHALL stop and say so rather than silently falling back to a branch.

The reason the update flow refuses a branch applies to installing too: a branch turns
every later push into whatever the next person to run the one-liner receives. A
release is a deliberate act, and the person running the installer is entitled to the
same deliberateness the person clicking Update gets.

Sorting by version rather than by publish date is not a detail. A hotfix for an older
line, published after a larger release, is chronologically newest and semantically
older; taking the chronological head would hand a new install the smaller of two
versions. The update flow already resolves it this way, and the two paths must agree
or the disagreement simply becomes rarer and harder to diagnose.

Stopping is the right failure. A fallback to a branch would reintroduce, at exactly
the least observable moment, the behaviour this requirement removes — and it would do
so silently, on a machine whose owner believes they installed a release.

#### Scenario: Installer run on its own

- **GIVEN** only the installer file is present
- **WHEN** the user runs it
- **THEN** it retrieves the mod and loader files of the latest published release
- **AND** the installed files match that release's published files
- **AND** the release it installed is named in its output

#### Scenario: A hotfix published after a larger release

- **GIVEN** the newest release by publish date is a hotfix on an older version line
- **AND** a higher version was released before it
- **WHEN** the user runs the installer with no ref
- **THEN** the higher version is installed

#### Scenario: The latest release cannot be resolved

- **GIVEN** the release list cannot be retrieved
- **WHEN** the user runs the installer with no ref
- **THEN** the installer stops and states that it could not determine the release
- **AND** no file is installed from a branch

#### Scenario: An explicit ref overrides the default

- **GIVEN** the caller names a ref
- **WHEN** the user runs the installer
- **THEN** the files come from that ref
- **AND** no release lookup decides the source

#### Scenario: Installer run from a repository copy

- **GIVEN** the installer sits next to the project sources
- **WHEN** the user runs it
- **THEN** it installs the local files
- **AND** it retrieves nothing over the network
