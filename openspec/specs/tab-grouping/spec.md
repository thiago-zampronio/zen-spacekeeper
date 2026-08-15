# tab-grouping Specification

## Purpose
Decide which group each tab belongs to, deriving a key from the URL and from the
user's rules, and keep that assignment correct throughout the tab's lifetime.

## Requirements

### Requirement: Automatic tab grouping

The system SHALL, while enabled, assign each eligible tab to a group in its Space
whose key matches the one derived from the tab's URL, creating the group when it
does not yet exist.

#### Scenario: First tab of a key

- **GIVEN** no `github` group exists in the tab's Space
- **WHEN** the user opens `https://github.com/some/repo`
- **THEN** a group with key `github` is created in that Space
- **AND** the tab is placed in it

#### Scenario: Additional tab of the same key

- **GIVEN** a `github` group already exists in the tab's Space
- **WHEN** the user opens `https://github.com/other/repo`
- **THEN** the tab is added to the existing group
- **AND** no new group is created

### Requirement: Key derivation by domain

The system SHALL derive the group key from the URL's registrable domain, discarding
the `www` prefix and the public suffix.

#### Scenario: www prefix

- **WHEN** the user opens `https://www.github.com/x`
- **THEN** the group key is `github`

#### Scenario: Path and parameters ignored

- **WHEN** the user opens `https://github.com/org/repo?tab=issues`
- **THEN** the group key is `github`

### Requirement: Handling of compound suffixes

The system SHALL recognize second-level public suffixes, so that the key is never
the suffix itself.

#### Scenario: Second-level country suffix

- **WHEN** the user opens `https://loja.exemplo.com.br/produto`
- **THEN** the group key is `exemplo`
- **AND** the key is neither `com` nor `br`

#### Scenario: Same-name domains under different suffixes

- **WHEN** the user opens `https://youtube.com` and `https://youtube.com.br`
- **THEN** both tabs receive the key `youtube`
- **AND** they end up in the same group of the Space

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

### Requirement: Custom rules

The system SHALL allow rules that associate a set of domains with a group named by
the user, and those rules SHALL take precedence over the key derived from the
domain.

#### Scenario: Distinct domains under one rule

- **GIVEN** a `Dev` rule covering `github.com` and `stackoverflow.com`
- **WHEN** the user opens one tab of each domain in the same Space
- **THEN** both end up in the same group labeled `Dev`

#### Scenario: Precedence over the domain

- **GIVEN** a `Dev` rule covering `github.com`
- **WHEN** the user opens `https://github.com/x`
- **THEN** the tab goes to the `Dev` group
- **AND** no `github` group is created

#### Scenario: Rule applies per Space

- **GIVEN** a `Dev` rule covering `github.com`
- **WHEN** the user opens `github.com` in two different Spaces
- **THEN** there is a `Dev` group in each Space, independent of each other

### Requirement: Minimum tabs to form a group

The system SHALL create a group only when the number of tabs with the same key in
the same Space reaches the configured minimum, and that threshold SHALL apply only
at creation time, never dissolving a group that already exists.

#### Scenario: Below the minimum

- **GIVEN** the configured minimum is 2
- **AND** there is no `example.com` tab in the Space
- **WHEN** the user opens the first `example.com` tab
- **THEN** the tab stays outside of any group

#### Scenario: Minimum reached

- **GIVEN** the configured minimum is 2
- **AND** there is an ungrouped `example.com` tab in the Space
- **WHEN** the user opens the second `example.com` tab in the same Space
- **THEN** a group is created containing both tabs

#### Scenario: Group shrinks below the minimum

- **GIVEN** the configured minimum is 3
- **AND** a `github` group with three tabs
- **WHEN** the user closes one of those tabs
- **THEN** the `github` group keeps existing with the two remaining tabs
- **AND** the tabs are not released from the group

### Requirement: Non-groupable URLs

The system SHALL ignore tabs whose URL has no groupable host, including browser
internal pages and local files.

#### Scenario: Internal page

- **WHEN** the user opens `about:config`
- **THEN** the tab is not grouped

#### Scenario: Local file

