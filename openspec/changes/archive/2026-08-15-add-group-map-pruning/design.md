## Context

`markAsOurs()` writes an id-to-key entry into `zen.stg.groups` for every group it
creates; `reclaimGroups({ prune: true })` removes entries whose ids are not on
screen, but only the manual regroup command calls it that way. The code carries a
scar explaining why pruning is dangerous: called during startup, before session
restore brought the groups back, it saw zero live groups and erased the whole map —
which is how the binding used to be lost.

## Goals / Non-Goals

**Goals:**

- Dead bindings leave the map without any user action.
- Zero new risk to restore recognition — the existing delayed reclaim passes
  (1s/3s/8s) stay untouched and run first.

**Non-Goals:**

- Pruning `zen.stg.colors` (the color memory must survive closing a domain's tabs).
- Cross-session bookkeeping (age counters, tombstones) — one safe in-session prune
  is enough for the growth rate involved.

## Decisions

**One scheduled prune, 60 seconds after start.** `start()` gains a single
`setTimeout` calling `guarded(() => reclaimGroups({ prune: true }))` at 60s. The
delayed recognition passes end at 8s; 60s is a wide margin past every restore path
observed, and the prune reuses the exact code the manual command already exercises —
no new mechanism, one new call site.

**Why not prune on group close events:** an entry must outlive its group precisely
across shutdown and restore; tying removal to the group's death is the bug this map
exists to avoid. Liveness can only be judged when the session is known-stable.

## Risks / Trade-offs

- [A window or tab restored later than 60s loses its binding and a later tab opens a
  duplicate group] → accepted and bounded: the duplicate is cosmetic, self-heals on
  the next manual regroup, and the alternative (never pruning) is the current
  defect. If lazy restores past 60s show up in practice, the delay is one constant.
- [The prune races a regroup the user runs at the same moment] → both paths run
  under `guarded()`, which already serializes re-entrant work.

## Open Questions

- None blocking.
