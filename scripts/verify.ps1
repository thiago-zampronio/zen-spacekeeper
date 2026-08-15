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
    # Set only if detection picks the wrong one. Both are detected the way the
    # installers do it; an undetected one skips the Installation section with a
    # warning instead of failing checks that say nothing about the repository.
    [string]$Profile,
    [string]$ZenDir
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$failures = @()
$warnings = @()
# Windows PowerShell 5.1 does not define $IsWindows; null therefore means Windows.
$onWindows = $IsWindows -or ($null -eq $IsWindows)

if ($onWindows) {
    # Re-reads PATH from the registry: a shell opened before Node was installed still
    # carries the old PATH, and the openspec wrapper calls `node` without a full path.
    $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
                [Environment]::GetEnvironmentVariable("Path", "User") + ";" +
                "$env:APPDATA\npm"
}

# Detection mirrors the installers: profiles.ini's install section first, then the
# Default flag; the application directory from the platform's usual places.
function Detect-ProfileDir {
    $profileRoot = if ($onWindows) { Join-Path $env:APPDATA "zen" }
        elseif ($IsMacOS) { Join-Path $HOME "Library/Application Support/zen" }
        else { Join-Path $HOME ".zen" }
    $ini = Join-Path $profileRoot "profiles.ini"
    if (-not (Test-Path $ini)) { return $null }
    $sections = @{}
    $current = $null
    foreach ($line in (Get-Content $ini)) {
        if ($line -match '^\[(.+)\]$') { $current = $matches[1]; $sections[$current] = @{} }
        elseif ($current -and $line -match '^([^=]+)=(.*)$') { $sections[$current][$matches[1]] = $matches[2] }
    }
    $path = $null
    foreach ($name in $sections.Keys) {
        if ($name -like "Install*" -and $sections[$name]["Default"]) { $path = $sections[$name]["Default"]; break }
    }
    if (-not $path) {
        foreach ($name in $sections.Keys) {
            if ($name -like "Profile*" -and $sections[$name]["Default"] -eq "1") { $path = $sections[$name]["Path"]; break }
        }
    }
    if (-not $path) { return $null }
    if ([System.IO.Path]::IsPathRooted($path)) { $path } else { Join-Path $profileRoot $path }
}

function Detect-ZenDir {
    if ($onWindows) {
        foreach ($c in @("$env:ProgramFiles\Zen Browser", "${env:ProgramFiles(x86)}\Zen Browser",
                         "$env:LOCALAPPDATA\Programs\Zen Browser", "$env:LOCALAPPDATA\Zen Browser")) {
            if ($c -and (Test-Path (Join-Path $c "zen.exe"))) { return $c }
        }
        return $null
    }
    if ($IsMacOS) {
        foreach ($b in @("/Applications/Zen.app", "/Applications/Zen Browser.app",
                         "$HOME/Applications/Zen.app", "$HOME/Applications/Zen Browser.app")) {
            if (Test-Path (Join-Path $b "Contents/Resources")) { return (Join-Path $b "Contents/Resources") }
        }
        return $null
    }
    foreach ($d in @("/opt/zen", "/opt/zen-browser", "/usr/lib/zen", "/usr/lib/zen-browser")) {
        if ((Test-Path (Join-Path $d "zen")) -or (Test-Path (Join-Path $d "zen-bin"))) { return $d }
    }
    return $null
}

