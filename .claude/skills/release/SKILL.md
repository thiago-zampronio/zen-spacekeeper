---
name: release
description: Ship a Spacekeeper release — version bump in three places, changelog entry, verify, push, GitHub release with user-facing notes. Use whenever publishing a new version.
---

# Releasing Spacekeeper

A release is a version bump plus a push to `main` — the piped installers serve
whatever `main` holds, and the panel's update flow serves the latest GitHub
release. The checklist, in order:

1. **Bump the version in three places** (verify.ps1 keeps them honest):
   - `@version` header in `src/zen-space-tab-groups.uc.mjs`
   - `const VERSION = "x.y.z"` in the same file
   - the `[ZSTG] x.y.z ready` literal in `docs/MANUAL.md`

2. **Write the version's entry in `CHANGELOG.md`** — newest first, one `## x.y.z`
   heading per version. verify.ps1 fails without it, so a release cannot ship
   silent.

3. **Write the entry in the user's voice.** The reader is standing inside the
   panel, one click from updating: plain language, the benefit first, no
   internal jargon (nothing about anchors, specs, verify, selectors), and
   NEVER a how-to-update section — the reader is already in the place where
   updates happen. Sell the change the way the README sells the product; the
   technical detail belongs in the commit message.

4. **Refresh the profile and verify**: run the installer (`./install.sh`),
   then `verify.ps1` — EVERYTHING IN SYNC before pushing. Exception: when the
   release itself is a field test of the update flow, skip the installer on
   purpose and expect the profile-staleness flags; say so in the commit.

5. **Commit, push, publish**: `gh release create vX.Y.Z --latest` with the
   changelog entry as the notes, verbatim — the panel shows those notes next
   to "update available", so they are user-facing copy, not an afterthought.

Behavior changes need their OpenSpec change applied and (once user-confirmed)
archived; wording, tooling and installer plumbing do not.
