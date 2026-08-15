## Purpose

A collapse the user did not just click for must read as an intended motion, not a
silent vanishing.

## ADDED Requirements

### Requirement: Collapse and expand are animated

The system SHALL animate the hiding and showing of a system group's tabs on
collapse and expand, SHALL fall back to instant hiding when the operating system
asks for reduced motion or when the animation preference is off, and SHALL keep
the animation scoped to the groups the system created.

An instant collapse initiated by the system (focus mode) looks like a glitch; the
motion is what marks it as intended.

#### Scenario: Collapsing animates

- **GIVEN** the animation preference is on and the OS does not ask for reduced motion
- **WHEN** a system group collapses
- **THEN** its tabs animate closed instead of disappearing instantly

#### Scenario: Reduced motion wins

- **GIVEN** the OS asks for reduced motion
- **WHEN** a system group collapses or expands
- **THEN** the change is instant, as before this change

#### Scenario: Native structures unaffected

- **WHEN** a Zen folder or a manual group collapses
- **THEN** its appearance is untouched by the system's styling

### Requirement: Focus mode closes on a delay

The system SHALL, in focus mode, collapse a group that left the recent set only
after a configurable delay, and SHALL NOT collapse it at all if it re-enters the
recent set before the delay fires.

Fast switching between groups must not shake the sidebar: the delay absorbs the
churn, and the animation makes the eventual collapse legible.

#### Scenario: The delay absorbs a quick return

- **GIVEN** focus mode is on with a delay configured
- **WHEN** the user leaves a group and returns to it before the delay fires
- **THEN** that group never collapses

#### Scenario: The delayed collapse is animated

- **GIVEN** focus mode is on and a group's delay fires
- **WHEN** the group collapses
- **THEN** the collapse is animated, subject to the animation requirement above
