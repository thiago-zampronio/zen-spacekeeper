## 1. Catalog

- [x] 1.1 Create the catalog in `<profile>/chrome/resources/`, importable over chrome://
- [x] 1.2 Define the keys covering every visible text of the panel and the script
- [x] 1.3 Write English as the base language, from meaning
- [x] 1.4 Translate to Brazilian Portuguese
- [x] 1.5 Translate to Spanish
- [x] 1.6 Import failure degrades to the raw keys, in the panel and in the script

## 2. Language selection

- [x] 2.1 Declare `zen.stg.locale` (`auto`, `en`, `pt-BR`, `es`; default `auto`)
- [x] 2.2 Read the browser language and match by prefix
- [x] 2.3 Fall back to English when the language is not available
- [x] 2.4 Honor the pinned language, without restarting
- [x] 2.5 Fall back to English when a key is missing, and record the absence

## 3. Replacing the texts

- [x] 3.1 Panel: titles, short descriptions and help balloons
- [x] 3.2 Panel: button labels, confirmations and result messages
- [x] 3.3 Script: menu items and rename dialog
- [x] 3.4 Check that no visible text was left written in the logic
- [x] 3.5 Language selector in the panel

## 4. Verification

Browser checks; they need tabs and a window, so they are not run by `verify.ps1`.

- [x] 4.1 Browser in English, Portuguese and Spanish shows each language
- [x] 4.2 Browser in an unavailable language shows English
- [x] 4.3 European Portuguese shows Brazilian Portuguese
- [x] 4.4 A pinned language beats the browser's, without restarting
- [x] 4.5 A key missing in one language shows in English and is recorded
- [x] 4.6 Browser menu and panel change together
- [x] 4.7 Failing to import the catalog does not break the interface

## 5. Documentation

- [x] 5.1 Record the languages and the pref in the README
- [x] 5.2 Explain how to add a new language
- [x] 5.3 `verify.ps1` compares the keys across the three languages
