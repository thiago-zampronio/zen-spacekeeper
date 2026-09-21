# A break after a browser update says so, on the day it happens

## Why

The Zen 1.22b breakage cost a week, and not because it was hard to fix. Each of the
three failures was fixed in minutes once seen. What cost the week was that nothing
said anything: the tabs of a collapsed group stayed on screen, a move asked for a
position the browser no longer publishes and did nothing, and every one of those paths
returned normally. No exception, no console line, no log entry. The owner found it by
eye, days later, and reported it as "the mod broke".

Two properties of this code make silence the default, and both are deliberate:

- the mod is defensive everywhere, so a missing internal degrades instead of throwing;
- the browser accepts nonsense politely — `moveTabTo` with a position it cannot read
  returns without moving anything, and a stylesheet rule that matches nothing is not an
  error.

So the mod needs to check its own work, and it needs one moment where it checks
everything: the first start after the browser changed underneath it.

## What Changes

- Every place the mod asks the browser to move something checks afterwards that the
  move happened. When it did not, the mod reports it once — named, with what it asked
  for. The unnest path already worked this way and rebuilt the group as a fallback; the
  other three moves did not.
- A report of this kind no longer depends on the debug log being enabled. One console
  error per session carries it, so the next person learns without turning anything on.
  The debug log keeps its full entry.
- The mod remembers the browser build it last ran under. When it starts and that build
  is different, it audits what it cannot test any other way: for a collapsed group,
  whether the tabs are actually invisible on screen. The audit is read-only — it moves
  nothing, creates nothing and deletes nothing.
- The audit waits for the evidence. A collapsed group may not exist at startup, so the
  first group to collapse after the browser changed is the one audited, once, and then
  the browser build is recorded as seen.

Out of scope: a self-test that creates and closes groups on its own (it would mutate
the strip behind the user, and any interruption would leave debris), any new panel
screen, and any network check.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `diagnostics`: the startup canary gains a second half. Today it probes what the
  browser offers before the mod uses it; it will also report what the mod asked for and
  did not get, and audit the one thing only a running browser can answer — whether a
  collapsed group's tabs are off the screen — at the moment the browser changes.

## Impact

- `src/zen-space-tab-groups.uc.mjs`: a post-condition after the three moves, a
  report-once helper, the build comparison at startup, and the read-only render audit.
- One new preference holding the last browser build seen, documented in the manual
  beside the others.
- `docs/MANUAL.md`: the debugging section states what the two new log entries mean.
- No user-visible text, no new panel control, no change to stored identity.
