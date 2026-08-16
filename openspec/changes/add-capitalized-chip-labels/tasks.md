# Tasks

## 1. Implementation

- [x] 1.1 `capLabel` helper IN THE CORE — the first cut lived in the wrapper
      and the shared derivation tests caught the asymmetry in the browser
      (4 label checks failed under the real eTLD while node passed): the
      casing is part of derivation, so it belongs where labels are born, and
      the shared cases now expect "Youtube"/"Mail.google" plus a dedicated
      capitalization case; reclaim recases only when the live label equals
      the derived one case-insensitively; rename prompt untouched
- [x] 1.2 verify anchor follows (`capLabel`); MANUAL label examples updated;
      EVERYTHING IN SYNC

## 2. In a running Zen (user confirms)

- [ ] 2.1 New groups come capitalized; existing derived-label groups recase on
      reclaim; a renamed group keeps its exact text
