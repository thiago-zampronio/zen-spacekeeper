# Spacekeeper installer.
#
#   irm https://raw.githubusercontent.com/thiago-zampronio/zen-spacekeeper/main/install.ps1 | iex
#
# Also works from a clone: .\install.ps1
#
# It installs two separate things, and the difference matters when something
# breaks later:
#
#   1. The fx-autoconfig loader, in the Zen program directory. Needs administrator.
#      EVERY ZEN UPDATE DELETES IT. Re-run this installer after an update.
#   2. Spacekeeper itself, in your profile. Needs no privilege, and survives updates.
#
# Nothing of Spacekeeper's touches the network at runtime: the files are copied
# once, and the mod reads only your own preferences afterwards. The vendored
# fx-autoconfig loader ships its own update check, which is off by default.

[CmdletBinding()]
param(
    # Where the sources come from when the script is piped from the web.
    [string]$Repo = "thiago-zampronio/zen-spacekeeper",
    [string]$Branch = "main",
    # Set these only if detection picks the wrong one.
    [string]$ZenDir,
    [string]$ProfileDir,
    # Reports what is installed and exits. Use it after a Zen update.
    [switch]$Check,
    # Removes Spacekeeper from the profile. Leaves the loader alone: other mods
    # may depend on it.
    [switch]$Uninstall,
    # After installing, close Zen, clear the startup cache and open it again,
    # without asking. Without this flag you are asked, when a terminal is
    # available to answer.
    [switch]$Restart,
    # Internal: set by the self-elevation relaunch. The elevated window closes as
    # soon as the script ends, so everything the user must read or answer — the
    # restart offer, the final instructions — is skipped there and printed by the
    # parent instead.
    [switch]$ElevatedChild
)

$ErrorActionPreference = "Stop"

# How long the offered restart waits for Zen to exit before giving up. Kept equal
# in install.sh (RESTART_WAIT); verify.ps1 fails if the two disagree.
$RestartWaitSeconds = 20

$FILES = @(
    @{ From = "src/zen-space-tab-groups.uc.mjs"; To = "chrome\JS\zen-space-tab-groups.uc.mjs" }
    @{ From = "src/zen-space-tab-groups.uc.css"; To = "chrome\CSS\zen-space-tab-groups.uc.css" }
    @{ From = "src/resources/zstg-panel.html";   To = "chrome\resources\zstg-panel.html" }
    @{ From = "src/resources/zstg-i18n.mjs";     To = "chrome\resources\zstg-i18n.mjs" }
    @{ From = "src/resources/zstg-core.mjs";     To = "chrome\resources\zstg-core.mjs" }
)

$LOADER = @(
    @{ From = "vendor/fx-autoconfig/program/config.js";                    To = "config.js" }
    @{ From = "vendor/fx-autoconfig/program/defaults/pref/config-prefs.js"; To = "defaults\pref\config-prefs.js" }
)

function Say($text) { Write-Host $text }
function Ok($text) { Write-Host "  [ok] $text" -ForegroundColor Green }
function Warn($text) { Write-Host "  [!!] $text" -ForegroundColor Yellow }

# ---------------------------------------------------------------------------
# Where Zen is

function Find-ZenDir {
    if ($ZenDir) { return $ZenDir }

    # The registry entry is the only source that knows about a non-default
    # install path; the fixed paths are the fallback for when it is absent.
    $fromRegistry = @(
        "HKLM:\SOFTWARE\Clients\StartMenuInternet\Zen Browser\shell\open\command",
        "HKCU:\SOFTWARE\Clients\StartMenuInternet\Zen Browser\shell\open\command"
    ) | ForEach-Object {
        try {
            $cmd = (Get-ItemProperty -Path $_ -ErrorAction Stop).'(default)'
            if ($cmd) { Split-Path ($cmd -replace '^"|"$|" .*$', '') -Parent }
        } catch {}
    } | Where-Object { $_ } | Select-Object -First 1

    $candidates = @(
        $fromRegistry,
        "$env:ProgramFiles\Zen Browser",
        "${env:ProgramFiles(x86)}\Zen Browser",
        "$env:LOCALAPPDATA\Programs\Zen Browser",
        "$env:LOCALAPPDATA\Zen Browser"
    ) | Where-Object { $_ -and (Test-Path (Join-Path $_ "zen.exe")) }

    $candidates | Select-Object -First 1
}

# ---------------------------------------------------------------------------
# Which profile

