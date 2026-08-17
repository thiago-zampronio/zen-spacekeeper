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

3. **Write the entry against the notes contract below.** It was settled by a
   product-vs-sales adversarial review of the full 31-release history against
   market standards (Keep a Changelog, Raycast, Slack, App Store notes);
   check the draft against every numbered rule before publishing.

   > You are writing the release note for Spacekeeper, an automatic
   > tab-grouping mod for Zen Browser. The same English text is the GitHub
   > release note, the CHANGELOG.md entry, and the note shown inside the
   > product's update panel next to the Update button — readers several
   > versions behind see the missed notes stacked. Write for a non-technical
   > reader; a reviewer will check the draft against every numbered rule.
   >
   > 1. TITLE: "vX.Y.Z — " then the release's biggest user benefit, stated
   >    literally, in at most 10 words. No riddles, puns, or nicknames:
   >    someone scanning only stacked titles must know what each release
   >    changed.
   > 2. CLICK TEST: the title plus the first bullet alone must tell a
   >    non-developer why to press Update.
   > 3. ORDER AND SIZE: 1-5 bullets, ordered by impact on daily browsing —
   >    never by commit order or effort spent. Never pad a small release.
   > 4. FORM: one bullet per change, opening with a bold inline label —
   >    **New:**, **Improved:**, or **Fixed:** — always grouped in that
   >    order. At most 3 sentences per bullet. No unlabeled prose paragraphs.
   > 5. VOCABULARY: only words a non-coder uses about the product — tabs,
   >    groups, Spaces, the sidebar, the panel, the update alert. Every verb
   >    describes what the user sees happen, never what the code does.
   > 6. FIXES: name the symptom exactly as users experienced it ("dragged
   >    groups bounced around"), then say it is gone. Never explain the
   >    technical cause, how the bug was found, or how it was tested.
   > 7. NEVER INVENT A SYMPTOM: if users likely never saw the bug, say so
   >    plainly instead of dramatizing it.
   > 8. OPENERS: you may earn attention with one short second-person scenario
   >    ("Keep your browser open for days?") — one clause, then straight to
   >    the payoff.
   > 9. BANNED EVERYWHERE: code identifiers, pref keys, file paths,
   >    CSS/DOM/animation-math vocabulary, anchor/spec/selector/verify/test/
   >    harness talk, the development process, releases "existing so that"
   >    anything, install commands, how-to-update steps, "we're excited",
   >    exclamation marks.
   > 10. SETTINGS: point to the visible place ("in about:spacekeeper →
   >     Grouping, on by default"), never an internal key.
   > 11. NICKNAMES: define any pet name on first use in THAT note ("the
   >     update pill — the small blue badge in the sidebar's corner") or
   >     avoid it. Every note stands alone: no references to other releases'
   >     notes or promises.
   > 12. REASSURE in one short clause whenever a change touches things the
   >     user made: renames kept, no tab ever closed, settings preserved.
   > 13. SENTENCES: at most 25 words each; no em-dash chains, no nested
   >     parentheticals.
   > 14. LENGTH: whole note at most 120 words for a normal release, 200 for
   >     a milestone.
   > 15. NOTHING USER-VISIBLE CHANGED (including work on internal checks or
   >     the release process)? Write one honest sentence saying so, freshly
   >     worded each time — stacked identical lines read as a bot.
   > 16. VOICE: warm, confident, second person — a person talking, never a
   >     spec and never an ad. Personality decorates a benefit; it never
   >     substitutes for one.
   > 17. FINAL CHECK: (a) the title alone tells a non-coder what changed for
   >     them; (b) every bullet is an outcome, not a mechanism; (c) every
   >     claimed symptom actually happened. Rewrite whatever fails.

   The technical detail belongs in the commit message, never in the note.

4. **Refresh the profile and verify**: run the installer (`./install.sh`),
   then `verify.ps1` — EVERYTHING IN SYNC before pushing. Exception: when the
   release itself is a field test of the update flow, skip the installer on
   purpose and expect the profile-staleness flags; say so in the commit.

5. **Commit, push, publish**: `gh release create vX.Y.Z --latest` with the
   tag created on the bump commit itself — verify.ps1 fails any tag whose
   commit does not carry that tag's version — and with the
   changelog entry as the notes, verbatim — the panel shows those notes next
   to "update available", so they are user-facing copy, not an afterthought.

Behavior changes need their OpenSpec change applied and (once user-confirmed)
archived; wording, tooling and installer plumbing do not.
