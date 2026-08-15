## Purpose

A field the user typed into and never blurred must not lose its content when the
page goes away.

## ADDED Requirements

### Requirement: A pending edit survives the page closing

The panel SHALL commit the value of a field still being edited when the page is
closed or hidden, through the same path a completed edit takes.

Fields commit when they lose focus. Closing the tab, closing the window or quitting
the browser never blurs the field, so the typed text silently vanished — the only
path where an edit was lost.

#### Scenario: The page closes with a field mid-edit

- **GIVEN** the user typed into a field and did not leave it
- **WHEN** the page is closed or hidden
- **THEN** the field's value is committed as if the field had lost focus
