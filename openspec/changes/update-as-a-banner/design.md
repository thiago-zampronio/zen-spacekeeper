## Context

Two mechanisms in the panel say the same kind of thing — what you are running is not
what you should be running — and look nothing alike.

The stale-version banner was written last, from a real failure: top of the page,
both versions named, a button that fixes it. The update flow is older: a section at
the bottom, a Check button, and a monospaced output area with the release notes
flattened into it.

The product already checks for updates on its own — `updateCheck` defaults to true,
45 seconds after a window opens and every four hours after that — and already shows
an alert in the tab strip that opens the panel at `#update`, which triggers a check
on arrival. So the machinery exists; what is missing is that the answer is presented
as a diagnostic readout instead of as news.

## Goals / Non-Goals

**Goals:**

- An update is seen by someone who opened the panel for another reason.
- The notes are readable by whoever wants them and invisible to whoever does not.
- One visual language for "your version is not the right one", in both directions.

**Non-Goals:**

- Changing what an update downloads, or where it writes.
- Changing the pill.
- Automatic installation. Nothing is installed without a click, and that line does
  not move.

## Decisions

### Checking on open is not a new network exception

This was the one decision worth checking before designing anything, because the
source says network access happens only on a click. That comment is out of date: the
product has checked automatically since the heartbeat landed, `updateCheck` defaults
to true, and the spec already describes a disclosed, disableable metadata check.

So opening the panel joins an existing exception rather than creating one — same
endpoint, same metadata, same preference. What it must not do is check when the
preference is off, and that is written as a scenario rather than left to the
implementation.

The cost is real and worth naming: one request per panel open, where today there is
none. That is the price of the update being noticed instead of looked for.

### The stale banner wins when both apply

Applying an update while the browser runs older code writes files that will not take
effect either — the user ends one restart away from correct in both cases, having
read two stacked warnings that both say "restart". Showing only the staleness one
makes the sequence obvious, and the update banner appears by itself afterwards,
because restarting clears the condition that was hiding it.

The cost: someone who never restarts never sees the update banner in the panel. The
pill still shows, so the update is not invisible; and "never restarts" is the same
state that already makes everything else stale.

This is the decision in this change most worth revisiting if it feels wrong in use.
The alternative — stacking both — is one line of code away.

### The manual check stays only when the preference is off

With automatic checking on, a Check button asks for something that happened when the
panel opened. With it off, that button is the only way to look.

Conditional controls are usually a smell: the user learns a layout and then it
changes. Here the condition is a preference the user set themselves, and the
alternative is worse in both directions — keeping the button always means a control
that does nothing new most of the time, and removing it always means turning a
preference into a dead end.

### Notes expand in place

The notes today are flattened into a `<pre>` with the rest of the output, so a
three-release backlog produces a wall of text where a status line should be. Behind
a disclosure they are a paragraph or a wall depending on how much there is, and the
banner stays one line high until asked.

Updating must not require opening them: the notes are for the curious, not a consent
step.

## Risks / Trade-offs

- **A request per panel open.** Someone who opens the panel repeatedly generates
  repeated requests. Metadata only, and the preference disables it entirely — but it
  is more traffic than today, and pretending otherwise would be dishonest.
- **The precedence rule can hide an update** from a user who stays stale
  indefinitely. Mitigated by the pill, which is unaffected.
- **The maintenance section becomes almost empty** — uninstall, and a check button
  that is usually absent. That is a smaller section than the layout was designed
  around, and it may read as unbalanced until seen.
- **Two banners share one position**, so a future third condition will want it too.
  The shape is worth keeping general for that reason, rather than hard-coding
  "stale" and "update" as the only two kinds.
