## Context

Install got effortless (`--restart`), recovery is about to (the guard), but leaving
and updating still assume the installer is at hand. The panel is chrome-privileged
and already writes prefs directly; it can own the whole lifecycle. The friction is
a standing promise: the panel's spec says it never touches the network, and the
README repeats it — an updater must widen that promise honestly, not quietly.

## Goals / Non-Goals

**Goals:**

- Leaving takes one click and removes everything Spacekeeper added to the profile,
  guard included.
- Updating is explicit, versioned, and no wider than the click that asked for it.
- Every document that states the no-network claim states its one exception.

**Non-Goals:**

- Auto-update, scheduled checks, update prompts on startup — nothing spontaneous.
- Updating the loader in the application directory (elevation belongs to the
  installer).
- Downgrade/rollback flows: reinstalling a chosen version is the installer's
  `--branch` job.

## Decisions

**The fetch lives in the chrome script, not in the panel document.** The panel's
CSP (`default-src chrome:`) stays exactly as strict as today; the button calls
into the mod (both are chrome-privileged, same window), and the mod does the
network work. The "Local confinement" requirement of the panel page remains true
to the letter: the page loads nothing remote.

**Pinned to the latest release tag, never a branch.** Check = one request for the
latest release version. Update = fetching that tag's profile-side files
(raw.githubusercontent at the tag) into a staging directory in the profile, then
swapping them in only when every file arrived — a half-fetched update must leave
the previous install untouched. The trust model is unchanged from install day:
the same repository, but a deliberate release instead of whatever `main` holds.

**Loader changes are detected, not applied.** The release's loader files are
compared against the profile cache; a difference is reported with "run the
installer" — the panel never writes to the application directory, so it never
needs elevation and never fails for lack of it.

**Restart via UC_API when present.** fx-autoconfig ships a restart-with-
cache-clear utility; when available the result offers "restart now", otherwise it
states the manual steps. Same graceful-degradation pattern as everything else.

**Uninstall reuses the guard's own removal.** The guard change ships removal logic
in the guard script; the panel invokes that same path, so the installer's
uninstall, the panel's uninstall and the guard's self-disarm converge on one
implementation and one end state.

## Risks / Trade-offs

- [An updater is remote code into a privileged context] → bounded by: user click
  required, release tag required, same-source trust as install, all-or-nothing
  swap, and the disclosure sitting next to the button. The alternative — users
  permanently on the version of their install day — is its own security problem.
- [GitHub API rate limits or offline machines] → a failed check is a reported
  failure, never a retry loop; nothing is scheduled, so nothing accumulates.
- [The panel deleting the files of the code currently running it] → files are read
  at startup; the running session is unaffected and the result says so. Same
  reasoning already proven by the installer's uninstall while Zen runs.

## Open Questions

- Whether the update should also refresh the guard's loader cache when the loader
  did NOT change in the release (keeping the cache's date fresh): leaning yes,
  it is free and keeps the restore notification's date meaningful.
