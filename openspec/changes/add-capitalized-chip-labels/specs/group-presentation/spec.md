# Delta for group-presentation

## Purpose

One casing pattern on the strip: derived labels start with a capital letter.

## MODIFIED Requirements

### Requirement: Label derived from the key

The system SHALL label the groups it creates with the corresponding group key,
displayed with the first letter uppercased; SHALL apply the same casing when
reclaiming a group whose label is still the derived one; and SHALL NOT alter a
label the user renamed.

#### Scenario: Group by domain

- **WHEN** a group is created for `https://www.youtube.com/watch`
- **THEN** the displayed label is `Youtube`

#### Scenario: Group by custom rule

- **GIVEN** a `dev` rule covering `github.com`
- **WHEN** a group is created for `https://github.com/x`
- **THEN** the displayed label is `Dev`

#### Scenario: A rename is never recased

- **GIVEN** the user renamed a group to `estudos`
- **WHEN** the system reclaims or reorganizes that group
- **THEN** the label stays `estudos`
