## MODIFIED Requirements

### Requirement: Installing without a copy of the repository

The system SHALL support installing directly from a single downloaded installer,
fetching the files it needs, and SHALL use local files instead when it is run from a
copy of the repository. When it fetches, it SHALL take the files from the
repository's latest published release — the highest version published, never merely
the most recent — unless the caller names a different ref; it SHALL state which
release it installed; and when that release cannot be resolved it SHALL stop and
say so rather than silently falling back to a branch. The system SHALL maintain
the published latest-release pointer so that it names the highest version, and
SHALL verify that it does at release time.

The reason the update flow refuses a branch applies to installing too: a branch turns
every later push into whatever the next person to run the one-liner receives. A
release is a deliberate act, and the person running the installer is entitled to the
same deliberateness the person clicking Update gets.

Highest version rather than most recent is not a detail. A hotfix for an older
line, published after a larger release, is chronologically newest and semantically
older; taking the chronological head would hand a new install the smaller of two
versions. The update flow already resolves it that way, and the two paths must agree
or the disagreement simply becomes rarer and harder to diagnose.

The requirement deliberately does not say how the installer arrives at the answer.
Computing it there would mean the same comparison rule living in three languages,
where copies fail only on inputs nobody has yet. Declaring it once, when the release
is published, and having the installer read that declaration keeps one rule and one
place to be wrong — which is why the obligation to maintain the pointer, and to
check it, is part of this requirement rather than an implementation note. A pointer
nobody audits is just the chronological head wearing a better name.

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

#### Scenario: The published pointer disagrees with the highest version

- **GIVEN** the release marked latest is not the highest version published
- **WHEN** the release-time check runs
- **THEN** it fails and names both releases

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
