## Purpose

Keep the group binding map from growing forever without ever endangering the
recognition of restored groups.

## ADDED Requirements

### Requirement: The binding map does not grow without end

The system SHALL remove, without user action, binding entries whose groups no
longer exist, and SHALL do so only at a moment when session restore is complete —
so a binding that a restored group still needs is never discarded.

The manual regroup command already prunes; this requirement removes the dependence
on the user happening to run it. The existing "Group binding survives restore"
requirement remains the guard: pruning during startup is exactly what it forbids.

#### Scenario: Dead entries are removed during the session

- **GIVEN** the binding map holds entries for groups that no longer exist
- **WHEN** the session has been running past the point where restore is complete
- **THEN** the dead entries are removed
- **AND** entries for live groups remain

#### Scenario: Restored groups are never orphaned by the prune

- **GIVEN** a group restored by the session carries a binding in the map
- **WHEN** the automatic prune runs
- **THEN** that binding is preserved
- **AND** the group keeps being recognized as the system's own
