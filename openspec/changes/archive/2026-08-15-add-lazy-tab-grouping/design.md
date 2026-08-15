## Context

Lazy-restored tabs keep `about:blank` in `currentURI` until activated; the real
destination lives in the session store (`SessionStore.getLazyTabValue(tab,
"url")`). Key derivation only looked at `currentURI`, so unloaded tabs were
key-less — harmless while nothing mass-ungrouped, glaring since the clean reset.

## Goals / Non-Goals

**Goals:** group without loading; restored Spaces converge on first visit; the
manual regroup reaches everything.

**Non-Goals:** organizing every background Space at startup (churn across the
whole session at once, for Spaces the user may not visit); loading tabs.

## Decisions

**Fallback, not replacement.** `keyFromTab` keeps trusting `currentURI` first —
it is the truth for loaded tabs — and only when that yields no key asks
`SessionStore.getLazyTabValue(tab, "url")`. A missing SessionStore or a lazy value
of nothing degrades to today's behavior exactly.

**One organization pass per Space, on first activation.** A session-scoped set
remembers which Spaces were organized; the existing TabSelect listener checks it
(switching Spaces changes the selected tab, so activation always fires it) and
runs the pass once — organize each ungrouped eligible tab, then the nest fix and
the loose settle. The startup passes seed the set with the current Space. Visiting
is the trigger, so background Spaces cost nothing until they matter.

**The pass reuses `organize()` per tab.** Same eligibility, same minTabs, same
Space-from-the-tab invariant; nothing new to get wrong.

## Risks / Trade-offs

- [Zen's lazy tabs might not carry the SessionStore lazy value] → verified
  in-browser before archiving; the fallback degrades to current behavior, never
  worse.
- [First activation of a huge Space does a burst of grouping] → the burst is the
  user-visible regrouping they were promised; it happens once per Space per
  session.
