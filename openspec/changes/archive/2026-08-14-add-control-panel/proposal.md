## Why

All of the organizer's configuration lives in `about:config`, under the `zen.stg.`
prefix. It works, but it is hostile: it requires knowing the prefs exist, writing
JSON by hand for custom rules, and it gives no sense of the whole — which options
exist, what each one does, how they relate.

The product has gained enough functionality (twelve preferences, five commands,
rules, exclusions, colors) that the absence of a screen is what gets most in the way
of using it.

Alongside that, subdomain grouping is all-or-nothing today. Turning the global pref
on separates `mail.google.com` from `drive.google.com`, but it also separates every
other site with subdomains, which is rarely wanted. Granularity is missing: wanting
Google split across Gmail, Drive and search **without** everything else fragmenting.

## What Changes

A control panel reachable at `about:spacekeeper`, opened like any tab, typed into
the address bar.

The screen groups the configuration by subject, shows the effect of each option in
plain language, and allows editing custom rules and exclusions without writing JSON.
The manual commands and the self-test are one click away.

The panel is a **view over the preferences**, not a parallel store: everything it
writes stays in `zen.stg.*`, and changes made in `about:config` show up in it.
Nothing stops working for anyone who prefers the raw pref.

Subdomain grouping gains a list of domains: those in it are grouped by host, and the
rest stays grouped by domain. The global pref remains, for anyone who wants the
behavior everywhere.

Out of scope: syncing configuration across devices, importing or exporting
configuration, and anything that depends on the network.

## Capabilities

### New Capabilities

- `control-panel`: configuration screen at `about:spacekeeper`, a view over the
  existing preferences.

### Modified Capabilities

- `tab-grouping`: subdomain grouping now accepts a list of specific domains, in
  addition to the global switch.

## Impact

- A new page file in `<profile>/chrome/resources/`, served by
  `chrome://userchrome/content/`, which the loader already registers.
- Registration of an `about:` module of our own, undone when the window closes.
- **The page runs with chrome privilege**, to read and write preferences without a
  bridge. Consequence: no remote content, no network, no external resource —
  everything local and under our control.
- A new `zen.stg.subdomainDomains` preference.
- No existing preference changes name or meaning.
