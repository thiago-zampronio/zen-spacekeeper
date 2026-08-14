# languages Specification

## Purpose
Let the product be used in English, Brazilian Portuguese and Spanish, with a single
place where every visible text is written and reviewed.

## Requirements

### Requirement: Language following the browser

The system SHALL choose the language from the browser's language, among English,
Brazilian Portuguese and Spanish.

#### Scenario: Browser in Portuguese

- **GIVEN** the browser is set to Portuguese
- **WHEN** the user opens the panel
- **THEN** the texts appear in Brazilian Portuguese

#### Scenario: Browser in Spanish

- **GIVEN** the browser is set to Spanish
- **WHEN** the user opens the panel
- **THEN** the texts appear in Spanish

#### Scenario: Regional variant of the same language

- **GIVEN** the browser is set to European Portuguese
- **WHEN** the user opens the panel
- **THEN** the texts appear in Brazilian Portuguese

### Requirement: English as the base language

The system SHALL use English when the browser's language is not one of the
available languages, and SHALL display the English text when a specific text has no
translation.

#### Scenario: Language not available

- **GIVEN** the browser is set to Japanese
- **WHEN** the user opens the panel
- **THEN** the texts appear in English

#### Scenario: Text with no translation

- **GIVEN** a text that exists in English and does not exist in Spanish
- **AND** the language in use is Spanish
- **WHEN** that text is displayed
- **THEN** the English version appears
- **AND** the system SHALL NOT show the internal key nor empty space

### Requirement: Language pinned by the user

The system SHALL allow pinning a language independently of the browser, and that
choice SHALL take effect without restarting.

#### Scenario: Pin Spanish with the browser in Portuguese

- **GIVEN** the browser is in Portuguese
- **WHEN** the user picks Spanish in the panel
- **THEN** the texts start appearing in Spanish

#### Scenario: Go back to following the browser

- **GIVEN** a pinned language
- **WHEN** the user chooses to follow the browser
- **THEN** the language goes back to the browser's

### Requirement: Single catalog

Every text visible to the user SHALL come from a single catalog, shared by the panel
and by the rest of the product, and there SHALL NOT be visible text written inside
the logic.

#### Scenario: The same text in both places

- **GIVEN** a command that appears in the browser menu and in the panel
- **WHEN** the language changes
- **THEN** both places change together, with the same wording

#### Scenario: Wording review

- **WHEN** someone fixes the wording of a text
- **THEN** changing the catalog is enough, with no need to touch the logic

### Requirement: A missing translation is visible to whoever develops

The system SHALL record when a text is displayed in English because a translation is
missing, without interrupting use.

#### Scenario: Key absent in the language in use

- **GIVEN** the language in use is Spanish
- **AND** a text has no Spanish translation
- **WHEN** that text is displayed
- **THEN** the product keeps working normally
- **AND** the absence is recorded for whoever develops