- **WHEN** the user opens `file:///C:/temp/nota.html`
- **THEN** the tab is not grouped

### Requirement: Exclusion list

The system SHALL leave out of automatic organization the tabs whose domain is in
the user's exclusion list.

#### Scenario: Excluded domain

- **GIVEN** `banco.com.br` is in the exclusion list
- **WHEN** the user opens `https://banco.com.br/conta`
- **THEN** the tab is not grouped

### Requirement: Re-evaluation on navigation

The system SHALL re-evaluate a tab's assignment when its URL changes to a domain
with a different key.

#### Scenario: Navigation to another domain

- **GIVEN** a `github.com` tab inside the `github` group
- **WHEN** the user navigates in that tab to `https://youtube.com`
- **THEN** the tab moves to the `youtube` group of the same Space

#### Scenario: Navigation to a domain with no possible group

- **GIVEN** the configured minimum is 2
- **AND** a `google.com` tab inside the `google` group
- **WHEN** the user navigates in that tab to `maxmilhas.com`, which has no other tab
- **THEN** the tab leaves the `google` group
- **AND** stays loose in the Space, without forming a group

#### Scenario: Navigation within the same domain

- **GIVEN** a `github.com` tab inside the `github` group
- **WHEN** the user navigates to another `github.com` page
- **THEN** the tab stays in the same group

### Requirement: Recognition of its own groups after restart

The system SHALL recognize as its own the groups it created when they come back
through session restore, and SHALL NOT create a second group for a key that already
has a restored group in the same Space.

#### Scenario: Restored group is reused

- **GIVEN** a `youtube` group created by the system in the "Trabalho" Space
- **WHEN** the browser is restarted and the session is restored
- **AND** the user opens another `youtube.com` tab in that Space
- **THEN** the tab enters the restored `youtube` group
- **AND** no second `youtube` group is created

#### Scenario: User group with the same name is not recovered

- **GIVEN** a `youtube` group created manually by the user
- **AND** no group with that key was created by the system in that Space
- **WHEN** the user opens a `youtube.com` tab
- **THEN** the user's group stays untouched
- **AND** the system creates its own group

### Requirement: Recovering unmarked groups

The system SHALL offer a command that recovers plain unmarked groups whose tabs all
produce the same key, and SHALL NOT recover them automatically — recovery is always
requested by the user.

This requirement exists because any change in the way groups are marked leaves the
previous ones unmarked: without the marking they are not reused, do not receive the
collapse styling and are not reached by the commands.

#### Scenario: Group from a previous version is recovered

- **GIVEN** an unmarked `youtube` group, with all tabs from `youtube.com`
- **WHEN** the user triggers the recover command
- **THEN** the group becomes recognized as belonging to the system
- **AND** new `youtube.com` tabs enter it instead of creating another group

#### Scenario: User's thematic group is not recovered

- **GIVEN** an unmarked `Estudos` group, with tabs from different domains
- **WHEN** the user triggers the recover command
- **THEN** the group stays unmarked
- **AND** keeps being treated as the user's own organization

### Requirement: Group binding survives restore

The system SHALL preserve the binding between group and key in its own storage, and
SHALL NOT discard that binding at moments in which the groups have not been restored
yet.

#### Scenario: Recognition after the restore finishes

- **GIVEN** system groups restored by the session after the script initializes
- **WHEN** the user opens a tab whose key matches a restored group
- **THEN** the tab enters the existing group
- **AND** no new group is created for the same key

#### Scenario: Binding is not discarded at initialization

- **GIVEN** a saved binding for groups that have not been restored yet
- **WHEN** the script initializes and there are still no groups in the window
- **THEN** the saved binding stays intact

### Requirement: Removal of empty groups

The system SHALL remove the groups it created as soon as they are left with no tabs.

#### Scenario: Last tab closed

- **GIVEN** a `github` group created by the system with exactly one tab
- **WHEN** the user closes that tab
- **THEN** the group is removed from the Space

#### Scenario: User group emptied

- **GIVEN** an `Estudos` group created by the user with exactly one tab
- **WHEN** the user closes that tab
- **THEN** the `Estudos` group is not removed by the system

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
