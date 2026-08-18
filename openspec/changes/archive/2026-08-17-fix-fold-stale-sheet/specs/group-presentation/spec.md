# Delta: group-presentation — settled sheet measurement for fold

## MODIFIED Requirements

### Requirement: Collapse and expand are animated, by a chosen preset

The system SHALL animate the hiding and showing of a system group's tabs on
collapse and expand according to a user-selectable motion preset, offered as one
choice among at least three motions plus an instant option; SHALL, for a preset
whose promise is a single reversible gesture (Fold), play collapse and expand as
the same motion mirrored — identical durations, identical easing, no directional
delays — while presets telling a directional story (Swift's blink, Cascade's
deal-and-gather) MAY time each direction independently, no direction of any
preset exceeding the frequent-action collapse budget; SHALL NOT let any preset
gate reaching a tab mid-animation; SHALL fall
back to instant when the operating system asks for reduced motion or when the
instant option is chosen; SHALL start every animated height at a measured height
— a real tab row for per-row presets, the real sheet for a container-level
preset — so no dead headroom eats the visible motion; SHALL ensure a published
measurement reflects the settled layout, never a snapshot taken while any row
or container height is still animating, so that once the strip settles no tab
of an expanded group is left clipped out of view by a stale measurement; SHALL
show, in the panel, one animated preview of the selected preset that plays once
per selection change and then rests; SHALL scale every preset's timing — and
the preview's — by a user-set speed percentage, where 100 is the designed
timing and lower is slower; SHALL keep each preset's character legible in both
directions, so no preset reads as another on either collapse or expand; and
SHALL keep the animation scoped to the groups the system created.

An instant collapse initiated by the system (focus mode) looks like a glitch; the
motion is what marks it as intended. But motion on a frequent action is a tax the
user pays constantly — the presets exist so real use decides how much story the
motion tells, and the frequency rule bounds every option.

#### Scenario: Collapsing animates per the chosen preset

- **GIVEN** a motion preset is selected and the OS does not ask for reduced motion
- **WHEN** a system group collapses
- **THEN** its tabs animate closed with that preset's motion
- **AND** a mirrored preset's collapse retraces its expand exactly, and no
  preset's collapse exceeds the frequent-action budget

#### Scenario: The whole duration is visible motion

- **GIVEN** any motion preset
- **WHEN** a group collapses or expands
- **THEN** the animated height starts at a measured height — a real row, or the
  real sheet for a container-level preset — not a loose cap, so the motion spans
  the preset's full duration instead of a dead beat followed by a crammed vanish

#### Scenario: A measurement taken mid-animation never sticks

- **GIVEN** the Fold preset
- **WHEN** a tab joins a group while row heights are still animating — a new
  tab's insertion animation, or Fold's own selected-row choreography — and the
  group is then expanded
- **THEN** once the strip settles, every tab of the group is visible
- **AND** the published sheet height matches the settled content, not any
  mid-animation snapshot

#### Scenario: A tab adopted into a collapsed group appears on expand

- **GIVEN** the Fold preset and a collapsed group
- **WHEN** a tab is adopted into the group and the group is later expanded
- **THEN** after the expand settles, the adopted tab is visible along with
  every other tab of the group

#### Scenario: The panel previews the chosen motion

- **WHEN** the user selects a motion preset in the panel
- **THEN** a single thumbnail beside the choices plays that preset's collapse and
  expand once, with the preset's own durations, and then rests expanded
- **AND** under OS reduced motion the preview is instant, like the real thing

#### Scenario: Both directions carry the preset's character

- **GIVEN** any two motion presets
- **WHEN** the same group is collapsed under one and then the other, or expanded
  under one and then the other
- **THEN** the two motions are distinguishable in that direction — a slowed-down
  comparison must not reveal one preset degenerating into another on either
  collapse or expand

#### Scenario: The speed setting stretches every motion

- **GIVEN** the motion speed is set below 100
- **WHEN** a group collapses or expands, or the panel preview plays
- **THEN** every duration and stagger delay stretches by the same factor, so a
  preset can be studied in slow motion without changing its character
- **AND** the instant option and OS reduced motion stay instant regardless

#### Scenario: No preset gates a click

- **GIVEN** any motion preset
- **WHEN** the user expands a group to reach a tab
- **THEN** the tab becomes clickable without waiting for the animation to finish
