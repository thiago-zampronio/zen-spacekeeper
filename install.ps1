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
# The one exception is the update the user explicitly clicks in the
# about:spacekeeper panel - one request, never on its own.

[CmdletBinding()]
param(
    # Where the sources come from when the script is piped from the web. With
    # neither -Ref nor -Branch given, that is the latest published release; a
    # branch is the override, not the default.
    [string]$Repo = "thiago-zampronio/zen-spacekeeper",
    [string]$Branch = "main",
    # An exact ref to fetch from - a release tag, usually. Wins over -Branch when
    # both are given: a branch moves under the caller, a tag does not, and whoever
    # pins a release means exactly that release, not whatever main has become since.
    [string]$Ref,
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
    # Also install the loader guard: an OS watcher that restores the loader when a
    # Zen update deletes it (or notifies you, when restoring would need
    # privilege). Opt-in; removed by -Uninstall.
    [switch]$Guard,
    # Take every question's default without asking, instead of relying on the
    # Read-Host catch paths that fire when no host is attached. The restart is
    # skipped unless -Restart asks for it; the loader elevation proceeds.
    [switch]$NonInteractive,
    # Internal: set by the self-elevation relaunch. The elevated window closes as
    # soon as the script ends, so everything the user must read or answer — the
    # restart offer, the final instructions — is skipped there and printed by the
    # parent instead.
    [switch]$ElevatedChild
)

$ErrorActionPreference = "Stop"

# How long the offered restart waits for Zen to exit before giving up. Kept equal
# in install.sh (RESTART_WAIT); the verifier fails if the two disagree.
$RestartWaitSeconds = 20

# The one ref every download uses, the self-elevation re-download included.
# install.sh resolves it the same way; the two must agree, or the elevated child
# could run different code than the parent that launched it.
#
# The tag of the latest published release, learned by asking rather than by
# computing.
#
# GitHub redirects /releases/latest to /releases/tag/<tag>, so the final URI IS
# the answer - no API call, and no version comparison here at all. That absence
# is the point: the rule for which release is newest lives in one place,
# zstg-core.mjs, where it is tested. HttpWebRequest rather than
# Invoke-WebRequest because the property holding the final URI moved between
# PowerShell 5.1 and 7, and this installer must work on both.
function Resolve-LatestRef {
    $url = "https://github.com/$Repo/releases/latest"
    $final = $null
    try {
        $req = [System.Net.HttpWebRequest]::Create($url)
        $req.AllowAutoRedirect = $true
        $req.Method = "HEAD"
        $resp = $req.GetResponse()
        $final = $resp.ResponseUri.AbsoluteUri
        $resp.Close()
    }
    catch { $final = $null }
    if (-not $final -or $final -notlike "*/releases/tag/*") {
        # Stopping, never falling back to a branch. A quiet branch install is
        # discovered months later if ever; a loud failure with an override to
        # hand is recoverable in one command.
        Warn "Could not determine the latest release (asked $url)."
        Warn "If this is a network problem, try again. To install an exact version anyway:"
        Warn "  -Ref v1.2.3       an exact release tag"
        Warn "  -Branch main      the moving branch, as older versions always did"
        exit 1
    }
    $final.Substring($final.LastIndexOf("/tag/") + 5)
}

# Precedence: an explicit -Ref wins, then an explicit -Branch, then the latest
# release. Both overrides are deliberate acts by someone who typed them; the
# default is the one everybody else gets, and it is a release. Resolved lazily so
# -Check, -Uninstall and a run from a clone never reach the network for an answer
# they do not use.
#
# Captured HERE, at script scope, and not inside the function: $PSBoundParameters
# is per-invocation, so inside a parameterless function it is that function's own
# and always empty. Testing it there is silently always false, which made an
# explicit -Branch be ignored and the latest release installed instead - and the
# recovery this script itself advertises when resolution fails is "-Branch main",
# so the advertised escape hatch was the thing that did not work. install.sh has
# always recorded the equivalent flag at parse time.
$script:branchGiven = $PSBoundParameters.ContainsKey("Branch")
$script:resolvedRef = $null
function Get-SourceRef {
    if ($script:resolvedRef) { return $script:resolvedRef }
    if ($Ref) { $script:resolvedRef = $Ref }
    elseif ($script:branchGiven) { $script:resolvedRef = $Branch }
    elseif ($fromClone) { $script:resolvedRef = $Branch }
    else {
        $script:resolvedRef = Resolve-LatestRef
        Say "Installing release $($script:resolvedRef)."
        Say ""
    }
    $script:resolvedRef
}

