## Purpose

Give ungrouped tabs one predictable place — below the groups — instead of letting
them scatter between them.

## ADDED Requirements

### Requirement: Loose tabs live below the groups

The system SHALL, when the loose-tabs-at-bottom preference is enabled (the
default), keep each Space's ungrouped eligible tabs positioned after that Space's
last group whenever it organizes, preserving the loose tabs' relative order — and
SHALL NOT move pinned tabs, essential tabs, Zen folders, tabs in manual groups, or
any tab across Spaces.

Grouping forms islands around whatever was open; the tabs left out end up wedged
between islands, which is the hardest place to find them. One region — the bottom
— makes "where is that loose tab" a non-question.

#### Scenario: A loose tab wedged between groups

- **GIVEN** an ungrouped eligible tab sits between two groups in its Space
- **WHEN** the system organizes that Space
- **THEN** the tab moves below the Space's last group
- **AND** it stays in its Space and keeps its group-less state

#### Scenario: Relative order preserved

- **GIVEN** three loose tabs in a Space, in a given order
- **WHEN** they are moved below the groups
- **THEN** they keep that order among themselves

#### Scenario: Native structures untouched

- **GIVEN** pinned tabs, essential tabs, a Zen folder and a manual group in the Space
- **WHEN** the settle pass runs
- **THEN** none of them moves

#### Scenario: Turned off

- **GIVEN** the loose-tabs-at-bottom preference is disabled
- **WHEN** the system organizes
- **THEN** no loose tab is repositioned, as before
