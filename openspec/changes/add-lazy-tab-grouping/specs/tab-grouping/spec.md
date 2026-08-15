## Purpose

A restored tab that has not loaded yet is still a tab showing a site; it must
group like one, without being loaded for it.

## ADDED Requirements

### Requirement: Unloaded tabs group from their session URL

The system SHALL derive an unloaded restored tab's key from the URL the session
remembers for it, SHALL NOT load the tab to do so, and SHALL organize each Space's
eligible tabs on that Space's first activation of the session, so a restored
session regroups as it is visited.

The clean-handover reset dissolves every group and promises the new version
regroups from scratch; without this, that promise held only for tabs that happened
to load.

#### Scenario: A restored Space regroups on first visit

- **GIVEN** a session restored with unloaded tabs in a background Space
- **WHEN** the user activates that Space for the first time
- **THEN** its eligible tabs are grouped by the sites their session URLs name
- **AND** no tab is loaded by the organization

#### Scenario: Manual regroup reaches unloaded tabs

- **GIVEN** unloaded restored tabs in the current Space
- **WHEN** the user triggers the regroup command
- **THEN** those tabs are grouped by their session URLs

#### Scenario: A tab with no remembered URL

- **GIVEN** an unloaded tab whose session remembers no URL
- **WHEN** the system organizes
- **THEN** the tab is left loose, as a blank tab would be
