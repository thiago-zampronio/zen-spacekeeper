## ADDED Requirements

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
