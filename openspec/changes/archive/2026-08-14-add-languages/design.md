## Context

Visible text today lives in two places: 73 strings in the panel and 104 in the
script, all in Portuguese, written in the middle of the logic.

The loader registers `content userchrome ../resources/`, so a file in
`<profile>/chrome/resources/` is reachable at `chrome://userchrome/content/…`. The
chrome script can import it with `ChromeUtils.importESModule`, and so can the panel
page — which allows a single catalog with no duplicated text.

## Goals / Non-Goals

**Goals:**

- Usable in English, Brazilian Portuguese and Spanish.
- One single place to write and review everything the product says.
- Never display an internal key nor empty text.

**Non-Goals:**

- More languages for now.
- Translating diagnostic messages (self-test, log file).
- Pluralization with per-language rules beyond what is needed.

## Decisions

### English as the base, not as a translation

The natural choice would be to keep Portuguese as the original and translate from
it — the author is Brazilian and the texts already exist. It would be wrong for two
reasons.

The fallback language has to be, by definition, the only complete one: if a key is
missing in Spanish, something has to answer for it. Making Portuguese play that
role would leave most Zen users in a language they cannot read.

And English written as a translation of Portuguese inherits Portuguese syntax. The
texts are rewritten in English from meaning, not from the current text — Portuguese
becomes a translation like the others.

### The catalog in `resources/`, not in `JS/`

`chrome/JS/` is swept by the loader and everything there is executed. The catalog is
not a behavior script; living in `resources/` keeps it from being loaded as one and
makes it clear that it is data.

Both consumers import the same file over `chrome://userchrome/content/`. If the
import fails, the product falls back to showing the raw keys instead of going blank
— a translation failure must never become a broken interface.

### Language matching by prefix

`pt`, `pt-BR` and `pt-PT` all lead to Brazilian Portuguese; `es-AR` and `es-ES` lead
to Spanish. Comparing the prefix covers the variants without maintaining a list.

European Portuguese getting Brazilian Portuguese is a deliberate decision: the
vocabulary differences are smaller than the distance between Portuguese and English.

### A missing translation shows in English and is recorded

Two things at once: the user sees English, and whoever develops finds out. A silent
fallback would hide a missing translation for release after release — the same
mistake as the diagnostics that failed quietly.

### `auto` as the preference default

`zen.stg.locale` accepts `auto`, `en`, `pt-BR` and `es`. Pinning a language is an
explicit choice; the default follows the browser, which is what most people expect.

## Risks / Trade-offs

- **Translation volume.** Three languages for every visible text, including the long
  help texts that were just reviewed. Bad translations are worse than no translation,
  and the Spanish will not get a native speaker's review.
- **Drift between languages over time.** Fixing the wording in one language and
  forgetting the others. Mitigated by the catalog being single and checkable —
  `verify.ps1` can compare the keys across languages.
- **Immediate rework.** The texts reviewed by the three-perspective workflow were
  written in Portuguese; they become the basis for translation, and the English has
  to be written with the same care, not machine-translated.
