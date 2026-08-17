## MODIFIED Requirements

### Requirement: The running version is identifiable

The system SHALL expose the version of the running script, and every place that
reports a version SHALL report the same one.

The system SHALL additionally compare the version it is running against the
version present in the installed file it was loaded from — at startup, and again
every time the panel opens (never on a timer: the person who would act on a
mismatch is the one opening the panel) — and SHALL record the result of that
comparison whether or not they differ.

When something misbehaves, the version is the first thing needed, and a mod
installed by copying files can easily be a different version from the one on disk.
A version reported inconsistently is worse than none, because it is trusted. And a
version that matches everywhere while the browser executes something else is worse
still: every report agrees, and every report is about the wrong artifact.

#### Scenario: Version available to the user

- **WHEN** the user looks at the mod's panel
- **THEN** the version of the running script is displayed

#### Scenario: Every report agrees

- **WHEN** the version is read from more than one of the mod's outputs
- **THEN** all of them report the same version

#### Scenario: The mod is not running

- **GIVEN** the panel is open but the mod is not loaded in that window
- **WHEN** the user looks at where the version is displayed
- **THEN** the panel states that it is not connected to the browser window
- **AND** it SHALL NOT display a version

#### Scenario: Running code older than what is installed

- **GIVEN** the installed files were replaced while the browser was running
- **WHEN** the comparison next runs — the panel opening triggers one
- **THEN** it determines that the running version and the installed version differ
- **AND** both versions are recorded

#### Scenario: Versions agree

- **WHEN** a comparison runs and the running and installed versions are the same
- **THEN** that agreement is recorded
- **AND** nothing is reported to the user

The agreement is recorded too: a check that only leaves a trace when it fails cannot
be distinguished from a check that never ran.

## ADDED Requirements

### Requirement: A version mismatch is reported, not merely detected

The system SHALL make a difference between the running and the installed version
visible to the user, stating both versions and the action that resolves it.

Detecting this and keeping it in a log would repeat the original failure at one
remove: the log is only read by someone who already suspects something.

#### Scenario: The user opens the panel while a mismatch exists

- **WHEN** the user opens the panel
- **THEN** the panel states which version is running and which is installed
- **AND** it states that the browser must be restarted and the startup cache cleared

#### Scenario: The remedy is offered as an action

- **WHEN** the mismatch is reported
- **THEN** the report offers to perform the remedy

#### Scenario: The remedy cannot be performed

- **GIVEN** the browser does not expose a way to restart with the cache cleared
- **WHEN** the mismatch is reported
- **THEN** the report states the manual steps instead
- **AND** the manual steps name the startup cache

Restarting alone is not enough — a stale startup cache reproduces the same state,
which is why the manual form has to name both halves. When the product can do it,
asking the user to do it by hand is asking them to perform a chore the product
already knows how to finish.

### Requirement: Applying the update is one action, and it is not destructive

The system SHALL offer, alongside the mismatch report, a way to restart the browser
with the startup cache cleared, and that action SHALL NOT dissolve the user's groups
nor change any preference.

A clean-handover restart that also dissolves groups already exists for uninstalling.
Reusing it here would trade a stale version for lost organization, which is a worse
outcome than the problem being fixed.

#### Scenario: Applying from the report

- **GIVEN** a reported version mismatch
- **WHEN** the user chooses to apply it
- **THEN** the browser restarts with the startup cache cleared
- **AND** the groups and preferences are left as they were

#### Scenario: The browser restores the session

- **WHEN** the restart happens
- **THEN** it uses the browser's own restart, so the session is restored as usual
