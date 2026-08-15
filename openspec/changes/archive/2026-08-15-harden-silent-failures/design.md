## Context

The product hangs off undocumented Zen internals (`gZenWorkspaces`,
`gBrowser.tabGroups`, `switchToTabHavingURI`, the `zen-workspace-id` attribute) and
is written defensively: optional chaining and try/catch everywhere. That is right
for resilience and wrong for visibility — when Zen changes, nothing errors, the mod
just stops doing things. The debug log, the tool for exactly these moments, has its
own silent failure: one failed write sets `logUnavailable` and nothing ever resets it.

## Goals / Non-Goals

**Goals:**

- One loud, specific console error the moment the Zen contract breaks, naming what
  broke, plus the same list in the debug log.
- Log entries that match the documented privacy claim (site, not address).
- A recoverable log and a panel that does not eat a pending edit.

**Non-Goals:**

- Feature degradation changes: the mod keeps working partially when it can; the
  canary reports, it does not disable anything.
- Reimplementing anything the wrapper or the listeners already do.

## Decisions

**Canary probes the contract points once, after `whenReady()`.** Probing earlier
races Zen's own startup: `whenReady()` already waits for the workspace machinery.
Checks: `gZenWorkspaces` present, `workspaceElement` callable, an active Space id
resolvable, `allUsedBrowsers` present, `gBrowser.addTabGroup` callable,
`gBrowser.tabGroups` iterable, `switchToTabHavingURI` a function, and
`UC_API.Hotkeys` present. One `console.error` listing every missing point (not one
per point — a Zen refactor would flood the console), mirrored with `dbg()`. When
everything holds, silence — the ready line already reports health.

**Host-only logging via one helper.** `hostOnly(spec)` resolves the host through
`Services.io.newURI` and returns an empty string on failure — never the raw input,
which is exactly what must not be recorded. Applied to the tab-switch event, the one
place a full address was logged.

**Log recovery hooks the existing pref observer.** The observer already fires on
every `zen.stg.` change; when the changed pref is `debugLog`, `logUnavailable` is
cleared. Toggling the pref is the natural "try again" gesture, and it costs nothing
when the log never failed.

**Panel flush by blurring the active element on `pagehide`.** The panel's fields
already commit on `change`; blurring the focused element on `pagehide` fires that
same path. No new save code, no double-write risk, works for every field at once.

**Unregistration only by the window that holds the factory, and only when it is the
last browser window.** `unregisterFactory` needs the factory instance, which only
the registering window has. If that window closes while others remain, the
registration deliberately stays — tearing it down would break `about:spacekeeper`
in every other window, a worse outcome than a registration that outlives its
creator (the page it points at is a chrome URL that remains valid).

## Risks / Trade-offs

- [Canary points drift from what the code actually uses] → the list lives next to
  the startup code that uses them, and a stale entry produces a visible false
  alarm, which is self-correcting — the opposite of the silent failure it replaces.
- [Blur-on-pagehide commits an edit the user was abandoning on purpose] → the panel
  already commits that edit if the user clicks anywhere else first; close-without-
  blur was the inconsistent case, not the consistent one.
- [If the registering window closes first, the last window cannot unregister] →
  accepted: the alternative (any window unregistering) breaks living windows, and
  after the last window the registration points at a chrome URL that still resolves.
