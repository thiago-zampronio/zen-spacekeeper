## MODIFIED Requirements

### Requirement: Open groups sit above collapsed ones

The system SHALL, when focus mode is active with either strategy and the
reorder option is enabled, keep a Space's expanded groups above its collapsed
groups by moving a group at the moment it closes, opens, or is created — a
group that collapses sinks below the open cluster, a group that expands rises
above the collapsed cluster, and a group born expanded rises the same way, so
that a group is never left below the collapsed cluster on the strip where it
first appeared; the move SHALL be minimal, preserving the user's order
inside each cluster; the option SHALL be off as the raw fallback and for
profiles that predate the first-run seed, while the seed enables it on fresh
profiles as part of the recommended experience; SHALL react to
collapse, expand and creation only — never to tab focus, never during a drag —
and SHALL leave loose tabs at the bottom as specified elsewhere.

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

Creation is the third moment because a new group is anchored at its own tab's
position, and the loose-tab settle has already moved that tab to the end of
the Space: without the reorder at birth, the group the user just opened is the
one group guaranteed to appear at the bottom, under everything closed. It also
removes a second-order symptom — with the move deferred to the next collapse
event, the new group only rose once the user clicked another tab, which read
as the grouping itself having been late.

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

#### Scenario: A newly created group rises

- **GIVEN** focus mode is on with reorder enabled
- **AND** the Space's strip ends with a cluster of collapsed groups
- **WHEN** a tab is grouped for the first time and a `slack` group is created
  for it, expanded, below that collapsed cluster
- **THEN** `slack` moves above the collapsed groups, into the open cluster
- **AND** it does so without waiting for any group to collapse or expand

#### Scenario: A group created already on top does not move

- **GIVEN** focus mode is on with reorder enabled
- **AND** no collapsed group sits above the position where the group is born
- **WHEN** the group is created
- **THEN** the strip order does not change

#### Scenario: The reposition slides instead of jumping

- **GIVEN** focus mode is on with reorder enabled, a motion preset other than
  instant, and the OS not asking for reduced motion
- **WHEN** a group rises on expand, rises on creation, or sinks on collapse
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
- **WHEN** the user switches tabs without any group opening, closing or being
  created
- **THEN** the strip order does not change

#### Scenario: Reorder off means order untouched

- **GIVEN** focus mode is on with reorder disabled
- **WHEN** groups open, close and are created
- **THEN** the strip order does not change

#### Scenario: Other Spaces are never touched

- **GIVEN** reorder enabled and two Spaces with groups
- **WHEN** a group of the active Space sinks or rises
- **THEN** the groups of the other Space keep their order
