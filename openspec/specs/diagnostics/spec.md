# diagnostics Specification

## Purpose
Let a user or a maintainer find out what the mod is doing and whether it is
healthy, without reading its source: which version is running, what it decided
about each tab, and whether its own assumptions still hold.

## Requirements

### Requirement: The running version is identifiable

The system SHALL expose the version of the running script, and every place that
reports a version SHALL report the same one.

When something misbehaves, the version is the first thing needed, and a mod
installed by copying files can easily be a different version from the one on disk.
A version reported inconsistently is worse than none, because it is trusted.

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