function Find-ProfileDir {
    if ($ProfileDir) { return $ProfileDir }

    $root = Join-Path $env:APPDATA "zen"
    $ini = Join-Path $root "profiles.ini"
    if (-not (Test-Path $ini)) { return $null }

    # profiles.ini is the authority, not the folder listing: someone with several
    # profiles would otherwise get the alphabetically-first one, which is rarely
    # the one they use.
    $lines = Get-Content $ini
    $sections = @{}
    $current = $null
    foreach ($line in $lines) {
        if ($line -match '^\[(.+)\]$') { $current = $matches[1]; $sections[$current] = @{} }
        elseif ($current -and $line -match '^([^=]+)=(.*)$') { $sections[$current][$matches[1]] = $matches[2] }
    }

    # The [Install...] section points at the profile actually in use, and beats
    # the Default=1 flag when both exist.
    $path = $null
    foreach ($name in $sections.Keys) {
        if ($name -like "Install*" -and $sections[$name]["Default"]) {
            $path = $sections[$name]["Default"]
            break
        }
    }
    if (-not $path) {
        foreach ($name in $sections.Keys) {
            if ($name -like "Profile*" -and $sections[$name]["Default"] -eq "1") {
                $path = $sections[$name]["Path"]
                break
            }
        }
    }
    if (-not $path) { return $null }

    $path = $path -replace '/', '\'
    if ([System.IO.Path]::IsPathRooted($path)) { $path } else { Join-Path $root $path }
}

# ---------------------------------------------------------------------------
# The offered restart
#
# Everything here is consent-gated and never kills a process: the browser is asked
# to close its windows, and a browser that stays open (an unsaved-changes dialog,
# usually) wins - the installer reports it and falls back to the manual
# instructions.

function Get-ZenProcesses {
    # Matched against the detected install directory, never the bare name: a
    # process called "zen" from another install is not the one being targeted.
    Get-Process -Name zen -ErrorAction SilentlyContinue | Where-Object {
        try { $_.Path -and ($_.Path -like (Join-Path $zen "*")) } catch { $false }
    }
}