if (-not $Profile) { $Profile = Detect-ProfileDir }
if (-not $ZenDir) { $ZenDir = Detect-ZenDir }

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

    # `--archived` exists only in some CLI versions; `--all` is the widest this
    # one offers, and an unknown-option error must read as a failure, never as a
    # pass.
    $everything = openspec validate --all 2>&1 | Out-String
    Check ($everything -match "0 failed") "active changes and specs validate"

    $active = openspec list 2>&1 | Out-String
    if ($active -notmatch "No active changes") {
        $warnings += "there are active changes - check whether they should be archived"
    }
    Pop-Location
}
else {
    # A missing tool must not degrade into a green stamp: with these skipped, an
    # "EVERYTHING IN SYNC" would be claiming things nothing checked.
    Check $false "openspec CLI and node are required; spec validation could not run"
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
    "tab-grouping/binding map pruned in-session"   = 'prune: true \}\)\), 60000'
    "installation/profile from profiles.ini"       = 'profiles\.ini'
    "installation/loader separate from mod"        = 'Loader \(deleted by every Zen update\)'
    "installation/guard offered, never imposed"    = '--guard\) GUARD=1'
    "loader-guard/self-disarm"                     = 'remove_all'
    "loader-guard/never elevates"                  = 'indistinguishable from malware'
    "loader-guard/restore from cache"              = 'loader-cache/config.js'
    "loader-guard/removal invokable"               = '"--remove"'
    "self-update/release not branch"               = 'releases/latest'
    "self-update/all-or-nothing staging"           = 'spacekeeper-staging'
    "self-update/loader reported not applied"      = 'loaderChanged'
    "control-panel/one-click uninstall"            = 'uninstallSelf'
    "control-panel/clean handover reset"           = 'resetAndRestart'
    "diagnostics/contract canary"                  = 'function checkZenContract'
    "configuration/log records hosts only"         = 'function hostOnly'
    "configuration/log recovers on toggle"         = 'logUnavailable = false'
    "control-panel/pending edit flushed"           = 'pagehide'
    # Call-site anchors: a defined function whose call was deleted from start()
    # passes every definition anchor and ships a mod that silently does less.
    "startup/menu wired"                           = 'createMenu\(\);'
    "startup/hotkeys wired"                        = 'registerHotkeys\(\);'
    "startup/space-scoped switch wired"            = 'installSpaceScopedSwitch\(\);'
    "startup/panel wired"                          = 'registerPanel\(\);'
    "startup/contract canary wired"                = 'checkZenContract\(\);'
}

$js = Get-Content (Join-Path $root "src/zen-space-tab-groups.uc.mjs") -Raw
$css = Get-Content (Join-Path $root "src/zen-space-tab-groups.uc.css") -Raw
$coreSrc = Get-Content (Join-Path $root "src/resources/zstg-core.mjs") -Raw
$guardSrc = (Get-Content (Join-Path $root "src/guard/guard.sh") -Raw) + (Get-Content (Join-Path $root "src/guard/guard.ps1") -Raw)
$installerSrc = (Get-Content (Join-Path $root "install.sh") -Raw) + (Get-Content (Join-Path $root "install.ps1") -Raw)
$panel = (Get-Content (Join-Path $root "src/resources/zstg-panel.html") -Raw) + (Get-Content (Join-Path $root "src/resources/zstg-i18n.mjs") -Raw)
$missing = @()
foreach ($name in $anchors.Keys) {
    if (-not (($js -match $anchors[$name]) -or ($css -match $anchors[$name]) -or ($panel -match $anchors[$name]) -or ($coreSrc -match $anchors[$name]) -or ($guardSrc -match $anchors[$name]) -or ($installerSrc -match $anchors[$name]))) {
        $missing += $name
    }
}
Check ($missing.Count -eq 0) "$($anchors.Count) requirements anchored in the code"
foreach ($n in $missing) { Write-Output "       no anchor: $n" }

# A capability with no anchor at all means a whole spec area nothing is proving.
$capabilities = Get-ChildItem (Join-Path $root "openspec/specs") -Directory | ForEach-Object { $_.Name }
$unanchored = $capabilities | Where-Object {
    $cap = $_
    -not ($anchors.Keys | Where-Object { $_ -like "$cap/*" })
}
Check ($unanchored.Count -eq 0) "every capability has at least one anchor ($($capabilities.Count) capabilities)"
foreach ($c in $unanchored) { Write-Output "       no anchors: $c" }

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

