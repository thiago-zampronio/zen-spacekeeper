## Context

The loader already registers `content userchrome ../resources/` in the
`chrome.manifest`, so any file in `<profile>/chrome/resources/` is served as
`chrome://userchrome/content/…`. That is the basis for the page; all that is missing
is wiring the `about:spacekeeper` address to it.

Registering an `about:` is standard XPCOM: implement `nsIAboutModule` and register
the factory under the contract
`@mozilla.org/network/protocol/about;1?what=spacekeeper`. A chrome script has the
privilege to do that.

The configuration already lives entirely in `zen.stg.*`, with observers that apply
changes live. The panel needs no propagation mechanism of its own: writing the pref
already makes the organizer react.

## Goals / Non-Goals

**Goals:**

- Discover what is configurable without reading documentation.
- Edit rules and exclusions without writing JSON.
- Keep working entirely through `about:config` for anyone who prefers it.

**Non-Goals:**

- A configuration store of its own.
- Syncing across devices, importing or exporting.
- A visual per-group color editor.

## Decisions

### A page with chrome privilege

The module is registered with the flags that make the page load in the parent
process with UI privilege. That is what allows reading and writing `Services.prefs`
directly, with no message bridge between processes.

The cost is real and has to be said: **a script running on that page has full
privilege over the browser**. The counterpart is confinement — the page is local,
loads nothing from the network, and interprets no third-party content. The
alternative (a content page with a bridge) would trade that risk for a message
channel that would also need to be carefully restricted, with considerably more code.

### A view, not a copy

The panel reads on open and writes on every change, with no intermediate state. That
way no divergence is possible between what the panel shows and what the organizer
uses — which would be the worst defect a settings screen can have.

Accepted consequence: two panel windows open at the same time do not update each
other. Preferable to keeping a cache.

### Invalid configuration is not erased

If `customRules` holds broken JSON, the panel warns and shows the raw text for
fixing, instead of overwriting it with an empty list. Whoever edited it by hand may
have something recoverable in there.

### Subdomain by list, not by custom rule

The Google case could be solved with custom rules — one rule per subdomain. It would
be worse: it would require enumerating `mail`, `drive`, `docs`, `calendar` and every
new service, and naming each one by hand.

The list declares the **intent** ("this site deserves host granularity") and the
system derives the rest on its own. One line covers every existing and future
subdomain.

Precedence order in key derivation, from strongest to weakest: exclusion, custom
rule, subdomain (global or by list), registrable domain.

### Subdomain label: two forms, one choice

In subdomain mode the label stops being the full host. Two forms are available:

- **host without the suffix** — `mail.google`, `drive.google`. Always unambiguous.
- **the subdomain alone** — `mail`, `drive`, `docs`. More readable, ambiguous by
  nature.

The default is the first. The second reads better when you have a single site in the
list, and gets worse with more than one: `google.com` and `yahoo.com` together
produce two distinct groups both labeled `mail`.

That does not confuse the system — identity comes from the key
(`host:mail.google.com`), never from the text, exactly as when renaming a group by
hand. It confuses only the reader, and the reader is the one choosing.

When the host has no subdomain (`google.com` in the list, tab on `google.com`), the
short label falls back to the domain: `google`. Without that the label would be
empty.

Switching the style regroups nothing, because it does not touch the key.

### Aesthetics

Declared reference: the macOS preference panes. In concrete terms — sections as cards
with soft corners over a neutral background, one-pixel separators between rows, label
on the left and control on the right, a secondary description in a muted tone, system
typography, low density. No borders on fields until focus, no pronounced shadows, no
accent color beyond the one the theme already uses.

Light and dark themes come from `prefers-color-scheme`, with no toggle of our own:
the page follows the browser.

## Risks / Trade-offs

- **Chrome privilege on the page.** Mitigated by local confinement and by never
  interpreting external content. It is still the riskiest decision in the project.
- **Registering an `about:` uses internal Firefox API.** If the contract changes, the
  address stops resolving. The panel disappears; the organizer keeps working, and the
  prefs stay editable through `about:config`.
- **Name collision.** If Zen ever registers `about:spacekeeper`, our registration may
  fail or overwrite. Detectable at registration; document it.
- **Two panel windows drift apart** until reopened. Accepted, to avoid a cache.