$FILES = @(
    @{ From = "src/zen-space-tab-groups.uc.mjs"; To = "chrome\JS\zen-space-tab-groups.uc.mjs" }
    @{ From = "src/zen-space-tab-groups.uc.css"; To = "chrome\CSS\zen-space-tab-groups.uc.css" }
    @{ From = "src/resources/zstg-panel.html";   To = "chrome\resources\zstg-panel.html" }
    @{ From = "src/resources/zstg-panel.mjs";    To = "chrome\resources\zstg-panel.mjs" }
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
    # An override is trusted for its layout but not for its existence: a typo used to
    # be accepted silently, print the invented path, and go on to write the loader
    # into a directory it created. Existence is all that is checked - anything
    # stricter would risk rejecting a legitimate layout that has not been seen.
    if ($ZenDir) {
        if (-not (Test-Path -LiteralPath $ZenDir -PathType Container)) {
            Warn "The -ZenDir path does not exist: $ZenDir"
            return
        }
        return $ZenDir
    }

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
    if ($ProfileDir) {
        if (-not (Test-Path -LiteralPath $ProfileDir -PathType Container)) {
            Warn "The -ProfileDir path does not exist: $ProfileDir"
            return
        }
        return $ProfileDir
    }

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

    if (-not $doRestart -and -not $NonInteractive -and [Environment]::UserInteractive) {
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
# The loader guard
#
# A Scheduled Task (logon + daily) that runs <profile>\spacekeeper\guard.ps1.
# Everything the guard needs is deployed here; after this install, the installer
# and any clone can be deleted.

$GuardTaskName = "Spacekeeper Guard"

# ---------------------------------------------------------------------------
# Was the browser already running when this was installed?
#
# Zen executes what it loaded at startup, so installing under a running browser
# leaves it running the previous version while every file-to-file check reports
# success. From outside the browser the running version cannot be read; the
# observable proxy is ordering - the browser started before the files landed.
#
# The marker carries its own timestamp because the copy PRESERVES each source
# file's modification time: the deployed files wear the checkout's timestamps,
# not the install's, so reading them would answer a different question and, on a
# fresh clone, answer it wrongly.
#
# The browser's start time comes from the profile lock, which it rewrites on every
# start - available without inspecting processes, and it agrees with the process
# start time to within a second.

$ProfileLocks = @("parent.lock", ".parentlock", "lock")

# A function, not a variable: $prof is resolved further down, and a top-level
# assignment here would run against a null and take the whole install with it.
function Get-InstallMarker { Join-Path $prof "chrome\.zstg-installed" }

function Write-InstallMarker {
    try {
        $marker = Get-InstallMarker
        New-Item -ItemType Directory -Force (Split-Path $marker -Parent) | Out-Null
        Set-Content -Path $marker -Value ((Get-Date).ToUniversalTime().ToString("u")) -NoNewline
    }
    catch {
        # The marker is a convenience for a later diagnosis; failing to write it
        # must never fail an install that otherwise worked.
    }
}

function Get-ProfileLockTime {
    foreach ($name in $ProfileLocks) {
        $p = Join-Path $prof $name
        if (Test-Path $p) {
            try { return (Get-Item $p -Force).LastWriteTime } catch { }
        }
    }
    return $null
}

# "stale" | "fresh" | "unknown". Unknown stays silent everywhere: a warning that
# fires when the answer is not known trains the user to ignore it.
function Get-StaleState {
    if (@(Get-ZenProcesses).Count -eq 0) { return "unknown" }
    $marker = Get-InstallMarker
    if (-not (Test-Path $marker)) { return "unknown" }
    $lock = Get-ProfileLockTime
    if (-not $lock) { return "unknown" }
    try {
        $installed = (Get-Item $marker -Force).LastWriteTime
        if ($installed -gt $lock) { return "stale" } else { return "fresh" }
    }
    catch { return "unknown" }
}

function Test-GuardInstalled { Test-Path (Join-Path $prof "spacekeeper\guard.ps1") }
function Test-GuardWatcherInstalled {
    $null -ne (Get-ScheduledTask -TaskName $GuardTaskName -ErrorAction SilentlyContinue)
}

function Install-Guard {
    $guardDir = Join-Path $prof "spacekeeper"
    Say "Guard: a watcher will be created to restore the loader after Zen updates."
    Say "  script and cache: $guardDir"
    Say "  watcher: Scheduled Task '$GuardTaskName' (logon + daily)"

    New-Item -ItemType Directory -Force (Join-Path $guardDir "loader-cache") | Out-Null
    Copy-Item (Get-Source "src/guard/guard.ps1") (Join-Path $guardDir "guard.ps1") -Force
    Copy-Item (Get-Source "vendor/fx-autoconfig/program/config.js") `
        (Join-Path $guardDir "loader-cache\config.js") -Force
    Copy-Item (Get-Source "vendor/fx-autoconfig/program/defaults/pref/config-prefs.js") `
        (Join-Path $guardDir "loader-cache\config-prefs.js") -Force
    Set-Content -Path (Join-Path $guardDir "zen-dir") -Value $zen -NoNewline
    Set-Content -Path (Join-Path $guardDir "cache-date") -Value ((Get-Date).ToUniversalTime().ToString("yyyy-MM-dd")) -NoNewline

    $action = New-ScheduledTaskAction -Execute "powershell.exe" `
        -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$guardDir\guard.ps1`""
    # -AtLogOn WITHOUT -User means "at logon of any user", which is an all-users
    # task and needs administrator - it failed with access denied while the
    # installer still reported success. Scoped to this account it registers with
    # the privilege the user already has, which is also the right scope: the guard
    # watches one profile, not the machine.
    $me = "$env:USERDOMAIN\$env:USERNAME"
    $triggers = @(
        (New-ScheduledTaskTrigger -AtLogOn -User $me),
        (New-ScheduledTaskTrigger -Daily -At "12:00")
    )
    $principal = New-ScheduledTaskPrincipal -UserId $me -LogonType Interactive -RunLevel Limited

    try {
        Register-ScheduledTask -TaskName $GuardTaskName -Action $action -Trigger $triggers `
            -Principal $principal -Force -ErrorAction Stop | Out-Null
    }
    catch {
        # Reported, never swallowed. The cache and the script are on disk, so the
        # panel and the installer can still restore by hand - but nothing is
        # watching, and claiming otherwise is worse than not offering the guard.
        Warn "the watcher could not be registered: $($_.Exception.Message)"
        Warn "the loader cache is in place, but nothing will restore it automatically."
        Warn "re-run with -Guard from an elevated PowerShell, or restore with install.ps1 after an update."
        return
    }

    if (-not (Test-GuardWatcherInstalled)) {
        Warn "the watcher did not register, and no error was raised. Nothing is watching."
        return
    }
    Ok "guard installed"
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
        $url = "https://raw.githubusercontent.com/$Repo/$(Get-SourceRef)/$relative"
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

    if ((Get-StaleState) -eq "stale") {
        Say ""
        Warn "Zen has been running since before these files were installed,"
        Warn "so it is still executing the previous version."
        Warn "Close Zen, clear the startup cache in about:support, and open it again."
    }

    Say ""
    Say "Guard (optional):"
    if ((Test-GuardInstalled) -or (Test-GuardWatcherInstalled)) {
        $guardBroken = $false
        if (-not (Test-GuardInstalled)) { Warn "guard script MISSING"; $guardBroken = $true }
        if (-not (Test-GuardWatcherInstalled)) { Warn "guard watcher MISSING"; $guardBroken = $true }
        if (-not (Test-Path (Join-Path $prof "spacekeeper\loader-cache\config.js"))) { Warn "guard cache MISSING"; $guardBroken = $true }
        if (-not $guardBroken) {
            $guardDate = Get-Content (Join-Path $prof "spacekeeper\cache-date") -ErrorAction SilentlyContinue
            if (-not $guardDate) { $guardDate = "unknown date" }
            Ok "installed (cache of $guardDate)"
        }
        else {
            Warn "partially installed - run this installer with -Guard to repair it"
        }
    }
    else {
        Say "  not installed (-Guard adds a watcher that restores the loader after updates)"
    }

    Say ""
    if ($loaderOk -and $modOk) {
        # The files are all there, so this is not a failure - but "Everything
        # installed." on its own, right under the staleness warning, reads as a
        # contradiction and is the sentence people stop at.
        if ((Get-StaleState) -eq "stale") {
            Say "Everything installed - but Zen is still running the earlier version, as noted above."
        }
        else {
            Say "Everything installed."
        }
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
    $marker = Get-InstallMarker
    if (Test-Path $marker) { Remove-Item $marker -Force -ErrorAction SilentlyContinue }
    if (Test-GuardInstalled) {
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $prof "spacekeeper\guard.ps1") -Remove
        Ok "removed the guard (watcher, script and cache)"
    }
    elseif (Test-GuardWatcherInstalled) {
        # A leftover watcher with no script cannot remove itself.
        Unregister-ScheduledTask -TaskName $GuardTaskName -Confirm:$false -ErrorAction SilentlyContinue
        Remove-Item (Join-Path $prof "spacekeeper") -Recurse -Force -ErrorAction SilentlyContinue
        Ok "removed the guard watcher"
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

# Content, not presence. A loader that exists but is OLDER than the release is
# exactly the case that sends someone here: the panel's repair detects a changed
# loader and offers to run this installer, and deciding by presence made that
# installer report success and change nothing - worse than not offering the
# button, because the user is told the problem is solved. An identical loader
# still skips and still asks for no elevation.
$loaderPresent = ($LOADER | ForEach-Object {
    $target = Join-Path $zen $_.To
    if (-not (Test-Path $target)) { return $false }
    (Get-FileHash -Algorithm SHA256 (Get-Source $_.From)).Hash -eq
        (Get-FileHash -Algorithm SHA256 $target).Hash
}) -notcontains $false

if (-not $loaderPresent -and -not $isAdmin) {
    Say "The fx-autoconfig loader has to be written into the Zen program folder,"
    Say "which requires administrator. Windows will ask for confirmation."
    Say ""
    # Same reasoning as the restart prompt: a host with no one behind it throws
    # here. This one defaults to proceeding, where that one defaults to skipping,
    # and the asymmetry is deliberate — declining the restart still leaves a
    # working install, while declining the elevation leaves nothing installed at
    # all. The UAC dialog asks again anyway, and that one cannot be bypassed.
    if ($NonInteractive) {
        Say "(non-interactive; continuing - Windows will still ask for confirmation)"
    }
    else {
        try {
            $answer = Read-Host "Continue? [Y/n]"
            if ($answer -and $answer -notmatch '^[YySs]') {
                Say "Stopped. Nothing was changed."
                exit 1
            }
        }
        catch {
            Say "(no terminal to ask; continuing - Windows will still ask for confirmation)"
        }
    }

    # Piped from the web there is no file to re-launch, so it is written out first.
    # Into a directory with a random name: a fixed, predictable path in %TEMP% could
    # be swapped by another process between this write and the elevated execution,
    # and whatever sits there would run as Administrator.
    $self = if ($PSCommandPath) { $PSCommandPath } else {
        $tmpDir = Join-Path ([System.IO.Path]::GetTempPath()) "spacekeeper-$(Get-Random)"
        New-Item -ItemType Directory -Force $tmpDir | Out-Null
        $tmp = Join-Path $tmpDir "install.ps1"
        Invoke-WebRequest -Uri "https://raw.githubusercontent.com/$Repo/$(Get-SourceRef)/install.ps1" -OutFile $tmp -UseBasicParsing
        $tmp
    }
    # Every path is quoted, and that is not defensive habit - without it this
    # branch cannot install on a default Windows Zen at all.
    #
    # Start-Process -ArgumentList joins its elements with a bare space and quotes
    # NOTHING. The default location is "C:\Program Files\Zen Browser", so the
    # child's command line becomes -ZenDir C:\Program Files\Zen Browser: it binds
    # -ZenDir to "C:\Program" and takes "Files\Zen" as a positional argument,
    # which this script's [CmdletBinding()] refuses. The elevated window then dies
    # on a binding error before doing anything, config.js never appears, the retry
    # below raises a SECOND UAC prompt and fails the same way, and the run ends
    # claiming the elevated install did not complete.
    #
    # It survived because it only fires when the loader is missing AND the shell
    # is not already elevated - so anyone installing from an admin PowerShell, or
    # over an existing loader, never reaches it. A first install from the
    # documented one-liner reaches it every time.
    #
    # The profile path needs this just as badly: it contains spaces on macOS and
    # can on Windows, and $self is a temp path when the script was piped.
    $q = { param($v) '"{0}"' -f $v }
    # The RESOLVED ref, not $Ref as it was passed: the child must fetch from
    # exactly the same source as this run, whatever combination of -Ref and
    # -Branch produced it.
    $args = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (& $q $self),
              "-Repo", (& $q $Repo), "-Ref", (& $q (Get-SourceRef)),
              "-ZenDir", (& $q $zen), "-ProfileDir", (& $q $prof),
              "-ElevatedChild")
    if ($NonInteractive) { $args += "-NonInteractive" }
    Start-Process -FilePath "pwsh.exe" -ArgumentList $args -Verb RunAs -Wait -ErrorAction SilentlyContinue
    if ($LASTEXITCODE -ne 0 -and -not (Test-Path (Join-Path $zen "config.js"))) {
        Start-Process -FilePath "powershell.exe" -ArgumentList $args -Verb RunAs -Wait
    }
    # The elevated window is gone; whatever the user must read or answer happens
    # here. The guard and the restart offer need no privilege - and the guard must
    # NOT be created by the elevated child, or its Scheduled Task would be born in
    # the administrator's context.
    if (Test-Path (Join-Path $zen "config.js")) {
        if ($Guard) {
            Say ""
            Install-Guard
        }
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
    Say "Loader: already up to date, skipping (administrator not needed)."
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
Write-InstallMarker

if ($Guard) {
    Say ""
    Install-Guard
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