# The README teaches people to look for "[ZSTG] x.y.z ready"; that literal escaped
# the version check once and drifted a full release behind.
$vReadme = [regex]::Match($readme, '\[ZSTG\] (\d+\.\d+\.\d+)').Groups[1].Value
Check ($vReadme -eq $vConst) "the README ready-line version matches the script ($vReadme / $vConst)"

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
$api = [regex]::Match($js, 'window\.ZSTG = \{(.+?)\n\s*\};', 'Singleline').Groups[1].Value
Check ($api.Length -gt 0) "the public API object was found in the script"
$exposed = [regex]::Matches($api, '(?m)^\s+(\w+)') | ForEach-Object { $_.Groups[1].Value }
$cited = [regex]::Matches($readme, 'ZSTG\.(\w+)') |
    ForEach-Object { $_.Groups[1].Value } |
    Sort-Object -Unique
$broken = $cited | Where-Object { $exposed -notcontains $_ }
Check ($broken.Count -eq 0) "the README cites only functions that exist ($($exposed.Count) exposed)"
foreach ($m in $broken) { Write-Output "       cited but absent from the API: ZSTG.$m" }

# The Structure block in the README and the file map in CLAUDE.md are where a
# reader is told what exists. Both drift the same way: a file is added or renamed
# and the maps keep describing the old repository - install.sh was missing from
# both for a while. Cited paths must exist, and every top-level path must be in
# each map; README.md, CLAUDE.md, LICENSE and NOTICE describe themselves.
function Get-MapEntries($text, $header) {
    $block = [regex]::Match($text, [regex]::Escape($header) + '[\s\S]*?```\n([\s\S]+?)```').Groups[1].Value
    $block -split "`n" | Where-Object { $_ -match '^\S' } |
        ForEach-Object { ($_ -split '\s+')[0] } | Where-Object { $_ }
}

$claudeMd = Get-Content (Join-Path $root "CLAUDE.md") -Raw
$maps = [ordered]@{
    "the README Structure map"    = Get-MapEntries $readme '## Structure'
    "the CLAUDE.md file map"      = Get-MapEntries $claudeMd '## Where things live'
}
$selfDescribing = @("README.md", "CLAUDE.md", "LICENSE", "NOTICE")
# On disk but not part of the repository the maps describe (gitignored artifacts).
$notRepo = @("node_modules")
$topLevel = Get-ChildItem $root | Where-Object {
    $_.Name -notlike ".*" -and $selfDescribing -notcontains $_.Name -and $notRepo -notcontains $_.Name
} | ForEach-Object { $_.Name }

foreach ($mapName in $maps.Keys) {
    $entries = @($maps[$mapName])
    Check ($entries.Count -gt 0) "$mapName was found ($($entries.Count) entries)"

    $gone = $entries | Where-Object { -not (Test-Path (Join-Path $root $_)) }
    Check ($gone.Count -eq 0) "$mapName cites only paths that exist"
    foreach ($g in $gone) { Write-Output "       cited but absent: $g" }

    $uncovered = $topLevel | Where-Object {
        $name = $_
        -not ($entries | Where-Object { $_ -eq $name -or $_ -eq "$name/" -or $_ -like "$name/*" })
    }
    Check ($uncovered.Count -eq 0) "$mapName covers every top-level path"
    foreach ($u in $uncovered) { Write-Output "       not in the map: $u" }
}

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
$vendorUtils = Get-ChildItem (Join-Path $root "vendor/fx-autoconfig/profile/chrome/utils") -File |
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

# Every option an installer accepts is in the README, and the README teaches no
# option that does not exist. --help is left out of the extraction on purpose,
# and the --zstg-* CSS variables in the appearance table are excluded by their
# prefix. Case-sensitive on the PowerShell side: --check must not satisfy -Check.
$shOptions = @(
    [regex]::Matches($sh, '(?m)^\s+(--[a-z-]+)\)') | ForEach-Object { $_.Groups[1].Value }
) | Sort-Object -Unique
$psOptions = @(
    [regex]::Matches($ps1, '\[(?:switch|string)\]\$(\w+)') | ForEach-Object { $_.Groups[1].Value }
) | Sort-Object -Unique |
    # Internal plumbing set by the self-elevation relaunch, deliberately absent
    # from the README: documenting it would invite people to pass it.
    Where-Object { $_ -ne "ElevatedChild" }
