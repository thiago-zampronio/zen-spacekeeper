## Context

The mod was updated on disk while Zen was running. Zen went on executing the version
it had loaded at startup. `install.ps1`, `install.ps1 -Check` and `verify.ps1` all
reported success, correctly: they compare files on disk to files on disk, and the
copy had worked.

What made it diagnosable at all was an accident. A log field had been renamed from
`spaceDepois` to `spaceBefore` between the two versions, so the log's vocabulary
gave away which version had written it. Nothing was designed to answer the question.

The script can read the profile — `profilePath()` and `IOUtils` are already used by
the self-update feature — so it can read the file it was loaded from.

## Goals / Non-Goals

**Goals:**

- Find out without being asked, and without a browser restart.
- Say it where the user already is, naming both versions and the remedy.
- Catch it from outside the browser too, before it is opened.

**Non-Goals:**

- Reloading the script in place. fx-autoconfig offers no supported way, and a
  partially swapped script is a worse state than a consistently stale one.
- Refusing to install while the browser is running. Installing with the browser open
  is the normal case; the answer is to report the consequence, not to forbid it.
- Deciding anything from the comparison. It reports; the user restarts.

## Decisions

### Three layers that fail differently, not three copies of one check

Repeating one check in three places moves the silence rather than removing it. Each
layer is picked so that the others' blind spots are covered:

- The **script** check runs with no user present and no restart, but only writes to
  the log unless someone opens the panel.
- The **panel** banner is seen without looking for it, but only by someone who opens
  the panel.
- The **installer** check runs before the browser is involved at all, and is the only
  one available when the mod is not loading at all.

The first is the one that would have caught this case immediately; the third is the
one that would have caught it before the panel was ever opened.

### The script compares against the file, not against a marker

At startup the script reads the installed `.uc.mjs` and extracts its version, then
compares it against its own compiled-in `VERSION`. Reading the artifact answers the
exact question — "is what I am running what is installed?" — where a marker file
would answer "did an installer run recently?", which is a different question with the
same answer most of the time and the wrong answer exactly when it matters.

Cost: one file read at startup. It is deferred like the log path is, and a failure to
read is treated as "cannot tell" and recorded as such — never as a mismatch, because
a false alarm here trains the user to dismiss the real one.

### The installer compares the browser's start time against an install marker

Outside the browser the artifact comparison is not available: the installer cannot
know what the running process loaded. The observable proxy is ordering — the browser
started before the files were installed.

This one **does** need a marker file, and for a reason worth writing down: `Copy-Item`
and `cp` preserve the source's modification time, so the deployed files carry the
timestamps of the git checkout, not of the installation. On a fresh clone those
timestamps can be minutes old while the install is months old, or the reverse. The
marker is written at install time and is the only honest record of when the install
happened.

### The mismatch is not dismissible

The condition lasts until the browser restarts, and a banner that can be closed while
the condition persists teaches that it was decoration. It disappears when it stops
being true, which is the only correct trigger.

### Splitting the overloaded message

"This page isn't connected to the browser window" currently covers two unrelated
states. Keeping one message for both is what sent the diagnosis toward browsing
contexts and Fission for half an hour. The split costs two catalog keys.

## Risks / Trade-offs

- **A file read on every window's startup.** The script is window-scoped, so this
  runs once per window. It is small and deferred, but it is not free, and it is worth
  revisiting if startup cost ever becomes a concern.
- **The marker adds state to the profile.** One more file the uninstall has to remove,
  and one more thing that can be stale. Mitigated by treating a missing or unreadable
  marker as "cannot tell" rather than as a warning.
- **Detecting is not fixing.** The user still has to restart and clear the cache. That
  is deliberate — see Non-Goals — but it means the value of this change is entirely
  in the wording of the messages, which is the part no test can verify.
- **The comparison can be fooled** by someone editing the installed file by hand
  without reinstalling; it would report a mismatch that is real but uninteresting.
  Acceptable: that person is already looking at the file.
