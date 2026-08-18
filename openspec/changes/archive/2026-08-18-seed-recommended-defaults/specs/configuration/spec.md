# Delta: configuration — first-run seeding of the recommended experience

## ADDED Requirements

### Requirement: First run seeds the recommended experience

The system SHALL, on the first run in a profile that shows no prior use — no
seeding marker and no stored group map — write the recommended configuration
as explicit preferences: focus mode on with the idle strategy, the reorder
option on, ten kept groups, the fold motion, and `google.com` grouped by
subdomain with the short subdomain label. The system SHALL record the
decision in a marker preference set in both branches — seeded, or skipped
because the profile already had a group map — so the logic runs at most once
per profile; SHALL NOT alter the code's fallback defaults; SHALL NOT touch
any other preference — never the diagnostic log switch, stored colors, the
group map, or the update check; and SHALL leave a profile with prior use
entirely unchanged.

The recommended values are ordinary preferences once written: the user
changing any of them afterwards behaves exactly like any other configuration
change, with no memory of the seed.

#### Scenario: A fresh profile gets the recommended experience

- **GIVEN** a profile where the mod has never run — no marker, no group map
- **WHEN** the browser starts with the mod installed
- **THEN** the recommended preferences are written before the first
  organization pass, and the first session already groups `google.com` by
  subdomain with focus mode on

#### Scenario: An existing profile is never touched

- **GIVEN** a profile with a stored group map and no marker — a user updating
  from an earlier version
- **WHEN** the browser starts after the update
- **THEN** no preference value changes
- **AND** the marker is set, recording that seeding was considered and
  skipped

#### Scenario: Seeding never runs twice

- **GIVEN** a profile whose marker is set
- **WHEN** the browser starts, on any later version
- **THEN** the seeding logic writes nothing

#### Scenario: The seed does not survive the user's own choices

- **GIVEN** a seeded profile
- **WHEN** the user turns focus mode off in the panel
- **THEN** it stays off across restarts, like any other configuration change