Check ($shOptions.Count -gt 0) "install.sh declares options ($($shOptions.Count))"
Check ($psOptions.Count -gt 0) "install.ps1 declares options ($($psOptions.Count))"

$undocumentedOpts = @()
$undocumentedOpts += $shOptions | Where-Object { -not ($readme -match [regex]::Escape($_)) }
$undocumentedOpts += $psOptions | Where-Object { -not ($readme -cmatch ('(?<![\w-])-' + $_ + '\b')) } |
    ForEach-Object { "-$_" }
Check ($undocumentedOpts.Count -eq 0) "every installer option is documented in the README"
foreach ($o in $undocumentedOpts) { Write-Output "       not documented: $o" }

$readmeShOpts = @(
    [regex]::Matches($readme, '(?<![\w-])(--[a-z][a-z-]*)') | ForEach-Object { $_.Groups[1].Value }
) | Sort-Object -Unique | Where-Object { $_ -notlike '--zstg-*' }
$readmePsOpts = @(
    [regex]::Matches($readme, '(?<![\w-])-([A-Z]\w+)') | ForEach-Object { $_.Groups[1].Value }
) | Sort-Object -Unique
$phantomOpts = @()
$phantomOpts += $readmeShOpts | Where-Object { $shOptions -notcontains $_ }
$phantomOpts += $readmePsOpts | Where-Object { $psOptions -notcontains $_ } | ForEach-Object { "-$_" }
Check ($phantomOpts.Count -eq 0) "the README cites no installer option that does not exist"
foreach ($o in $phantomOpts) { Write-Output "       cited but absent: $o" }

# The two guard scripts must tell the user the same things, the same way the two
# installers must.
$guardSh = Get-Content (Join-Path $root "src/guard/guard.sh") -Raw
$guardPs = Get-Content (Join-Path $root "src/guard/guard.ps1") -Raw
$guardWording = @(
    'A Zen update removed the Spacekeeper loader. Re-run the installer to restore it.',
    'Restored from the copy of',
    'Zen is not where it was installed.',
    'never outlives its reason to exist'
)
$guardNotShared = $guardWording | Where-Object {
    -not (($guardSh -match [regex]::Escape($_)) -and ($guardPs -match [regex]::Escape($_)))
}
Check ($guardNotShared.Count -eq 0) "guard wording matches between the two scripts"
foreach ($s in $guardNotShared) { Write-Output "       differs: $s" }

# The panel updates the same files the installers deploy; a file added to one and
# forgotten in the other yields updates that silently skip part of the install.
$updateDests = @(
    [regex]::Matches($js, '"(chrome/[^"]+)"\]') | ForEach-Object { $_.Groups[1].Value }
) | Sort-Object -Unique
$shDests = @(
    [regex]::Matches($sh, '(?m):(chrome/[^"\s]+?)"?$') | ForEach-Object { $_.Groups[1].Value }
) | Sort-Object -Unique
$destsDiffer = (Compare-Object $updateDests $shDests | Measure-Object).Count -gt 0
Check ((-not $destsDiffer) -and ($updateDests.Count -gt 0)) "the panel updater and the installers deploy the same files ($($updateDests.Count))"
if ($destsDiffer) {
    Compare-Object $updateDests $shDests | ForEach-Object { Write-Output "       $($_.SideIndicator) $($_.InputObject)" }
}

# ---------------------------------------------------------------------------
Section "Interface texts"

