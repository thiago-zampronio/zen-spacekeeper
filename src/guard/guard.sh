#!/bin/sh
# Spacekeeper loader guard (macOS and Linux).
#
# Invoked by the OS watcher (a LaunchAgent on macOS, a systemd user path unit on
# Linux) — nothing of ours stays resident. Everything it needs lives beside it in
# <profile>/spacekeeper/: the loader cache, the recorded Zen directory and the
# cache date. It depends on no installer, no clone and no network, and it removes
# ITSELF when the mod it guards is no longer installed.
#
# It never elevates: a background process asking for a password is
# indistinguishable from malware asking for one.

set -u

HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROFILE=$(dirname "$HERE")
OS=$(uname -s)

AGENT_PLIST="$HOME/Library/LaunchAgents/org.spacekeeper.guard.plist"
UNIT_DIR="$HOME/.config/systemd/user"

log() {
    printf '%s %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*" >> "$HERE/guard.log" 2>/dev/null || :
}

notify() {
    # Native notification with a log-line fallback: the message must land
    # somewhere, but a broken notifier must not break the restore.
    if [ "$OS" = Darwin ]; then
        osascript -e "display notification \"$1\" with title \"Spacekeeper\"" 2>/dev/null || log "$1"
    elif command -v notify-send >/dev/null 2>&1; then
        notify-send "Spacekeeper" "$1" 2>/dev/null || log "$1"
    else
        log "$1"
    fi
}

remove_watcher() {
    if [ "$OS" = Darwin ]; then
        launchctl bootout "gui/$(id -u)" "$AGENT_PLIST" 2>/dev/null || :
        rm -f "$AGENT_PLIST"
    else
        systemctl --user disable --now spacekeeper-guard.path spacekeeper-guard.service 2>/dev/null || :
        rm -f "$UNIT_DIR/spacekeeper-guard.path" "$UNIT_DIR/spacekeeper-guard.service"
        systemctl --user daemon-reload 2>/dev/null || :
    fi
}

remove_all() {
    remove_watcher
    rm -rf "$HERE"
}

# --remove: complete removal — watcher, script, cache. Invoked by the installers'
# uninstall and by the panel's uninstall; the self-disarm below converges on the
# same end state, so every exit leaves the same machine behind.
if [ "${1:-}" = "--remove" ]; then
    remove_all
    exit 0
fi

# Self-disarm: the guard never outlives its reason to exist. The mod gone from the
# profile means it was removed by hand or abandoned — a watcher over nothing is
# exactly the kind of leftover that makes people distrust background components.
if [ ! -f "$PROFILE/chrome/JS/zen-space-tab-groups.uc.mjs" ]; then
    remove_all
    exit 0
fi

ZEN=$(cat "$HERE/zen-dir" 2>/dev/null || :)
CACHE_DATE=$(cat "$HERE/cache-date" 2>/dev/null || printf 'an unknown date')

# The recorded target must still look like a Zen installation: restoring into an
# arbitrary directory is how a stale path would turn into damage.
if [ -z "$ZEN" ] || [ ! -f "$ZEN/application.ini" ]; then
    notify "Zen is not where it was installed. Re-run the Spacekeeper installer."
    exit 0
fi

# Nothing missing: nothing to do, nothing to say.
if [ -f "$ZEN/config.js" ] && [ -f "$ZEN/defaults/pref/config-prefs.js" ]; then
    exit 0
fi

if [ ! -f "$HERE/loader-cache/config.js" ] || [ ! -f "$HERE/loader-cache/config-prefs.js" ]; then
    notify "A Zen update removed the Spacekeeper loader. Re-run the installer to restore it."
    exit 0
fi

if [ -w "$ZEN" ]; then
    err=$( (mkdir -p "$ZEN/defaults/pref" &&
        cp -f "$HERE/loader-cache/config.js" "$ZEN/config.js" &&
        cp -f "$HERE/loader-cache/config-prefs.js" "$ZEN/defaults/pref/config-prefs.js") 2>&1 ) || err="${err:-copy failed}"
    if [ -z "$err" ]; then
        notify "A Zen update removed the loader. Restored from the copy of $CACHE_DATE; it loads on the next Zen start."
        log "restored the loader from the cache of $CACHE_DATE"
        exit 0
    fi
    # The POSIX -w check passed and the write still failed - on macOS that is
    # App Management (TCC) denying a background process access to another
    # application's bundle. The log names the real reason; the user gets the
    # actionable message.
    log "restore failed although the directory tested writable: $err"
fi

# Not writable (or the write was denied): restoring needs the installer, where a
# human is present to grant privilege.
notify "A Zen update removed the Spacekeeper loader. Re-run the installer to restore it."
log "loader missing; asked the user to re-run the installer"
