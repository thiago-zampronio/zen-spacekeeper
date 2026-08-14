## Why

Every visible text is written in Portuguese, embedded straight into the code — 73
strings in the panel and 104 in the script. Anyone who does not speak Portuguese
cannot use the product, and the Zen Browser community is mostly international.

Worse than the language barrier is the structure: with text mixed into the code,
every wording fix means touching logic, and there is no single place to review
what the product says. The content review we just finished had to walk through two
files and dozens of edit points.

## What Changes

The product speaks **English, Brazilian Portuguese and Spanish**, choosing by the
browser's language and falling back to English when the language is not one of the
three.

English becomes the base language: it is the only translation required to be
complete, and any text missing in another language shows up in English instead of
disappearing or exposing the internal key.

Every visible text leaves the code and moves into a single catalog, shared by the
panel and the script. Text written in the middle of logic ceases to exist.

Anyone who prefers a language other than the browser's can pin one, from the panel.

Out of scope: more languages, machine translation, and diagnostic texts aimed at
whoever is debugging the product — the self-test case names and the log file
messages stay in a single language.

## Capabilities

### New Capabilities

- `languages`: language selection, a single text catalog, and the rule for falling
  back to the base language.

## Impact

- A new catalog file in `<profile>/chrome/resources/`, importable by both the
  script and the page — a single source, with no duplicated text.
- A new `zen.stg.locale` preference (`auto`, `en`, `pt-BR`, `es`).
- Every visible text in the panel and in the script now comes from the catalog.
- The current Portuguese texts become the `pt-BR` translation; English is written
  as the base, not as a translation of the Portuguese.
- No grouping behavior changes.