# Three catalogs edited by hand drift apart silently: a key added to one language
# only shows up as a raw key on screen, and only in that language.
$i18nPath = Join-Path $root "src/resources/zstg-i18n.mjs"
if ((Test-Path $i18nPath) -and (Get-Command node -ErrorAction SilentlyContinue)) {
    # The constructor, not the cast: casting a Unix absolute path yields a
    # relative Uri whose AbsoluteUri is empty, and node then imports ''.
    $uri = [System.Uri]::new((Resolve-Path $i18nPath).Path).AbsoluteUri
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
    Check $false "node is required; the language parity check could not run"
}

# ---------------------------------------------------------------------------
Section "Language of the source"

# The project publishes its code and specification in English. A file that goes back
# to Portuguese is caught here and not in review.
$sources = @(
    "src/zen-space-tab-groups.uc.mjs",
    "src/zen-space-tab-groups.uc.css",
    "src/resources/zstg-panel.html",
    "install.ps1",
    "install.sh",
    "scripts/verify.ps1",
    "README.md"
) + (Get-ChildItem (Join-Path $root "openspec/specs") -Recurse -Filter "*.md" |
     ForEach-Object { $_.FullName.Substring($root.Length + 1) })

# Accents alone are not enough: unaccented Portuguese sailed through this check
# for a whole release ("restaurado(s) reconhecido(s)" in the console, "painel" in
# a factory name). The token list is deliberately short and unambiguous \u2014 every
# word on it is Portuguese-only, so a hit is never a false alarm on English prose.
$ptTokens = '(?i)\b(painel|restaurado|reconhecido|reconhecidos|depois|trocou|mudou|usuario|configuracao)\b'

$withPortuguese = @()
foreach ($s in $sources) {
    $p = Join-Path $root $s
    if (-not (Test-Path $p)) { continue }
    # The catalog is deliberately left out: it holds the translations. This file
    # skips the token pass alone \u2014 the token list itself would match it.
    $hits = Select-String -Path $p -Pattern '[\u00e3\u00e7\u00f5\u00ea\u00f4\u00e2\u00ed\u00fa]' -AllMatches
    if (-not $hits -and $s -ne "scripts/verify.ps1") {
        $hits = Select-String -Path $p -Pattern $ptTokens -AllMatches
    }
    if ($hits) { $withPortuguese += "$s (line $($hits[0].LineNumber))" }
}
Check ($withPortuguese.Count -eq 0) "$($sources.Count) source files in English"
foreach ($s in $withPortuguese) { Write-Output "       Portuguese found: $s" }

# ---------------------------------------------------------------------------
Section "Syntax"

if (Get-Command node -ErrorAction SilentlyContinue) {
    node --check (Join-Path $root "src/zen-space-tab-groups.uc.mjs") 2>&1 | Out-Null
    Check ($LASTEXITCODE -eq 0) "script has no syntax error"
    node --check $i18nPath 2>&1 | Out-Null
    Check ($LASTEXITCODE -eq 0) "text catalog has no syntax error"
}
else {
    Check $false "node is required; the syntax check could not run"
}

# A typo'd identifier in privileged chrome code only surfaces after
# install + restart + cache clear; no-undef removes that loop. The binary comes
# from `npm install` in the repo (or a global eslint).
$eslint = Join-Path $root "node_modules/.bin/eslint"
if (-not (Test-Path $eslint)) {
    $eslint = (Get-Command eslint -ErrorAction SilentlyContinue).Source
}
if ($eslint) {
    & $eslint --max-warnings 0 $root 2>&1 | Out-Null
    Check ($LASTEXITCODE -eq 0) "eslint finds nothing (no-undef, no-unused-vars)"
}
else {
    Check $false "eslint is required; run npm install in the repo"
}

# ---------------------------------------------------------------------------
Section "Core logic"

