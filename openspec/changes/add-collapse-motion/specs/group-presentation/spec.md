## Purpose

A collapse the user did not just click for must read as an intended motion, not a
silent vanishing.

## ADDED Requirements

### Requirement: Collapse and expand are animated, by a chosen preset

The system SHALL animate the hiding and showing of a system group's tabs on
collapse and expand according to a user-selectable motion preset, offered as one
choice among at least three motions plus an instant option; SHALL make every
preset's collapse faster than its expand, since the collapse is system-fired and
frequent; SHALL NOT let any preset gate reaching a tab mid-animation; SHALL fall
back to instant when the operating system asks for reduced motion or when the
instant option is chosen; and SHALL keep the animation scoped to the groups the
system created.

An instant collapse initiated by the system (focus mode) looks like a glitch; the
motion is what marks it as intended. But motion on a frequent action is a tax the
user pays constantly — the presets exist so real use decides how much story the
motion tells, and the frequency rule bounds every option.

#### Scenario: Collapsing animates per the chosen preset

- **GIVEN** a motion preset is selected and the OS does not ask for reduced motion
- **WHEN** a system group collapses
- **THEN** its tabs animate closed with that preset's motion
- **AND** the collapse is faster than the same preset's expand

#### Scenario: No preset gates a click

- **GIVEN** any motion preset
- **WHEN** the user expands a group to reach a tab
- **THEN** the tab becomes clickable without waiting for the animation to finish

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
