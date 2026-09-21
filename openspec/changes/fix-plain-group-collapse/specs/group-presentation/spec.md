## MODIFIED Requirements

### Requirement: Collapsing hides the group's tabs

The system SHALL ensure that collapsing a group visually hides its tabs in the sidebar,
keeping only the active tab visible when it belongs to the group.
This SHALL hold both for the groups the system creates and for the groups the user
created by hand, whose tabs the browser itself leaves visible; the system SHALL change
nothing else about a group it did not create, and SHALL leave native folders entirely
to the browser.

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
- **THEN** their appearance remains Zen's own: no system color, no system label, no motion
  preset
- **AND** a native folder's collapse remains Zen's own

#### Scenario: A group the user made by hand also hides its tabs

- **GIVEN** a group the user created by hand, with three tabs, none of them active
- **AND** the browser no longer hides the tabs of such a group when it is collapsed
- **WHEN** the user collapses it
- **THEN** none of the three tabs appear in the sidebar
- **AND** the group keeps the browser's own appearance
