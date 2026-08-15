## Purpose

Give browser-internal pages the one home they obviously have, instead of letting
them drift loose between the groups.

## ADDED Requirements

### Requirement: Internal pages join the System group

The system SHALL, when the system-group preference is enabled (the default), place
tabs showing browser-internal pages (`about:` and `chrome:` schemes) into one
System group per Space, labeled from the text catalog and identified by a fixed
key — and SHALL NOT place `about:blank` or empty-tab placeholders in it.

The System group is a regular group of the system's: Space-isolated, reused after
restart, reached by the commands, styled like the others.

#### Scenario: An internal page is grouped

- **GIVEN** the system-group preference is enabled
- **WHEN** the user opens `about:config`
- **THEN** the tab joins the Space's System group
- **AND** a second internal page joins the same group

#### Scenario: Space isolation holds

- **GIVEN** internal pages open in two Spaces
- **WHEN** they are organized
- **THEN** each Space has its own System group
- **AND** no tab changes Space

#### Scenario: about:blank stays out

- **WHEN** a tab shows `about:blank`
- **THEN** it is not grouped

#### Scenario: Turned off

- **GIVEN** the system-group preference is disabled
- **WHEN** the user opens an internal page
- **THEN** the tab is not grouped, as before

## MODIFIED Requirements

### Requirement: Non-groupable URLs

The system SHALL ignore tabs whose URL has no groupable destination: local files,
blank placeholders, and — when the system-group preference is disabled —
browser-internal pages.

#### Scenario: Local file

- **WHEN** the user opens `file:///C:/temp/nota.html`
- **THEN** the tab is not grouped

#### Scenario: Blank placeholder

- **WHEN** a tab shows `about:blank`
- **THEN** the tab is not grouped

#### Scenario: Internal page with the system group disabled

- **GIVEN** the system-group preference is disabled
- **WHEN** the user opens `about:config`
- **THEN** the tab is not grouped
