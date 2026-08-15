## Context

Firefox/Zen accepts dropping a `tab-group` inside another; only native structures
get coherent styling, so a nested zstg group renders its tabs at the parent's
level. The drop handling is browser-internal — there is no cheap interception
point — but the project already owns "fix it at the next organization moment"
machinery (the loose-tab settle) and the moments themselves.

## Goals / Non-Goals

**Goals:** a nested system group is a state that never survives; identity, label,
color and tabs survive the correction.

**Non-Goals:** intercepting the drag; policing the user's own groups/folders; a
preference (a nested group has no sane reading — nothing to opt into).

## Decisions

**Detection is a parent-chain check.** A system group `g` is nested when
`g.parentElement.closest("tab-group")` exists. Scanned per Space in the same pass
family as the loose-tab settle; a no-op scan costs nothing.

**Correction tries the native move first, recreates as the fallback.** Preferred:
the unified `gBrowser.moveTabTo(group, { tabIndex })`, which modern Firefox
accepts for groups and preserves the element (id, collapse state). If it throws or
leaves the group nested, the fallback rebuilds with machinery the project fully
owns: ungroup the tabs (they land in the parent group), create a fresh group with
`addTabGroup` anchored at the container level (the same `insertBefore` guarantee
that keeps everything in its Space), `markAsOurs` with the ORIGINAL key, restore
label and color, remove the husk. The binding map follows via `markAsOurs`; a
manual color survives because it lives in the colors map, keyed by key.

**The trigger is TabMove, debounced — running the nest fix ONLY.** A group drag
fires `TabMove` for its tabs — the one signal a pure drag produces. The listener
debounces (one pass per gesture); our own corrective moves re-fire TabMove, and
the next pass finds nothing nested and stops — convergence, not recursion.
Amended in real use: the first version also ran the loose-tab settle here, and
reshuffling tabs in the middle of the user's own drag made dragged groups bounce
to wherever the settle's moves pushed the strip. The settle stays where its spec
put it — the organization moments — and the move pass only ever un-nests.

## Risks / Trade-offs

- [The native group-move signature differs across Zen versions] → try/fallback,
  each step debug-logged (`unnested` / `unnestFailed`), same policy as the settle.
- [Ungrouping mid-fallback briefly parents tabs into the outer group] → invisible:
  the whole correction runs synchronously inside one pass, and the end state is
  asserted by the same scan on the next trigger.
- [A user who WANTS a group inside a group] → the browser renders that broken for
  our groups, so protecting the sidebar wins; their own groups are untouched.
