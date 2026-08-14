## Context

An audit compared the eight capabilities in `openspec/specs/` against the code and
the README. Two different kinds of gap came out of it, and only one is a problem.

The first kind is timing: `control-panel`, `languages` and `installation` are fully
specified, as deltas inside changes that have not been archived. They merge into the
living spec when their changes are archived. Nothing is wrong there — the changes are
open because they carry browser-verification tasks only the user can complete.

The second kind is real: behavior that ships, that the README documents as a
promise, and that no delta anywhere covers. This change addresses that second kind.

The audit also turned up defects, fixed separately as bugs rather than folded in
here: `inspect()` reported version `0.2.0` while the script was `0.16.0`, a startup
message printed `deson` where it meant `off`, and two identifiers survived the
translation to English.

## Goals / Non-Goals

**Goals:**

- Every promise the README makes has a requirement behind it.
- The new requirements describe what the code already does, exactly.
- Each one gets an anchor in `verify.ps1`, so it is checked rather than merely
  written.

**Non-Goals:**

- Changing any behavior. If implementing this requires editing `src/`, the
  requirement is wrong.
- Restating the three capabilities that are already specified in open changes.
- Specifying internals: the delayed startup passes, the pref cache, the shape of the
  log entries. Those can change without a user noticing.

## Decisions

### `diagnostics` as its own capability, not folded into `configuration`

The self-test, the inspection output and the version share a purpose that the
existing capabilities do not have: they tell you what the mod is doing rather than
change what it does. Turning logging on is a configuration act, so the log file
stays under `configuration`; running the self-test is not.

The alternative — scattering them across `configuration` and `grouping-commands` —
would put "verify the mod's assumptions" next to "set the minimum tab count", which
reads as filing rather than structure.

### The console API is specified as a contract, without naming functions

The requirement says the documentation must not name a command the entry point does
not provide. It deliberately does not list the command names: those are code, and
freezing them in the spec would mean a rename becomes a spec change.

What matters is the invariant — documentation and surface agree — and that is
mechanically checkable. `verify.ps1` already compares the two, and it caught nine
stale names during the translation to English. The requirement makes that check
something the spec demands, instead of something the tooling happens to do.

### The palette limit belongs to the spec, not the README

The README calls the nine-color limit "a limitation inherited from the browser". It
is really a design constraint that shapes an entire feature: colors are approximate
by construction, and a user seeing an orange group for a red logo is seeing correct
behavior. Left only in the README, the next person reading `favicon-colors` would
reasonably read "derived from the favicon" as exact, and treat the approximation as
a bug to fix.

The requirement avoids fixing the number nine. The constraint is that the browser's
palette bounds the choice; how many entries that palette has is the browser's
business, and it has changed before.

### Requirements that constrain wording, not just behavior

Three of the new scenarios require an explanation to state something to the user —
that the log is bounded, that it records sites, that colors are approximate. These
are honesty requirements: each covers a case where the product would otherwise be
technically correct and practically misleading. They earned their place because the
opposite already happened once, when the panel promised that a manual color choice
was respected while the code discarded it.

## Risks / Trade-offs

- **Specifying after the fact tends to describe the implementation.** A requirement
  written by reading code reproduces its accidents. Mitigated by keeping every new
  requirement at the level of what a user can observe, and by explicitly excluding
  internals. The test applied throughout: could this be implemented a different way
  without the requirement changing?
- **Requirements about wording are unusual and harder to check.** A scenario saying
  the explanation "states that the file is bounded" cannot be verified by a regex.
  Accepted: they document a promise, and their failure mode — a text quietly
  rewritten to drop the caveat — is one a human reviewer can catch and a machine
  cannot.
- **The living spec still lags reality until the open changes archive.** This change
  does not fix that, and should not: duplicating those requirements here would
  create two sources for the same rule. The lag ends when the user finishes the
  browser verifications.
