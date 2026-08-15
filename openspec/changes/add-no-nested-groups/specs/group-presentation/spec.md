## Purpose

A group inside a group renders broken — the nested tabs appear at the parent's
level — so the system's groups must never stay nested.

## ADDED Requirements

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
