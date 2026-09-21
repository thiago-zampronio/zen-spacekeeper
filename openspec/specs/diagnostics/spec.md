# diagnostics Specification

## Purpose
Let a user or a maintainer find out what the mod is doing and whether it is
healthy, without reading its source: which version is running, what it decided
about each tab, and whether its own assumptions still hold.

## Requirements

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

### Requirement: Self-test of the mod's own assumptions

The system SHALL provide a self-test that verifies key derivation, rule
precedence, exclusions and tolerance of invalid configuration, and that reports how
many checks were made and which ones failed.

#### Scenario: Everything passes

- **WHEN** the user runs the self-test
- **THEN** the result states how many checks passed

#### Scenario: Something fails

- **WHEN** the user runs the self-test and a check fails
- **THEN** the result states how many failed out of how many
- **AND** it names each failing check

#### Scenario: The self-test does not depend on the user's configuration

- **GIVEN** the user has custom rules, exclusions and subdomain settings
- **WHEN** the self-test runs
- **THEN** its result is the same as with a default configuration

### Requirement: The self-test checks the window's real state

The self-test SHALL, in addition to derivation cases, verify the invariants that
must hold for the groups actually on screen — that every group of the system
declares its key and its Space, that no key is duplicated within a Space, and that
no tab sits in a group belonging to another Space.

Table-driven cases cannot catch a regression that only appears against real tabs,
which is where the original defect lived.

#### Scenario: An invariant is violated

- **GIVEN** a group of the system that lost its Space marking
- **WHEN** the user runs the self-test
- **THEN** the self-test reports a failure

### Requirement: Inspecting the current decisions

The system SHALL offer a way to obtain, for each open tab, the Space it belongs
to, the key derived from it, whether it is eligible for organization, and the group
it currently sits in; and for each group, its key, its Space, whether the system
owns it, and how many tabs it holds.

#### Scenario: Understanding why a tab was not grouped

- **WHEN** the user inspects the current state
- **THEN** each tab's Space, key, eligibility and current group are reported

### Requirement: The command surface is stable

The system SHALL expose its commands, its self-test, its inspection and its
version through a documented entry point, and the documentation SHALL NOT name a
command that the entry point does not provide.

The documentation teaches people to type these; a renamed command silently turns
the documentation into a list of errors.

#### Scenario: Documentation matches what is exposed

- **WHEN** the documentation names a command
- **THEN** that command exists on the documented entry point

### Requirement: Startup canary for the browser contract

The system SHALL, once initialization completes, verify every browser internal it
depends on, and SHALL report a single error naming each missing point when the
contract does not hold. When the contract holds, the canary SHALL stay silent.
The contract SHALL include the shape of the tab strip the stylesheet depends on to hide
a collapsed group's tabs, and not only the browser's scriptable internals: a browser
release that moves the tabs breaks the hiding with nothing thrown and nothing logged.

The mod is deliberately defensive: when an internal disappears, features degrade
without throwing. That is right for resilience and wrong for diagnosis — the user's
report is "it stopped working", with nothing in the console to quote.

#### Scenario: The contract holds

- **WHEN** the script initializes against a browser that provides every internal it uses
- **THEN** no canary error is reported

#### Scenario: An internal is missing

- **GIVEN** a browser update removed or renamed an internal the mod depends on
- **WHEN** the script initializes
- **THEN** one error is reported
- **AND** it names each missing point of the contract

The system SHALL also verify its own work: every time it asks the browser to move a
group or a tab, it SHALL check afterwards that the move happened, and SHALL report a
move that did not, naming what it asked for. A report of a broken contract or of a move
that did nothing SHALL reach the console once per session even when the debug log is
disabled.

The system SHALL remember the browser build it last ran under, and SHALL, the first
time it runs under a different one, audit what only a running browser can answer:
whether a collapsed group's tabs are actually off the screen. That audit SHALL be
read-only — creating, deleting or moving nothing — and SHALL be performed on the first
group that collapses after the change, because a collapsed group may not exist at
startup. It SHALL record the new build as seen once the audit has run.

The browser accepts nonsense politely. A move asked for with a position it no longer
publishes returns normally and moves nothing, and a stylesheet rule that matches
nothing is not an error either. Three features failed that way at the same moment under
one browser release, in complete silence, and were found by eye a week later.

#### Scenario: The strip no longer has the shape the style needs

- **GIVEN** a browser update that moved a group's tabs to another place in the strip
- **WHEN** the script initializes
- **THEN** one error is reported
- **AND** it names the shape the style expected

#### Scenario: A move that did nothing is reported

- **GIVEN** a browser release where the mod's way of moving a group no longer works
- **WHEN** the mod asks for a move and the strip does not change
- **THEN** one report names the move it asked for
- **AND** the report reaches the console even with the debug log disabled

#### Scenario: A collapsed group that still shows its tabs is reported

- **GIVEN** the mod starts under a browser build it has not run under before
- **WHEN** a group collapses and its tabs stay visible on screen
- **THEN** one report names that group and how many tabs are still visible

#### Scenario: The audit moves nothing

- **GIVEN** the mod starts under a browser build it has not run under before
- **WHEN** the audit runs
- **THEN** no group and no tab is created, deleted or moved by it

#### Scenario: The same build is audited once

- **GIVEN** the audit has already run under the current browser build
- **WHEN** groups collapse and expand again in this session or a later one
- **THEN** the audit does not run again

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
