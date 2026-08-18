# group-presentation Specification

## Purpose
Define how a group presents itself to the user — label, color, and collapse state — and
ensure that this appearance stays stable across Spaces and across sessions.

## Requirements

### Requirement: Label derived from the key

The system SHALL label the groups it creates with the corresponding group key,
displayed with each dot-separated part's first letter uppercased; SHALL apply the same casing when
reclaiming a group whose label is still the derived one; and SHALL NOT alter a
label the user renamed.

#### Scenario: Group by domain

- **WHEN** a group is created for `https://www.youtube.com/watch`
- **THEN** the displayed label is `Youtube`

#### Scenario: Host-style labels capitalize both parts

- **GIVEN** subdomain grouping for `google.com` with the host label style
- **WHEN** a group is created for `https://mail.google.com`
- **THEN** the displayed label is `Mail.Google`

#### Scenario: Group by custom rule

- **GIVEN** a `dev` rule covering `github.com`
- **WHEN** a group is created for `https://github.com/x`
- **THEN** the displayed label is `Dev`

#### Scenario: A rename is never recased

- **GIVEN** the user renamed a group to `estudos`
- **WHEN** the system reclaims or reorganizes that group
- **THEN** the label stays `estudos`

### Requirement: Identity independent from the label

The system SHALL identify its groups by its own marking, and not by the label text, so
that renaming a group does not break the association with the key.

#### Scenario: User renames a group

- **GIVEN** a group created by the system with key `youtube`
- **WHEN** the user renames the group to `Videos`
- **AND** opens another `youtube.com` tab in the same Space
- **THEN** the tab is added to the renamed group
- **AND** no new `youtube` group is created

### Requirement: Stable color per key

The system SHALL assign a group's color deterministically from the key and SHALL persist
that association.

#### Scenario: Same color in different Spaces

- **GIVEN** a red `youtube` group in the "Personal" Space
- **WHEN** a `youtube` group is created in the "Work" Space
- **THEN** that group is also red

#### Scenario: Color kept across sessions

- **GIVEN** a red `youtube` group
- **WHEN** the user restarts the browser
- **THEN** the recreated `youtube` group is still red

### Requirement: Color chosen by the user

The system SHALL respect the color the user sets manually for a group, preserving it in
the following recreations of that key.

#### Scenario: Manual color preserved

- **GIVEN** the user changed the `youtube` group color to blue
- **WHEN** the `youtube` group is recreated in any Space
- **THEN** it is blue

### Requirement: Collapsing hides the group's tabs

The system SHALL ensure that collapsing a group visually hides its tabs in the sidebar,
keeping only the active tab visible when it belongs to the group.

#### Scenario: Collapsed group hides the tabs

- **GIVEN** a group with three tabs, none of them active
- **WHEN** the user collapses the group
- **THEN** none of the three tabs appear in the sidebar
- **AND** the group label remains visible

#### Scenario: Active tab remains visible

- **GIVEN** a group with three tabs, one of them active
- **WHEN** the user collapses the group
- **THEN** the active tab remains visible
- **AND** the other two are hidden

#### Scenario: Third-party groups are not affected

- **GIVEN** a native Zen folder and a group created by the user
- **WHEN** the system style is applied
- **THEN** the appearance and collapse of those elements remain Zen's own

### Requirement: Collapse state preserved

The system SHALL preserve each group's collapse state, neither expanding nor collapsing a
group on its own when adding or removing tabs.

#### Scenario: Active tab enters a collapsed group with focus enabled

- **GIVEN** focus mode is enabled
- **AND** a collapsed group
- **WHEN** a new tab enters that group and receives focus
- **THEN** the group is expanded by focus mode

This is the deliberate exception to collapse preservation: focus mode keeps the active
tab's group open, and a newly opened tab is the active tab. Without focus mode, the group
stays collapsed.

#### Scenario: Tab added to a collapsed group

- **GIVEN** a collapsed `youtube` group
- **WHEN** a new `youtube.com` tab is added to it
- **THEN** the group stays collapsed

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
per selection change and then rests; SHALL scale every preset's timing — and the
preview's — by a user-set speed percentage, where 100 is the designed timing and
lower is slower; SHALL keep each preset's character legible in both directions,
so no preset reads as another on either collapse or expand; and SHALL keep the
animation scoped to the groups the system created.

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

