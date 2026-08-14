## MODIFIED Requirements

### Requirement: Optional subdomain grouping

The system SHALL use the host as the group key when subdomain grouping is enabled
globally, or when the tab's domain is in the list of domains grouped by subdomain.
In every other case, the key remains the registrable domain.

The list exists because the global switch is all-or-nothing: separating
`mail.google.com` from `drive.google.com` should not force fragmenting every other
site with subdomains.

#### Scenario: Domain in the list

- **GIVEN** `google.com` is in the list of domains grouped by subdomain
- **AND** global subdomain grouping is disabled
- **WHEN** the user opens `https://mail.google.com` and `https://drive.google.com`
- **THEN** the tabs end up in two distinct groups

#### Scenario: Domain outside the list stays grouped by domain

- **GIVEN** `google.com` is in the list
- **AND** `example.com` is not
- **WHEN** the user opens `https://a.example.com` and `https://b.example.com`
- **THEN** both tabs end up in the same `example` group

#### Scenario: Separate subdomains

- **GIVEN** subdomain grouping is enabled globally
- **WHEN** the user opens `https://mail.google.com` and `https://drive.google.com`
- **THEN** the tabs end up in two distinct groups

#### Scenario: Merged subdomains

- **GIVEN** subdomain grouping is disabled
- **AND** no domain is in the list
- **WHEN** the user opens `https://mail.google.com` and `https://drive.google.com`
- **THEN** both tabs end up in the same `google` group

#### Scenario: Group label by subdomain

- **GIVEN** `google.com` is in the list
- **AND** the label style is the host
- **WHEN** a group is created for `https://mail.google.com`
- **THEN** the group label is `mail.google`
- **AND** the public suffix does not appear in the label

#### Scenario: Short label, the subdomain alone

- **GIVEN** `google.com` is in the list
- **AND** the label style is the subdomain alone
- **WHEN** groups are created for `mail.google.com`, `drive.google.com` and `docs.google.com`
- **THEN** the labels are `mail`, `drive` and `docs`

#### Scenario: Host without a subdomain under the short label

- **GIVEN** `google.com` is in the list
- **AND** the label style is the subdomain alone
- **WHEN** a group is created for `https://google.com`
- **THEN** the group label is `google`

## ADDED Requirements

### Requirement: Label style for subdomain grouping

The system SHALL allow choosing between labeling subdomain groups by the host
without the public suffix or by the subdomain alone, and the label SHALL NOT change
the key that identifies the group.

The short label is more readable and is ambiguous by nature: two distinct domains in
the list can produce different groups with the same label. Since identity comes from
the key, and not from the text, this does not confuse the system — only the reader.

#### Scenario: Switching the style regroups nothing

- **GIVEN** existing subdomain groups
- **WHEN** the user switches the label style
- **THEN** the existing groups remain, with the same tabs

#### Scenario: Equal labels for different keys

- **GIVEN** `google.com` and `yahoo.com` are in the list
- **AND** the label style is the subdomain alone
- **WHEN** the user opens `mail.google.com` and `mail.yahoo.com`
- **THEN** there are two distinct groups
- **AND** both may display the label `mail`
