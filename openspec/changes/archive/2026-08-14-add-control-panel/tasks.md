## 1. Address

- [x] 1.1 Create `<profile>/chrome/resources/` and the page served by `chrome://userchrome/content/`
- [x] 1.2 Implement the `nsIAboutModule` module for `spacekeeper`
- [x] 1.3 Register the factory at startup and undo the registration on `unload`
- [x] 1.4 Detect and log when the address is already taken
- [x] 1.5 Add a preferences item to the organization menu

## 2. Reading and writing

- [x] 2.1 Read every `zen.stg.*` pref on open, with no cache in between
- [x] 2.2 Write the matching pref on each change, applying it immediately
- [x] 2.3 Show a warning and preserve the content when `customRules` is invalid
- [x] 2.4 Edit custom rules through the interface (name and domain list)
- [x] 2.5 Edit the exclusion list through the interface
- [x] 2.6 Edit the list of sites grouped by subdomain

## 3. Subdomain per site

- [x] 3.1 Declare `zen.stg.subdomainDomains`
- [x] 3.2 Use the host as the key when the site is in the list
- [x] 3.3 Keep the precedence: exclusion, rule, subdomain, domain
- [x] 3.4 Declare `zen.stg.subdomainLabel` (`host` or `sub`, default `host`)
- [x] 3.5 Label by host without the public suffix, or by the subdomain alone
- [x] 3.6 Fall back to the domain when the host has no subdomain and the style is short
- [x] 3.7 Ensure that switching the style changes neither the key nor the grouping
- [x] 3.8 Offer the style choice in the panel
- [x] 3.9 Cover the new cases in `ZSTG.selfTest()`

## 4. Commands and diagnostics

- [x] 4.1 Trigger regroup, ungroup, collapse, expand and recover old groups
- [x] 4.2 Show the result of each command
- [x] 4.3 Run the self-test and show the summary with the failures

## 5. Appearance

- [x] 5.1 Sections by subject, label on the left and control on the right
- [x] 5.2 Short description of what each option does
- [x] 5.3 Light and dark theme through `prefers-color-scheme`
- [x] 5.4 System typography, no resource from the network
- [x] 5.5 No network request is possible: no external URL, and CSP `default-src chrome:`

## 6. Verification

Browser checks; they need a window and real tabs, so `verify.ps1` does not run them.

- [x] 6.1 `about:spacekeeper` opens from the address bar
- [x] 6.2 A change in the panel changes the behavior without restarting
- [x] 6.3 A change in `about:config` shows up when the panel is reopened
- [x] 6.4 A rule created in the panel groups as expected
- [x] 6.5 Invalid `customRules` is reported without erasing the content
- [x] 6.6 `google.com` in the list splits Gmail, Drive and search
- [x] 6.7 A site outside the list stays grouped by domain
- [x] 6.8 The panel follows the dark theme
- [x] 6.9 The address registration is undone when the window closes

## 7. Content review (three-perspective workflow)

- [x] 7.0 Fix the false promise about manual color with derivation turned off
- [x] 7.1 Take out of the group tabs that entered the exclusion list
- [x] 7.2 Confirm before overwriting unreadable rules
- [x] 7.3 Confirm before ungrouping, warning that the names are lost
- [x] 7.4 Command output as a sentence, not as an object
- [x] 7.5 Remove jargon from the titles (favicon, host granularity, orphans)
- [x] 7.6 Move 'do not jump between Spaces' from Diagnostics to Grouping
- [x] 7.7 The log file now ships turned off, with its content declared
- [x] 7.8 The product is named Spacekeeper, with about:spacekeeper
- [x] 7.9 The focus-count field goes inert with focus mode turned off

## 8. Documentation

- [x] 8.1 Record the panel and the new prefs in the README
- [x] 8.2 Record the page's chrome privilege under the limitations
- [x] 8.3 Include the new anchors in `scripts/verify.ps1`