#### Scenario: Reduced motion wins

- **GIVEN** the OS asks for reduced motion
- **WHEN** a system group collapses or expands
- **THEN** the change is instant, as before this change

#### Scenario: Native structures unaffected

- **WHEN** a Zen folder or a manual group collapses
- **THEN** its appearance is untouched by the system's styling

### Requirement: Automatic collapse of the least used groups

The system SHALL offer focus mode as a choice of strategies — off, a maximum
of groups open at once, or a maximum idle time — and SHALL, when the
groups strategy is chosen, keep expanded the N most recently used groups in
the Space — N being configurable — and collapse the rest.

Keeping only the active group open makes the sidebar flicker on every tab
switch: one group closes and another opens on every click. Preserving the last
N reduces that movement without losing the focus effect. The strategy is a
choice because "how many at once" and "how long untouched" are different
mental models of focus; a binary toggle could only ever mean one of them.

#### Scenario: Switching between two groups with N equal to 3

- **GIVEN** the groups strategy keeps 3 groups open
- **AND** the user has recently used the `github`, `youtube`, and `figma` groups
- **WHEN** the user switches between `github` and `youtube` tabs
- **THEN** the three groups remain expanded
- **AND** no group opens or closes during the switching

#### Scenario: Group drops out of the most recent ones

- **GIVEN** the groups strategy keeps 2 groups open
- **AND** the `github` and `youtube` groups are the most recent ones
- **WHEN** the user selects a tab of the `figma` group
- **THEN** `figma` and `github` are expanded
- **AND** `youtube`, now the third most recent, is collapsed

#### Scenario: Active tab's group was collapsed

- **GIVEN** focus mode is on, either strategy
- **AND** the `github` group is collapsed
- **WHEN** the user selects a tab of that group
- **THEN** the `github` group is expanded

#### Scenario: Focus mode off

- **GIVEN** focus mode is off
- **WHEN** the user switches tabs between groups
- **THEN** no group is collapsed automatically

#### Scenario: Upgrading keeps yesterday's behavior

- **GIVEN** a profile where focus mode was enabled before strategies existed
- **WHEN** the new version starts
- **THEN** focus mode runs the groups strategy with the same N as before

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

### Requirement: Idle groups collapse on their own

The system SHALL, when the idle strategy is chosen, collapse a group after a
configurable number of minutes without any of its tabs being touched — where
touching means selecting a tab, or opening or closing a tab of the group —
SHALL reset that group's clock on every touch, and SHALL never collapse the
group of the active tab.

A group nobody uses for an hour is finished work still occupying the eye; the
idle strategy retires it without the user having to decide anything.

#### Scenario: An untouched group retires

- **GIVEN** the idle strategy with a 60-minute window
- **AND** a `youtube` group whose tabs have not been touched for 60 minutes
- **WHEN** the sweep next runs
- **THEN** the `youtube` group collapses

#### Scenario: A touch resets the clock

- **GIVEN** the idle strategy with a 60-minute window
- **AND** a `github` group last touched 59 minutes ago
- **WHEN** the user selects one of its tabs
- **THEN** the group's idle clock restarts from zero

#### Scenario: The active group never retires

- **GIVEN** the idle strategy
- **AND** the active tab belongs to the `figma` group
- **WHEN** the idle window elapses with the user reading that tab
- **THEN** the `figma` group stays expanded

#### Scenario: Manual expand is respected until the next touch cycle

- **GIVEN** the idle strategy collapsed a group
- **WHEN** the user expands it by clicking its chip
- **THEN** the group's clock restarts, and it stays open for a fresh window

### Requirement: Open groups sit above collapsed ones

The system SHALL, when focus mode is active with either strategy and the
reorder option is enabled, keep a Space's expanded groups above its collapsed
groups by moving a group at the moment it closes or opens — a group that
collapses sinks below the open cluster, a group that expands rises above the
collapsed cluster; the move SHALL be minimal, preserving the user's order
inside each cluster; the option SHALL be off by default, SHALL react to
collapse and expand only — never to tab focus, never during a drag — and SHALL
leave loose tabs at the bottom as specified elsewhere.