# The derivation cases from zstg-core.mjs, under plain node with the Public Suffix
# fixture. ZSTG.selfTest() runs the SAME list against the real Services.eTLD in the
# browser; here they run on every verify, with no browser anywhere near.
$corePath = Join-Path $root "src/resources/zstg-core.mjs"
if ((Test-Path $corePath) -and (Get-Command node -ErrorAction SilentlyContinue)) {
    $coreUri = [System.Uri]::new((Resolve-Path $corePath).Path).AbsoluteUri
    $coreCode = @"
import { keyFromParts, runDerivationTests, makeTestETLD } from '$coreUri';
const etld = makeTestETLD();
const noRules = { rules: [], excluded: [], groupBySubdomain: false, subdomainDomains: [], subdomainLabel: 'host' };
const keyFromText = (url, over) => {
  let u;
  try { u = new URL(url); } catch { return null; }
  const c = { ...noRules, ...over };
  return keyFromParts(u.protocol.replace(':', ''), u.hostname, c, etld);
};
const cases = runDerivationTests(keyFromText);
const failures = cases.filter(c => !c.ok);
console.log(cases.length + '|' + failures.length + '|' + failures.map(f => f.name).join(' ; '));
"@
    $coreOut = node --input-type=module -e $coreCode 2>&1 | Out-String
    $coreParts = $coreOut.Trim().Split("|")
    if ($coreParts.Count -eq 3) {
        Check ($coreParts[1] -eq "0") "$($coreParts[0]) derivation cases pass under node"
        if ($coreParts[1] -ne "0") { Write-Output "       failing: $($coreParts[2])" }
    }
    else {
        Check $false "could not run the core tests: $($coreOut.Trim())"
    }
}
else {
    Check $false "node is required; the core logic tests could not run"
}

# ---------------------------------------------------------------------------
Section "Installation"

# Not detecting an installation on THIS machine says nothing about the repository:
# skip with a warning instead of failing checks a contributor cannot fix here.
if (-not $Profile -or -not (Test-Path $Profile)) {
    $warnings += "Zen profile not found on this machine; Installation section skipped"
}
else {
    $destJs = Join-Path $Profile "chrome/JS/zen-space-tab-groups.uc.mjs"
    $destCss = Join-Path $Profile "chrome/CSS/zen-space-tab-groups.uc.css"

    if (Test-Path $destJs) {
        $vRepo = [regex]::Match($js, '@version\s+(\S+)').Groups[1].Value
        $vProfile = [regex]::Match((Get-Content $destJs -Raw), '@version\s+(\S+)').Groups[1].Value
        Check ($vRepo -eq $vProfile) "script in the profile at the repository version ($vRepo / $vProfile)"
    }
    else {
        Check $false "script not installed in the profile"
    }

    if (Test-Path $destCss) {
        $hRepo = (Get-FileHash (Join-Path $root "src/zen-space-tab-groups.uc.css")).Hash
        $hProfile = (Get-FileHash $destCss).Hash
        Check ($hRepo -eq $hProfile) "stylesheet in the profile identical to the repository one"
    }
    else {
        Check $false "stylesheet not installed in the profile"
    }

    # Resources are copied, not linked: an edit in the repository does not reach the
    # profile until the installer runs again, and the panel keeps showing the old page.
    foreach ($res in (Get-ChildItem (Join-Path $root "src/resources") -File)) {
        $destRes = Join-Path $Profile "chrome/resources/$($res.Name)"
        if (Test-Path $destRes) {
            Check ((Get-FileHash $res.FullName).Hash -eq (Get-FileHash $destRes).Hash) `
                  "resource in the profile up to date: $($res.Name)"
        }
        else {
            Check $false "resource not installed in the profile: $($res.Name)"
        }
    }

    Check (Test-Path (Join-Path $Profile "chrome/utils/boot.sys.mjs")) "loader: utils in the profile"

    # A Zen update deletes these two files; it is the most common failure in real use.
    if (-not $ZenDir -or -not (Test-Path $ZenDir)) {
        $warnings += "Zen application directory not found on this machine; loader checks skipped"
    }
    else {
        Check (Test-Path (Join-Path $ZenDir "config.js")) "loader: config.js present"
        Check (Test-Path (Join-Path $ZenDir "defaults/pref/config-prefs.js")) "loader: config-prefs.js present"
    }
}

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
