## Purpose

Let the installer finish the job it starts: after installing, offer to restart the
browser and clear the startup cache, so a correct installation is running when the
installer exits instead of depending on two manual steps.

## ADDED Requirements

### Requirement: Restart offered after installing

The system SHALL, after a successful installation, offer to close the browser,
clear the detected profile's startup cache, and start the browser again — and
SHALL NOT close the browser without the user's explicit consent.

Consent SHALL be obtained by a prompt when a terminal is available to answer it,
or by an explicit opt-in option for scripted runs. When neither is available, the
system SHALL skip the restart silently and leave the manual instructions in place.
Running the installer piped into a shell SHALL keep working.

#### Scenario: User accepts the prompt

- **GIVEN** an installation just finished
- **AND** the browser is running
- **WHEN** the user accepts the restart prompt
- **THEN** the browser is asked to close
- **AND** the startup cache of the detected profile is cleared after it exits
- **AND** the browser is started again

#### Scenario: User declines the prompt

- **GIVEN** an installation just finished
- **WHEN** the user declines the restart prompt
- **THEN** no process is closed and nothing is deleted
- **AND** the output states the manual steps, as it does today

#### Scenario: Opt-in option given up front

- **GIVEN** the user runs the installer with the restart option
- **WHEN** the installation finishes successfully
- **THEN** the restart proceeds without a prompt

#### Scenario: No terminal to answer and no option given

- **GIVEN** the installer runs without a terminal available for the prompt
- **AND** the restart option was not given
- **WHEN** the installation finishes
- **THEN** the restart is skipped
- **AND** the output states the manual steps, as it does today

### Requirement: The close is graceful and bounded

The system SHALL ask the browser to quit the way the platform normally does, SHALL
wait a bounded time for it to exit, and SHALL NOT kill the process. When the
browser does not exit within the wait — an unsaved-changes dialog being the
expected cause — the system SHALL say so and fall back to the manual instructions,
leaving the browser running.

#### Scenario: Browser exits within the wait

- **WHEN** the browser is asked to quit
- **AND** it exits within the bounded wait
- **THEN** the restart continues with the cache clearing

#### Scenario: Browser does not exit

- **WHEN** the browser is asked to quit
- **AND** it is still running after the bounded wait
- **THEN** no process is killed and nothing is deleted
- **AND** the output states that the browser did not close and lists the manual steps

### Requirement: The cache cleared is the detected profile's

The system SHALL clear only the startup cache that belongs to the profile it
detected, resolving its per-platform location, and SHALL treat an absent cache
directory as already clear rather than as an error.

Clearing another profile's cache does nothing for the user and destroys a cache
that was doing its job.

#### Scenario: Cache directory exists

- **GIVEN** the browser has exited
- **WHEN** the cache is cleared
- **THEN** only the startup cache under the detected profile's cache location is removed

#### Scenario: Cache directory absent

- **GIVEN** the detected profile has no startup cache directory
- **WHEN** the restart reaches the cache step
- **THEN** the step succeeds without an error

#### Scenario: Browser not running

- **GIVEN** the browser is not running when the installation finishes
- **WHEN** the user consents to the restart
- **THEN** the cache is cleared without closing anything
- **AND** the browser is started

## MODIFIED Requirements

### Requirement: The installer states what remains to be done

The system SHALL, after installing, state that the browser must be restarted and
that the startup cache may need clearing — unless the offered restart already
performed those steps, in which case it SHALL state what was done instead.

A stale startup cache makes a correct installation look like a failed one: the
browser starts normally and the mod simply does not exist.

#### Scenario: After a successful install without the restart

- **GIVEN** the restart was declined, skipped or not completed
- **WHEN** the installation finishes
- **THEN** the output tells the user to restart the browser
- **AND** it tells the user how to clear the startup cache
- **AND** it names the address where the mod's panel can be opened

#### Scenario: After a successful install with the restart

- **GIVEN** the offered restart closed the browser, cleared the cache and started it again
- **WHEN** the installation finishes
- **THEN** the output states the browser was restarted and the cache cleared
- **AND** it names the address where the mod's panel can be opened
