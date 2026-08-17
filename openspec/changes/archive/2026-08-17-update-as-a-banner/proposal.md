## Why

The panel now has two ways of telling you that what you are running is not what you
should be running, and they look nothing alike.

The stale-version banner sits at the top, states both versions, and offers a button
that fixes it. It was written last, from a real failure, and it works: the owner saw
it once and immediately asked why the *other* one is not like that.

The other one is the update flow, at the bottom of the panel, behind a "Check for
updates" button, reporting into a monospaced output area with the release notes
flattened into it as text. It is the same message — a newer version exists, here is
what changed, here is how to get it — presented as a diagnostic readout.

The asymmetry is not only cosmetic. An update the user never notices is an update
that does not happen, and the current shape asks them to go looking for it: open the
panel, scroll to the bottom, click Check, read a text dump.

## What Changes

The update becomes a banner, in the same shape as the stale-version one and in a
different color: this is an opportunity, not a fault.

The panel checks for an update when it opens, under the same preference that already
governs the automatic check — with `zen.stg.updateCheck` off, the panel makes no
request, exactly as it makes none today.

The banner carries the version you have, the version available, a **Release notes**
control that expands them in place, and **Update**. The notes stop being flattened
into a text dump and become readable content that is there when wanted and out of
the way when not.

The update pill in the tab strip already opens the panel; it now lands on a banner
that is already filled in, rather than on a section that has to be asked.

What is left in the maintenance section is uninstalling. The manual check button
stays **only** when automatic checking is off — with it on, the button asks for
something that already happened; with it off, it is the only way, and removing it
would turn a preference into a dead end.

Out of scope: changing what an update downloads or where it writes, the restart
dialog after a successful update, and the pill itself.

## Capabilities

### Modified Capabilities

- `self-update`: the check also runs when the panel opens, under the existing
  preference; the network requirement is restated to cover it.
- `control-panel`: the update is reported as a banner with expandable notes, the
  maintenance section keeps the manual check only when automatic checking is off,
  and the two banners get a defined precedence.

## Impact

- `src/resources/zstg-panel.html`: the banner, the notes disclosure, and the
  maintenance section reduced.
- `src/resources/zstg-i18n.mjs`: new texts, three languages; some existing update
  texts change shape.
- `src/zen-space-tab-groups.uc.mjs`: no new capability — `checkForUpdate` and
  `applyUpdate` already exist and already return what the banner needs.
- `scripts/verify.ps1`: anchors for the new requirements.
- One request per panel open when update checking is on, where today there is none.
  That is the real cost of this change, and it is why the preference has to gate it.
