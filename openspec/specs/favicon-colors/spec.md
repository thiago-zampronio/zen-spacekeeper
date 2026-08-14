# favicon-colors Specification

## Purpose
Derive a group's color from the logo of the site it represents, so that the color
carries information instead of being arbitrary.

## Requirements

### Requirement: Color derived from the favicon

The system SHALL, when derivation is enabled, choose a group's color from the
predominant color of the site's favicon, approximated to the nearest native color
among those the browser accepts.

#### Scenario: Site with a strongly colored logo

- **GIVEN** favicon derivation is enabled
- **WHEN** a group is created for `youtube.com`, whose favicon is predominantly red
- **THEN** the group receives the native color `red`

#### Scenario: Approximation by hue

- **GIVEN** a favicon whose predominant color is a dark orange
- **WHEN** the group's color is derived
- **THEN** the group receives `orange`
- **AND** the choice does not depend on the light or dark theme in use

### Requirement: Stability of the derived color

The system SHALL compute a key's color only once and persist it, keeping it the
same across Spaces and across sessions.

#### Scenario: Same color in another Space

- **GIVEN** a `youtube` group with the derived color `red`
- **WHEN** a group with the same key is created in another Space
- **THEN** it is also `red`

#### Scenario: Color kept after restart

- **GIVEN** a group with a derived color
- **WHEN** the browser is restarted
- **THEN** the color is not recomputed and stays the same

### Requirement: Precedence of the manual choice

The system SHALL respect the color the user set manually, without overwriting it
with the color derived from the favicon.

#### Scenario: User changes the color of a derived group

- **GIVEN** a `youtube` group with the derived color `red`
- **WHEN** the user changes the group's color to blue
- **AND** the group is recreated later
- **THEN** it is blue

### Requirement: Fallback to the previous behavior

The system SHALL use the key-hash color whenever derivation is not possible, and
the absence of a favicon SHALL NOT prevent the group from being created.

#### Scenario: Site without a favicon

- **GIVEN** a site that provides no favicon
- **WHEN** a group is created for it
- **THEN** the group receives the key-hash color

#### Scenario: Failure to read the favicon

- **GIVEN** a favicon that cannot be read
- **WHEN** the color is derived
- **THEN** the group receives the key-hash color
- **AND** the group is created normally

#### Scenario: Achromatic logo

- **GIVEN** a favicon that is predominantly black, white or gray
- **WHEN** the color is derived
- **THEN** the group receives `gray`

### Requirement: Derivation can be turned off

The system SHALL allow derivation to be turned off by preference, falling back to
the hash color for the keys computed from that point on.

#### Scenario: Derivation turned off

- **GIVEN** favicon derivation is turned off
- **WHEN** a group is created for a site with a colored favicon
- **THEN** the group receives the key-hash color

### Requirement: Derivation does not block grouping

Reading the favicon SHALL happen without preventing or delaying the group's creation.

#### Scenario: Favicon not loaded yet

- **GIVEN** a tab whose favicon has not arrived yet
- **WHEN** the group is created
- **THEN** the group is created immediately with the hash color
- **AND** the derived color is applied as soon as the favicon is available

### Requirement: The derived color is snapped to the browser's palette

The system SHALL express every group color as one of the colors the browser's
native groups accept, and SHALL choose the closest one to the color derived from
the site.

The browser offers a fixed, small palette for tab groups. The derived color is
therefore an approximation by construction, not by defect: a site whose logo is a
shade the palette does not contain will show as its nearest neighbour.

#### Scenario: A logo outside the palette

- **GIVEN** a site whose logo is a color the palette does not contain
- **WHEN** a group is created for it
- **THEN** the group takes the closest available color

#### Scenario: A dark or colorless logo

- **GIVEN** a site whose logo is essentially black, white or grey
- **WHEN** a group is created for it
- **THEN** the group takes the neutral color of the palette

#### Scenario: The approximation is stated where the option is offered

- **WHEN** the user is offered the option to derive colors from the site
- **THEN** the explanation states that the result is the closest of a limited set

### Requirement: Classification survives a theme change

The system SHALL decide which palette color a site maps to in a way that does not
depend on how the browser renders those colors under the current theme.

The palette's colors resolve to different values in light and dark themes. A
mapping based on the rendered value would be right in one theme and wrong in the
other, and would change under the user without the site having changed.

#### Scenario: Theme switched

- **GIVEN** a group whose color was derived from its site
- **WHEN** the user switches between the light and dark themes
- **THEN** the group keeps the same palette color
