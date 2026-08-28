## MODIFIED Requirements

### Requirement: Update controls report honestly

The system SHALL report the update check's outcome truthfully in the panel — up
to date, update available, or the exact failure — and SHALL disclose, next to
where updates are managed, the product's full network behavior: the click-driven
check and download, the automatic metadata-only check (shortly after a
window opens, every few hours, and when the panel opens), and the repair reached
from the userScripts menu, including that the preference turns the automatic
check off, that it does not turn the repair off, and that nothing else in the
product touches the network.

The maintenance buttons this requirement originally described were replaced by
the banner flow; the honesty obligations survive the furniture. The old
disclosure claimed update clicks were "the one action that contacts the
network", which the automatic check made false — the disclosure now describes
the network behavior the product actually has.

The repair falsified it a second time, in the same shape: the disclosure said the
check was the only thing in the whole product that touches the network, and the
repair is a second thing that does. A disclosure is only worth having while it is
exhaustive, so a new network path is not free — it costs an edit here, every time.

Naming that the preference does not silence the repair is part of the honesty, not
a footnote. A reader who has turned the automatic check off is entitled to know
exactly what remains reachable, and the repair remaining reachable is deliberate.

#### Scenario: Outcomes are reported truthfully

- **WHEN** a check ends — up to date, update found, or failed
- **THEN** the panel states that outcome, and a failure names the error

#### Scenario: The disclosure matches reality

- **WHEN** the user reads the network disclosure in the update area
- **THEN** it describes both the click-driven and the automatic checks
- **AND** it names the preference that silences the automatic one

#### Scenario: The disclosure accounts for the repair

- **WHEN** the user reads the network disclosure in the update area
- **THEN** it names the repair as something that also contacts the network
- **AND** it states that the preference does not silence it