The move SHALL be animated as a slide: the moved group glides from its old
position to its new one and the system groups it displaces glide the opposite
way, instead of repositioning in a single frame. The slide SHALL be instant
when the instant motion option is selected or when the operating system asks
for reduced motion; its timing SHALL stretch by the same user-set motion speed
percentage that scales the collapse presets; it SHALL look the same under
every motion preset; and it SHALL be cosmetic — the reorder SHALL complete,
and the strip SHALL settle in the correct final order, even when the
animation cannot be measured or played.

The ordering makes the focus visible without reading a single label: what is
open is simply what is on top, and closing something files it away downward.
The slide is what marks the reposition as intended — the expand beside it is
animated, so an instant jump reads as a glitch, exactly what the motion
presets exist to prevent.

#### Scenario: A closing group sinks

- **GIVEN** focus mode is on with reorder enabled
- **AND** the `github` group sits open above the open `youtube` group
- **WHEN** the `github` group collapses — by hand or by the focus strategy
- **THEN** `github` moves below `youtube`, to the top of the collapsed cluster

#### Scenario: An opening group rises

- **GIVEN** focus mode is on with reorder enabled
- **AND** the collapsed `figma` group sits above the open `github` group
- **WHEN** the `figma` group expands
- **THEN** `figma` moves above the collapsed groups, into the open cluster

#### Scenario: The reposition slides instead of jumping

- **GIVEN** focus mode is on with reorder enabled, a motion preset other than
  instant, and the OS not asking for reduced motion
- **WHEN** a group rises on expand or sinks on collapse
- **THEN** the group slides visibly from its old position to its new one
- **AND** the system groups it passes slide the opposite way into the gap

#### Scenario: Instant option and reduced motion mean no slide

- **GIVEN** the instant motion option is selected, or the OS asks for reduced
  motion
- **WHEN** a group rises or sinks under the reorder option
- **THEN** the reposition is instant, with no slide

#### Scenario: The speed setting stretches the slide

- **GIVEN** the motion speed is set below 100
- **WHEN** a group rises or sinks under the reorder option
- **THEN** the slide's duration stretches by the same factor as the presets

#### Scenario: A failed animation never blocks the move

- **GIVEN** focus mode is on with reorder enabled
- **WHEN** the slide cannot be measured or played
- **THEN** the group still moves to its correct position, instantly

#### Scenario: Tab focus alone moves nothing

- **GIVEN** focus mode is on with reorder enabled
- **WHEN** the user switches tabs without any group opening or closing
- **THEN** the strip order does not change

#### Scenario: Reorder off means order untouched

- **GIVEN** focus mode is on with reorder disabled
- **WHEN** groups open and close
- **THEN** the strip order does not change

#### Scenario: Other Spaces are never touched

- **GIVEN** reorder enabled and two Spaces with groups
- **WHEN** a group of the active Space sinks or rises
- **THEN** the groups of the other Space keep their order

### Requirement: Active tab without a group does not trigger collapse

The system SHALL, when the active tab does not belong to any group, leave the collapse
state of all groups in the Space as it was, even with focus mode enabled.

#### Scenario: Opening a transient tab

- **GIVEN** focus mode is enabled
- **AND** the `github` group is expanded and the `youtube` group is collapsed
- **WHEN** the user opens a new tab that does not belong to any group
- **THEN** the `github` group stays expanded
- **AND** the `youtube` group stays collapsed

### Requirement: System groups are never left nested

The system SHALL detect one of its groups sitting inside another group and restore
it as a sibling at the next organization moment, preserving the group's identity,
label, color and tabs — and SHALL NOT touch nestings that involve only the user's
own groups or folders.

Dragging is how this happens: the browser accepts the drop but renders the nested
tabs at the parent's level. Reordering is what a group drag should mean.

#### Scenario: A system group dropped inside another group

- **GIVEN** a group the system created was dragged inside another group
- **WHEN** the next organization moment runs
- **THEN** the system's group is restored as a sibling, outside the other group
- **AND** its key, label, color and tabs are preserved
- **AND** no tab changes Space

#### Scenario: The user's own structures stay theirs

- **GIVEN** a manual group nested inside another manual group or folder
- **WHEN** the system organizes
- **THEN** nothing is moved