function Get-StartupCacheDir {
    # The cache mirrors the profile's path relative to the roaming profile root,
    # under the local one. A profile outside the known root (an unusual
    # -ProfileDir) means the location cannot be derived safely; returning nothing
    # makes the caller skip the cache step rather than guess.
    $root = Join-Path $env:APPDATA "zen"
    if (-not $prof.StartsWith($root + "\", [System.StringComparison]::OrdinalIgnoreCase)) { return $null }
    $rel = $prof.Substring($root.Length + 1)
    # A relative path that climbs out of the root would aim the recursive delete
    # somewhere else entirely; refusing beats trusting profiles.ini that far.
    if ($rel -match '\.\.') { return $null }
    Join-Path (Join-Path $env:LOCALAPPDATA "zen") (Join-Path $rel "startupCache")
}

$script:cacheCleared = $false

function Invoke-ZenRestart {
    # Returns "performed" or "notclosed". The cache is cleared only after the
    # process is observed gone: clearing it while the browser runs is a race the
    # browser wins by rewriting it on shutdown.
    if (@(Get-ZenProcesses).Count -gt 0) {
        Say "Asking Zen to quit..."
        foreach ($p in Get-ZenProcesses) { $null = $p.CloseMainWindow() }
        $deadline = (Get-Date).AddSeconds($RestartWaitSeconds)
        while ((Get-Date) -lt $deadline -and @(Get-ZenProcesses).Count -gt 0) {
            Start-Sleep -Milliseconds 500
        }
        if (@(Get-ZenProcesses).Count -gt 0) {
            Warn "Zen did not close within $RestartWaitSeconds seconds - a dialog may be waiting for you."
            return "notclosed"
        }
    }

    $cache = Get-StartupCacheDir
    if ($cache) {
        if (Test-Path $cache) { Remove-Item $cache -Recurse -Force }
        Ok "startup cache cleared"
        $script:cacheCleared = $true
    }
    else {
        Warn "The profile is outside the known profile root; skipping the cache clearing."
    }

    Start-Process (Join-Path $zen "zen.exe")
    Ok "Zen started"
    return "performed"
}

# Offer to finish the job: close Zen, clear the startup cache, open Zen again.
# A function because two paths end here: the normal flow, and the parent of an
# elevated child - whose own window closed before the user could read anything.
function Invoke-PostInstall {
    $restartOutcome = "manual"
    $doRestart = $Restart.IsPresent

    if (-not $doRestart -and [Environment]::UserInteractive) {
        $promptText = if (@(Get-ZenProcesses).Count -gt 0) {
            "Restart Zen now? It will close, the startup cache will be cleared, and it will reopen. [y/N]"
        }
        else {
            "Zen is not running. Clear the startup cache and launch it now? [y/N]"
        }
        # A host with no one behind it (redirected input, a service) throws here;
        # no one to ask means the restart is skipped, exactly like the flag-less
        # piped run on the other platforms.
        try { $answer = Read-Host $promptText; $doRestart = ($answer -match '^[Yy]') } catch { $doRestart = $false }
    }

    if ($doRestart) {
        Say ""
        $restartOutcome = Invoke-ZenRestart
    }

    Say ""
    switch ($restartOutcome) {
        "performed" {
            if ($script:cacheCleared) {
                Say "Done. Zen was restarted and the startup cache cleared."
            }
            else {
                Say "Done. Zen was restarted; clear the startup cache yourself if the"
                Say "mod does not load:  about:support -> Clear startup cache"
            }
            Say "Open about:spacekeeper."
        }
        "notclosed" {
            Say "Done, but Zen is still open and nothing was deleted. Close it yourself,"
            Say "then clear the startup cache and reopen it:"
            Say "  about:support -> Clear startup cache"
        }
        default {
            Say "Done. Restart Zen, then open about:spacekeeper."
            Say ""
            Say "If nothing happens after the restart, clear the startup cache:"
            Say "  about:support -> Clear startup cache"
        }
    }
    Say ""
    Say "Re-run this installer after every Zen update - updates delete the loader."
}

# ---------------------------------------------------------------------------
# Sources: a clone next to this script, or the repository over the network

$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { $null }
$fromClone = $scriptDir -and (Test-Path (Join-Path $scriptDir "src\zen-space-tab-groups.uc.mjs"))

$staging = $null

function Get-Source($relative) {
    if ($fromClone) {
        return Join-Path $scriptDir ($relative -replace '/', '\')
    }
    if (-not $script:staging) {
        $script:staging = Join-Path ([System.IO.Path]::GetTempPath()) "spacekeeper-$(Get-Random)"
        New-Item -ItemType Directory -Force $script:staging | Out-Null
    }
    $local = Join-Path $script:staging ($relative -replace '/', '\')
    if (-not (Test-Path $local)) {
        New-Item -ItemType Directory -Force (Split-Path $local -Parent) | Out-Null
        $url = "https://raw.githubusercontent.com/$Repo/$Branch/$relative"
        Invoke-WebRequest -Uri $url -OutFile $local -UseBasicParsing
    }
    $local
}

# ---------------------------------------------------------------------------

$zen = Find-ZenDir
$prof = Find-ProfileDir

Say ""
Say "Spacekeeper"
Say ""

if (-not $zen) {
    Warn "Zen Browser not found. Pass -ZenDir with the folder containing zen.exe."
    exit 1
}
if (-not $prof) {
    Warn "Zen profile not found. Pass -ProfileDir with your profile folder."
    Warn "You can see it in about:profiles, under 'Root Directory'."
    exit 1
}
Say "  Zen:     $zen"
Say "  Profile: $prof"
Say ""

# ---------------------------------------------------------------------------

if ($Check) {
    Say "Loader (deleted by every Zen update):"
    $loaderOk = $true
    foreach ($f in $LOADER) {
        $target = Join-Path $zen $f.To
        if (Test-Path $target) { Ok $f.To } else { Warn "$($f.To) MISSING"; $loaderOk = $false }
    }
    $utils = Join-Path $prof "chrome\utils\boot.sys.mjs"
    if (Test-Path $utils) { Ok "chrome\utils" } else { Warn "chrome\utils MISSING"; $loaderOk = $false }

    Say ""
    Say "Spacekeeper:"
    $modOk = $true
    foreach ($f in $FILES) {
        $target = Join-Path $prof $f.To
        if (Test-Path $target) { Ok $f.To } else { Warn "$($f.To) MISSING"; $modOk = $false }
    }

    Say ""
    if ($loaderOk -and $modOk) {
        Say "Everything installed."
        exit 0
    }
    if (-not $loaderOk) {
        Say "The loader is missing - most likely Zen updated. Run this installer again."
    }
    exit 1
}

if ($Uninstall) {
    foreach ($f in $FILES) {
        $target = Join-Path $prof $f.To
        if (Test-Path $target) { Remove-Item $target -Force; Ok "removed $($f.To)" }
    }
    Say ""
    Say "The fx-autoconfig loader was left in place: other mods may be using it."
    Say "Your preferences are kept, under zen.stg. in about:config."
    Say "Restart Zen."
    exit 0
}

# ---------------------------------------------------------------------------
# The loader needs administrator; Spacekeeper itself does not.

$isAdmin = ([Security.Principal.WindowsPrincipal] `
    [Security.Principal.WindowsIdentity]::GetCurrent()
).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

$loaderPresent = ($LOADER | ForEach-Object { Test-Path (Join-Path $zen $_.To) }) -notcontains $false

if (-not $loaderPresent -and -not $isAdmin) {
    Say "The fx-autoconfig loader has to be written into the Zen program folder,"
    Say "which requires administrator. Windows will ask for confirmation."
    Say ""
    $answer = Read-Host "Continue? [Y/n]"
    if ($answer -and $answer -notmatch '^[YySs]') {
        Say "Stopped. Nothing was changed."
        exit 1
    }

    # Piped from the web there is no file to re-launch, so it is written out first.
    # Into a directory with a random name: a fixed, predictable path in %TEMP% could
    # be swapped by another process between this write and the elevated execution,
    # and whatever sits there would run as Administrator.
    $self = if ($PSCommandPath) { $PSCommandPath } else {
        $tmpDir = Join-Path ([System.IO.Path]::GetTempPath()) "spacekeeper-$(Get-Random)"
        New-Item -ItemType Directory -Force $tmpDir | Out-Null
        $tmp = Join-Path $tmpDir "install.ps1"
        Invoke-WebRequest -Uri "https://raw.githubusercontent.com/$Repo/$Branch/install.ps1" -OutFile $tmp -UseBasicParsing
        $tmp
    }
    $args = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $self,
              "-Repo", $Repo, "-Branch", $Branch, "-ZenDir", $zen, "-ProfileDir", $prof,
              "-ElevatedChild")
    Start-Process -FilePath "pwsh.exe" -ArgumentList $args -Verb RunAs -Wait -ErrorAction SilentlyContinue
    if ($LASTEXITCODE -ne 0 -and -not (Test-Path (Join-Path $zen "config.js"))) {
        Start-Process -FilePath "powershell.exe" -ArgumentList $args -Verb RunAs -Wait
    }
    # The elevated window is gone; whatever the user must read or answer happens
    # here. The restart offer needs no privilege.
    if (Test-Path (Join-Path $zen "config.js")) {
        Invoke-PostInstall
        exit 0
    }
    Warn "The elevated install did not complete - the loader is still missing."
    exit 1
}

function Install-LoaderUtils {
    $utilsSource = Join-Path $prof "chrome\utils"
    New-Item -ItemType Directory -Force (Join-Path $prof "chrome") | Out-Null
    if ($fromClone) {
        Copy-Item (Join-Path $scriptDir "vendor\fx-autoconfig\profile\chrome\utils") $utilsSource -Recurse -Force
    }
    else {
        # Listed one by one on purpose: raw.githubusercontent serves files, not
        # folders, and a wrong guess here leaves a loader that half-loads.
        New-Item -ItemType Directory -Force $utilsSource | Out-Null
        foreach ($u in @("boot.sys.mjs", "chrome.manifest", "fs.sys.mjs",
                         "module_loader.mjs", "uc_api.sys.mjs", "utils.sys.mjs")) {
            try {
                Copy-Item (Get-Source "vendor/fx-autoconfig/profile/chrome/utils/$u") (Join-Path $utilsSource $u) -Force
            } catch {
                Warn "could not fetch utils/$u - $($_.Exception.Message)"
            }
        }
    }
    Ok "chrome\utils"
}

# ---- Loader ----
if ($isAdmin) {
    Say "Loader:"
    New-Item -ItemType Directory -Force (Join-Path $zen "defaults\pref") | Out-Null
    foreach ($f in $LOADER) {
        Copy-Item (Get-Source $f.From) (Join-Path $zen $f.To) -Force
        Ok $f.To
    }
    Install-LoaderUtils
    Say ""
}
else {
    Say "Loader: already present, skipping (administrator not needed)."
    # A second profile has the program-side loader but not the profile-side
    # utilities — and those need no privilege. Without this, a fresh profile got a
    # dead install reported as success.
    if (-not (Test-Path (Join-Path $prof "chrome\utils\boot.sys.mjs"))) {
        Install-LoaderUtils
    }
    Say ""
}

# ---- Spacekeeper ----
Say "Spacekeeper:"
foreach ($f in $FILES) {
    $target = Join-Path $prof $f.To
    New-Item -ItemType Directory -Force (Split-Path $target -Parent) | Out-Null
    Copy-Item (Get-Source $f.From) $target -Force
    Ok $f.To
}

if ($staging) { Remove-Item $staging -Recurse -Force -ErrorAction SilentlyContinue }

if ($ElevatedChild) {
    # The parent is waiting and will print everything the user must read; this
    # window is about to close.
    Say ""
    Say "Elevated install finished."
    exit 0
}

Invoke-PostInstall
