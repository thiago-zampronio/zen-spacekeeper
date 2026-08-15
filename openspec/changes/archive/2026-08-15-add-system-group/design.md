## Context

`GROUPABLE_SCHEMES` is http/https; everything else returns no key and stays loose.
Internal pages are the loose tabs users actually accumulate — settings, the panel,
about:config — and they share no domain to group by.

## Goals / Non-Goals

**Goals:** one System group per Space that behaves exactly like every other group,
off-switchable, translated label, fixed identity.

**Non-Goals:** file: URLs (user documents, not system pages); any special styling.

## Decisions

**Key `system:`, label from the catalog.** Identity stays fixed and rename-proof
like every group (the key drives matching, the label is presentation). The core
stays pure: `keyFromParts` returns `{ key: "system:", label: "System" }` and the
chrome-side wrapper swaps the label for `t("group.system")` — the derivation tests
keep running under node with the English label, no i18n import in the core.

**Schemes: `about:` and `chrome:`, with `about:blank` excluded by path.** The user
named "about, config, system pages"; both schemes are what those resolve to. The
blank page is a placeholder tabs pass through — grouping it would flicker groups
into existence during navigation. Zen's empty tabs are already excluded by
eligibility (`zen-empty-tab`).

**Gated by `zen.stg.systemGroup`, default on.** The behavior is the reason the
change exists, so it defaults on; the off position restores today's behavior
exactly (internal pages non-groupable). Existing users get it on their next update
— the clean-handover reset already regroups from scratch.

**Hash color like any key.** `system:` gets its stable hash color; favicon
derivation naturally does not apply (internal pages mostly have none), and a manual
color sticks, as everywhere.

## Risks / Trade-offs

- [about:reader or about: pages that wrap real content] → reader mode URLs are
  `about:reader?url=...` and would land in System rather than the site's group;
  accepted for v1 and revisitable — the reader page IS browser UI around content.
- [The label string translated later than the group was created] → the label is
  set at creation from the current locale; a locale switch renames nothing (same
  as renamed groups), and the key keeps matching.
