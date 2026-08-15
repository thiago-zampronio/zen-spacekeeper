# Spacekeeper loader guard (Windows).
#
# Invoked by the Scheduled Task (logon + daily) - nothing of ours stays resident.
# Everything it needs lives beside it in <profile>\spacekeeper\: the loader cache,
# the recorded Zen directory and the cache date. It depends on no installer, no
# clone and no network, and it removes ITSELF when the mod it guards is no longer
# installed.
#
# It never elevates: a background process asking for a password is
# indistinguishable from malware asking for one.

param([switch]$Remove)

$ErrorActionPreference = "SilentlyContinue"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$profileDir = Split-Path -Parent $here
$taskName = "Spacekeeper Guard"

function Write-GuardLog($text) {
    Add-Content -Path (Join-Path $here "guard.log") -Value ("{0:u} {1}" -f (Get-Date).ToUniversalTime(), $text)
}

function Show-GuardNotification($text) {
    # A toast with a log-line fallback: the message must land somewhere, but a
    # broken notifier must not break the restore.
    try {
        $null = [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]
        $xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent(
            [Windows.UI.Notifications.ToastTemplateType]::ToastText02)
        $texts = $xml.GetElementsByTagName("text")
        $null = $texts.Item(0).AppendChild($xml.CreateTextNode("Spacekeeper"))
        $null = $texts.Item(1).AppendChild($xml.CreateTextNode($text))
        $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
        [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Spacekeeper").Show($toast)
    }
    catch {
        Write-GuardLog $text
    }
}

function Remove-All {
    # Complete removal - watcher, script, cache. Invoked by the installers'
    # uninstall and by the panel's uninstall; the self-disarm below converges on
    # the same end state, so every exit leaves the same machine behind.
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Remove-Item $here -Recurse -Force
}

if ($Remove) {
    Remove-All
    exit 0
}

# Self-disarm: the guard never outlives its reason to exist. The mod gone from the
# profile means it was removed by hand or abandoned - a watcher over nothing is
# exactly the kind of leftover that makes people distrust background components.
if (-not (Test-Path (Join-Path $profileDir "chrome\JS\zen-space-tab-groups.uc.mjs"))) {
    Remove-All
    exit 0
}

$zen = (Get-Content (Join-Path $here "zen-dir") -ErrorAction SilentlyContinue | Select-Object -First 1)
$cacheDate = (Get-Content (Join-Path $here "cache-date") -ErrorAction SilentlyContinue | Select-Object -First 1)
if (-not $cacheDate) { $cacheDate = "an unknown date" }

# The recorded target must still look like a Zen installation: restoring into an
# arbitrary directory is how a stale path would turn into damage.
if (-not $zen -or -not (Test-Path (Join-Path $zen "application.ini"))) {
    Show-GuardNotification "Zen is not where it was installed. Re-run the Spacekeeper installer."
    exit 0
}

# Nothing missing: nothing to do, nothing to say.
if ((Test-Path (Join-Path $zen "config.js")) -and (Test-Path (Join-Path $zen "defaults\pref\config-prefs.js"))) {
    exit 0
}

$cachedConfig = Join-Path $here "loader-cache\config.js"
$cachedPrefs = Join-Path $here "loader-cache\config-prefs.js"
if (-not (Test-Path $cachedConfig) -or -not (Test-Path $cachedPrefs)) {
    Show-GuardNotification "A Zen update removed the Spacekeeper loader. Re-run the installer to restore it."
    exit 0
}

try {
    $ErrorActionPreference = "Stop"
    New-Item -ItemType Directory -Force (Join-Path $zen "defaults\pref") | Out-Null
    Copy-Item $cachedConfig (Join-Path $zen "config.js") -Force
    Copy-Item $cachedPrefs (Join-Path $zen "defaults\pref\config-prefs.js") -Force
    Show-GuardNotification "A Zen update removed the loader. Restored from the copy of $cacheDate; it loads on the next Zen start."
    Write-GuardLog "restored the loader from the cache of $cacheDate"
}
catch {
    # Not writable (or the copy failed): restoring needs the installer, where a
    # human is present to grant privilege.
    Show-GuardNotification "A Zen update removed the Spacekeeper loader. Re-run the installer to restore it."
}
