# Design: first-run seeding of the recommended experience

## Context

Configuration lives in `zen.stg.*` prefs; the code's `DEFAULTS` object is the
fallback for unset prefs. Defaults are therefore retroactive: changing one
changes behavior for every user who never set that pref. Two of the desired
values are dangerous retroactively — `subdomainDomains` participates in key
derivation (a changed fallback re-keys `google.com` tabs and orphans existing
groups on screen, with no error and no migration), and `focusMode` starts
collapsing groups. The recommended experience must reach new users without
touching anyone who already has one.

## Goals / Non-Goals

**Goals:**

- A fresh profile behaves, from its first session, like the owner's setup.
- An existing profile — however configured, including "all defaults" — sees
  zero behavior change on update.
- The mechanism runs once and leaves an auditable trace.

**Non-Goals:**

- Changing any raw `DEFAULTS` value.
- A UI for re-applying or opting out of the seed (turning any pref off
  afterwards works as it always did — the seed writes ordinary prefs).

## Decisions

### Seed explicit prefs once, instead of changing DEFAULTS

The startup path gains a step: if the marker pref (`zen.stg.seeded`) is
absent AND the profile shows no prior use, write the seven recommended values
as explicit prefs and set the marker. Because the written prefs are ordinary
prefs, everything downstream (cfg(), the panel, real-time application) works
unchanged, and the user editing them later is indistinguishable from any
other configuration change.

Rejected: changing `DEFAULTS` — retroactive re-keying and surprise focus
mode, per Context; a "virtual default" layer (defaults-that-differ-by-cohort)
— two sources of truth for the same pref, permanent complexity for a
one-shot event.

### "No prior use" means no `zen.stg.groups` pref

The group map is written the first time the mod ever creates a group, so its
absence is the best available "this profile never ran the mod" signal. The
marker alone is not enough: every EXISTING user also lacks the marker on the
update that ships this feature. Guarding on `zen.stg.groups` makes the update
a no-op for them; the marker is still set on that first post-update run
(recording the decision either way), so the guard is consulted exactly once
in a profile's life. The residual cohort — someone who installed the mod but
never once had a group created — is seeded; for a profile with zero groups
the recommended experience is indistinguishable from a fresh install, so
that is correct, not a compromise.

### The marker is a pref, and it is stored identity

`zen.stg.seeded` (bool). Added under the never-rename rule like every other
stored name. Set to true in both branches (seeded, or skipped-as-existing) so
the logic never runs twice and the log tells which branch fired.

### Timing: before the first organization pass

The seed runs during startup wiring, before any grouping/organizing reads
cfg() — so the very first session already groups Google by subdomain and
runs focus mode. It must run after the pref service is available (trivially
true in a uc.mjs) and must not await anything.

## Risks / Trade-offs

- [A user restores an old profile backup after this ships: `zen.stg.groups`
  exists there, so they are never seeded] → correct by design: that profile
  is an existing experience, and the promise is not to touch those.
- [Someone wipes all `zen.stg.*` prefs to "factory reset": the seed fires
  again (marker gone, groups gone) and they land on the recommended
  experience, not the raw defaults] → acceptable and arguably the better
  reading of "factory".
- [The seeded `subdomainDomains=google.com` shapes new users' group keys; a
  later change of taste re-keys their groups] → same property every user
  already has when they edit that pref themselves; the seed just picks the
  starting point.
