# Checks that specification, code, documentation and installation are in sync.
#
# Needs no administrator privilege and changes nothing — it only reads and compares.
# Run it after any change, before archiving a change.
#
# What it does NOT do: verify behavior. This script catches a requirement with no
# implementation, a pref with no documentation and a stale file in the profile — it
# does not catch an implementation that is present and wrong. For behavior, use
# `ZSTG.selfTest()` in the browser console.

param(
    [string]$Profile = "$env:APPDATA\zen\Profiles\eeijpino.Default (release)",
    [string]$ZenDir = "C:\Program Files\Zen Browser"
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$failures = @()
$warnings = @()

# Re-reads PATH from the registry: a shell opened before Node was installed still
# carries the old PATH, and the openspec wrapper calls `node` without a full path.
$env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
            [Environment]::GetEnvironmentVariable("Path", "User") + ";" +
            "$env:APPDATA\npm"

function Section($title) {
    Write-Output ""
    Write-Output "-- $title"
}

function Check($ok, $text) {
    Write-Output ("  {0} {1}" -f $(if ($ok) { "[ok]" } else { "[!!]" }), $text)
    if (-not $ok) { $script:failures += $text }
}

# ---------------------------------------------------------------------------
Section "OpenSpec"

if ((Get-Command openspec -ErrorAction SilentlyContinue) -and
    (Get-Command node -ErrorAction SilentlyContinue)) {
    Push-Location $root
    $specs = openspec validate --specs --strict 2>&1 | Out-String
    Check ($specs -match "0 failed") "specs validated in strict mode"

    $archived = openspec validate --archived 2>&1 | Out-String
    Check ($archived -match "0 failed") "archived changes have all tasks complete"

    $active = openspec list 2>&1 | Out-String
    if ($active -notmatch "No active changes") {
        $warnings += "there are active changes - check whether they should be archived"
    }
    Pop-Location
}
else {
    $warnings += "openspec CLI not found; skipping spec validation"
}

# ---------------------------------------------------------------------------
Section "Requirements with an implementation"

# Every requirement in the spec needs an identifiable anchor in the code. The anchor
# proves the mechanism exists; whether it is correct is ZSTG.selfTest()'s business.
$anchors = [ordered]@{
    "configuration/applies live"                   = 'Services.prefs.addObserver'
    "configuration/prefs declared"                 = 'getDefaultBranch'
    "configuration/master switch"                  = 'force = false'
    "configuration/diagnostic log"                 = 'IOUtils.writeUTF8'
    "configuration/tolerates invalid input"        = 'function parseRules'
    "configuration/interface language"             = 'function chooseLanguage'
    "favicon-colors/extraction"                    = 'getImageData'
    "favicon-colors/classification by hue"         = 'function colorName'
    "favicon-colors/does not block"                = 'function applyFaviconColor'
    "favicon-colors/applies when the icon arrives" = 'function onTabAttrModified'
    "favicon-colors/manual precedence"             = 'function recordManualColor'
    "group-presentation/label from the key"        = 'label: info.label'
    "group-presentation/identity by attribute"     = 'KEY_ATTR'
    "group-presentation/collapse hides tabs"       = 'display: none'
    "group-presentation/focus on the N recent"     = 'recentGroups'
    "group-visuals/count"                          = 'COUNT_ATTR'
    "group-visuals/count displayed"                = 'attr\(zstg-hidden-count\)'
    "group-visuals/collapsed dimmed"               = 'collapsed\] \.tab-group-label'
    "grouping-commands/scoped to current Space"    = 'function currentSpace'
    "grouping-commands/regroup"                    = 'function regroup'
    "grouping-commands/ungroup"                    = 'function ungroup'
    "grouping-commands/rename"                     = 'function renameGroup'
    "grouping-commands/collapse and expand"        = 'function setCollapsed'
    "space-isolation/Space comes from the tab"     = 'function spaceOfTab'
    "space-isolation/eligibility"                  = 'function isEligible'
    "space-isolation/group by Space and key"       = 'function findGroup'
    "space-scoped-tab-switch/filter"               = 'allUsedBrowsers'
    "space-scoped-tab-switch/essentials"           = 'essential && !tabSpace'
    "space-scoped-tab-switch/can be turned off"    = 'spaceScopedTabSwitch'
    "space-scoped-tab-switch/failure delegates"    = 'delegating to native'
    "tab-grouping/key by domain"                   = 'getBaseDomainFromHost'
    "tab-grouping/subdomain"                       = 'groupBySubdomain'
    "tab-grouping/custom rules"                    = 'rule:\$\{rule.name\}'
    "tab-grouping/minimum tabs"                    = 'candidates.length < cfg\(\).minTabs'
    "tab-grouping/non-groupable URLs"              = 'GROUPABLE_SCHEMES'
    "tab-grouping/exclusion list"                  = 'c.excluded'
    "tab-grouping/re-evaluation on navigation"     = 'onLocationChange'
    "tab-grouping/leaves the old group"            = 'leftPreviousGroup'
    "tab-grouping/reclaim after restart"           = 'function reclaimGroups'
    "tab-grouping/recover unmarked groups"         = 'function recoverOldGroups'
    "tab-grouping/persisted link"                  = 'function saveGroupMap'
    "tab-grouping/empty groups"                    = 'function removeEmptyGroups'
    "control-panel/registers about:"               = 'nsIAboutModule'
    "control-panel/page is local only"             = 'chrome://userchrome/content/'
    "diagnostics/version identifiable"             = 'const VERSION = '
    "diagnostics/version shown in the panel"       = 'ZSTG\?\.version'
    "diagnostics/self-test"                        = 'function selfTest'
    "diagnostics/self-test checks real state"      = 'Invariants against the real state'
    "diagnostics/inspection"                       = 'function inspect'
    "diagnostics/stable command surface"           = 'window\.ZSTG = '
    "grouping-commands/context menus"              = 'MENU_POPUPS'
    "grouping-commands/keyboard shortcuts"         = 'function registerHotkeys'
    "grouping-commands/outcome as a sentence"      = 'function sentence'
    "grouping-commands/confirm before ungroup"     = 'cmd.confirmUngroup'
    "configuration/log is bounded"                 = 'LOG_MAX_BYTES'
    "configuration/log off by default"             = 'debugLog: false'
    "favicon-colors/snapped to the palette"        = 'function colorName'
    "favicon-colors/classified by hue"             = 'function rgbToHsl'
    "languages/single catalog"                     = 'export const CATALOG'
    "languages/base language fallback"             = 'BASE_LANGUAGE'
    "languages/missing key is recorded"            = 'missingText'
}

$js = Get-Content (Join-Path $root "src\zen-space-tab-groups.uc.mjs") -Raw
$css = Get-Content (Join-Path $root "src\zen-space-tab-groups.uc.css") -Raw
$panel = (Get-Content (Join-Path $root "src\resources\zstg-panel.html") -Raw) + (Get-Content (Join-Path $root "src\resources\zstg-i18n.mjs") -Raw)
$missing = @()
foreach ($name in $anchors.Keys) {
    if (-not (($js -match $anchors[$name]) -or ($css -match $anchors[$name]) -or ($panel -match $anchors[$name]))) {
        $missing += $name
    }
}
Check ($missing.Count -eq 0) "$($anchors.Count) requirements anchored in the code"
foreach ($n in $missing) { Write-Output "       no anchor: $n" }

# ---------------------------------------------------------------------------
Section "Documentation"

# The block is extracted by name. If the extraction comes back empty the loop below
# has nothing to compare and every check passes without checking anything — which is
# exactly what happened when `PADROES` was renamed to `DEFAULTS`. Hence the guard.
$block = [regex]::Match($js, 'const DEFAULTS = \{(.+?)\n\};', 'Singleline').Groups[1].Value
Check ($block.Length -gt 0) "the defaults block was found in the script"

$prefs = [regex]::Matches($block, '(?m)^\s{2}(\w+):') | ForEach-Object { $_.Groups[1].Value }
Check ($prefs.Count -ge 10) "$($prefs.Count) prefs read from the script"

# The version is the one thing a user is asked for when reporting a problem. It used
# to be four separate literals, and inspect() drifted to reporting 0.2.0 while the
# script was 0.16.0 - the number was wrong in exactly the place it mattered most.
$vHeader = [regex]::Match($js, '@version\s+(\S+)').Groups[1].Value
$vConst = [regex]::Match($js, 'const VERSION = "([^"]+)"').Groups[1].Value
Check ($vConst.Length -gt 0) "the version constant was found in the script"
Check ($vHeader -eq $vConst) "the header version matches the constant ($vHeader / $vConst)"
$vLiterals = [regex]::Matches($js, 'version: "[^"]+"').Count
Check ($vLiterals -eq 0) "the version is not duplicated as a literal ($vLiterals found)"

$readme = Get-Content (Join-Path $root "README.md") -Raw

$undocumented = $prefs | Where-Object { -not ($readme -match [regex]::Escape("zen.stg.$_")) }
Check ($undocumented.Count -eq 0) "$($prefs.Count) prefs documented in the README"
foreach ($p in $undocumented) { Write-Output "       not documented: zen.stg.$p" }

$nonexistent = [regex]::Matches($readme, 'zen\.stg\.(\w+)') |
    ForEach-Object { $_.Groups[1].Value } |
    Sort-Object -Unique |
    Where-Object { $prefs -notcontains $_ }
Check ($nonexistent.Count -eq 0) "the README cites no pref that does not exist"
foreach ($p in $nonexistent) { Write-Output "       cited but absent from the code: zen.stg.$p" }

# The public API is what the README teaches people to type in the console. A rename
# that the README does not follow turns the documentation into a list of errors.
$api = [regex]::Match($js, 'window\.ZSTG = \{(.+?)\n\};', 'Singleline').Groups[1].Value
Check ($api.Length -gt 0) "the public API object was found in the script"
$exposed = [regex]::Matches($api, '(?m)^\s{2}(\w+)') | ForEach-Object { $_.Groups[1].Value }
$cited = [regex]::Matches($readme, 'ZSTG\.(\w+)') |
    ForEach-Object { $_.Groups[1].Value } |
    Sort-Object -Unique
$broken = $cited | Where-Object { $exposed -notcontains $_ }
Check ($broken.Count -eq 0) "the README cites only functions that exist ($($exposed.Count) exposed)"
foreach ($m in $broken) { Write-Output "       cited but absent from the API: ZSTG.$m" }

# ---------------------------------------------------------------------------
Section "Installers"

# Two installers for the same product drift: a file added to one and forgotten in
# the other produces an install that is silently incomplete on that platform only.
# Comparing the lists is the whole reason this check exists.
$ps1 = Get-Content (Join-Path $root "install.ps1") -Raw
$sh = Get-Content (Join-Path $root "install.sh") -Raw

$psFiles = [regex]::Matches($ps1, 'From = "([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
$shFiles = [regex]::Matches($sh, '(src/[^:"]+|vendor/[^:"]+):') | ForEach-Object { $_.Groups[1].Value }

Check ($psFiles.Count -gt 0) "install.ps1 declares a file list ($($psFiles.Count) entries)"
Check ($shFiles.Count -gt 0) "install.sh declares a file list ($($shFiles.Count) entries)"

$onlyPs = $psFiles | Where-Object { $shFiles -notcontains $_ }
$onlySh = $shFiles | Where-Object { $psFiles -notcontains $_ }
Check (($onlyPs.Count -eq 0) -and ($onlySh.Count -eq 0)) "both installers deploy the same files"
foreach ($f in $onlyPs) { Write-Output "       only in install.ps1: $f" }
foreach ($f in $onlySh) { Write-Output "       only in install.sh:  $f" }

# The loader's profile-side utilities are listed by name in install.sh because
# raw.githubusercontent serves files, not directories. A file added to the vendored
# loader and not to that list yields a loader that half-loads.
$vendorUtils = Get-ChildItem (Join-Path $root "vendor\fx-autoconfig\profile\chrome\utils") -File |
    ForEach-Object { $_.Name }
$listedUtils = [regex]::Match($sh, 'UTILS="([^"]+)"').Groups[1].Value -split '\s+' |
    Where-Object { $_ }
$missingUtils = $vendorUtils | Where-Object { $listedUtils -notcontains $_ }
Check ($missingUtils.Count -eq 0) "install.sh lists every vendored loader utility ($($vendorUtils.Count))"
foreach ($u in $missingUtils) { Write-Output "       not listed: $u" }

# The offered restart exists in both installers, with the same wording and the
# same bounded wait. A user reading instructions written for one platform must
# find the other behaving identically.
Check (($ps1 -match '\[switch\]\$Restart') -and ($sh -match '--restart\)')) "both installers declare the restart option"

$restartWording = @(
    'Restart Zen now? It will close, the startup cache will be cleared, and it will reopen.',
    'Zen is not running. Clear the startup cache and launch it now?',
    'did not close within',
    'skipping the cache clearing',
    'Zen was restarted and the startup cache cleared.',
    'Done, but Zen is still open and nothing was deleted.'
)
$notShared = $restartWording | Where-Object {
    -not (($ps1 -match [regex]::Escape($_)) -and ($sh -match [regex]::Escape($_)))
}
Check ($notShared.Count -eq 0) "restart wording matches between the installers"
foreach ($s in $notShared) { Write-Output "       differs: $s" }

$waitSh = [regex]::Match($sh, '(?m)^RESTART_WAIT=(\d+)').Groups[1].Value
$waitPs = [regex]::Match($ps1, '\$RestartWaitSeconds = (\d+)').Groups[1].Value
Check ($waitSh -and ($waitSh -eq $waitPs)) "the bounded wait is the same in both installers ($waitSh / $waitPs)"

# ---------------------------------------------------------------------------
Section "Interface texts"

# Three catalogs edited by hand drift apart silently: a key added to one language
# only shows up as a raw key on screen, and only in that language.
$i18nPath = Join-Path $root "src\resources\zstg-i18n.mjs"
if ((Test-Path $i18nPath) -and (Get-Command node -ErrorAction SilentlyContinue)) {
    $uri = "file:///" + ($i18nPath -replace '\\', '/')
    $code = @"
import { LANGUAGES, BASE_LANGUAGE, CATALOG } from '$uri';
const base = Object.keys(CATALOG[BASE_LANGUAGE]);
const bad = [];
for (const l of LANGUAGES) {
  const missing = base.filter(k => !(k in CATALOG[l]));
  const extra = Object.keys(CATALOG[l]).filter(k => !base.includes(k));
  if (missing.length || extra.length) bad.push(l + ': ' + [...missing.map(k => '-' + k), ...extra.map(k => '+' + k)].join(' '));
}
console.log(base.length + '|' + LANGUAGES.length + '|' + bad.join(' ; '));
"@
    $out = node --input-type=module -e $code 2>&1 | Out-String
    $parts = $out.Trim().Split("|")
    if ($parts.Count -eq 3) {
        Check ($parts[2].Trim().Length -eq 0) "$($parts[0]) texts present in all $($parts[1]) languages"
        if ($parts[2].Trim()) { Write-Output "       $($parts[2].Trim())" }
    }
    else {
        Check $false "could not read the text catalog: $($out.Trim())"
    }
}
else {
    $warnings += "text catalog or Node not found; skipping the language check"
}

# ---------------------------------------------------------------------------
Section "Language of the source"

# The project publishes its code and specification in English. A file that goes back
# to Portuguese is caught here and not in review.
$sources = @(
    "src\zen-space-tab-groups.uc.mjs",
    "src\zen-space-tab-groups.uc.css",
    "src\resources\zstg-panel.html",
    "install.ps1",
    "install.sh",
    "scripts\verify.ps1",
    "README.md"
) + (Get-ChildItem (Join-Path $root "openspec\specs") -Recurse -Filter "*.md" |
     ForEach-Object { $_.FullName.Substring($root.Length + 1) })

$withAccents = @()
foreach ($s in $sources) {
    $p = Join-Path $root $s
    if (-not (Test-Path $p)) { continue }
    # The catalog is deliberately left out: it holds the translations.
    $hits = Select-String -Path $p -Pattern '[\u00e3\u00e7\u00f5\u00ea\u00f4\u00e2\u00ed\u00fa]' -AllMatches
    if ($hits) { $withAccents += "$s (line $($hits[0].LineNumber))" }
}
Check ($withAccents.Count -eq 0) "$($sources.Count) source files in English"
foreach ($s in $withAccents) { Write-Output "       Portuguese found: $s" }

# ---------------------------------------------------------------------------
Section "Syntax"

if (Get-Command node -ErrorAction SilentlyContinue) {
    node --check (Join-Path $root "src\zen-space-tab-groups.uc.mjs") 2>&1 | Out-Null
    Check ($LASTEXITCODE -eq 0) "script has no syntax error"
    node --check $i18nPath 2>&1 | Out-Null
    Check ($LASTEXITCODE -eq 0) "text catalog has no syntax error"
}
else {
    $warnings += "Node not found; skipping the syntax check"
}

# ---------------------------------------------------------------------------
Section "Installation"

$destJs = Join-Path $Profile "chrome\JS\zen-space-tab-groups.uc.mjs"
$destCss = Join-Path $Profile "chrome\CSS\zen-space-tab-groups.uc.css"

if (Test-Path $destJs) {
    $vRepo = [regex]::Match($js, '@version\s+(\S+)').Groups[1].Value
    $vProfile = [regex]::Match((Get-Content $destJs -Raw), '@version\s+(\S+)').Groups[1].Value
    Check ($vRepo -eq $vProfile) "script in the profile at the repository version ($vRepo / $vProfile)"
}
else {
    Check $false "script not installed in the profile"
}

if (Test-Path $destCss) {
    $hRepo = (Get-FileHash (Join-Path $root "src\zen-space-tab-groups.uc.css")).Hash
    $hProfile = (Get-FileHash $destCss).Hash
    Check ($hRepo -eq $hProfile) "stylesheet in the profile identical to the repository one"
}
else {
    Check $false "stylesheet not installed in the profile"
}

# Resources are copied, not linked: an edit in the repository does not reach the
# profile until install.ps1 runs again, and the panel keeps showing the old page.
foreach ($res in (Get-ChildItem (Join-Path $root "src\resources") -File)) {
    $destRes = Join-Path $Profile "chrome\resources\$($res.Name)"
    if (Test-Path $destRes) {
        Check ((Get-FileHash $res.FullName).Hash -eq (Get-FileHash $destRes).Hash) `
              "resource in the profile up to date: $($res.Name)"
    }
    else {
        Check $false "resource not installed in the profile: $($res.Name)"
    }
}

# A Zen update deletes these two files; it is the most common failure in real use.
Check (Test-Path (Join-Path $ZenDir "config.js")) "loader: config.js present"
Check (Test-Path (Join-Path $ZenDir "defaults\pref\config-prefs.js")) "loader: config-prefs.js present"
Check (Test-Path (Join-Path $Profile "chrome\utils\boot.sys.mjs")) "loader: utils in the profile"

# ---------------------------------------------------------------------------
Write-Output ""
foreach ($w in $warnings) { Write-Output "warning: $w" }

if ($failures.Count -eq 0) {
    Write-Output "EVERYTHING IN SYNC"
    Write-Output "Behavior is not verified here - run ZSTG.selfTest() in the console."
    exit 0
}

Write-Output "$($failures.Count) check(s) failed:"
foreach ($f in $failures) { Write-Output "  - $f" }
exit 1
