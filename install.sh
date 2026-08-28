#!/bin/sh
# Spacekeeper installer for macOS and Linux.
#
#   curl -fsSL https://raw.githubusercontent.com/thiago-zampronio/zen-spacekeeper/main/install.sh | sh
#
# Also works from a clone: ./install.sh
#
# It installs two separate things, and the difference matters when something
# breaks later:
#
#   1. The fx-autoconfig loader, in the Zen application directory. Needs sudo.
#      EVERY ZEN UPDATE DELETES IT. Re-run this installer after an update.
#   2. Spacekeeper itself, in your profile. Needs no privilege, and survives updates.
#
# Nothing of Spacekeeper's touches the network at runtime: the files are copied
# once, and the mod reads only your own preferences afterwards. The vendored
# fx-autoconfig loader ships its own update check, which is off by default.
# The one exception is the update the user explicitly clicks in the
# about:spacekeeper panel - one request, never on its own.
#
# POSIX sh on purpose: some minimal images ship dash as /bin/sh, and nothing here
# needs arrays or [[ ]].

set -eu

REPO="thiago-zampronio/zen-spacekeeper"
# The branch is now the EXCEPTION, not the default: with neither --ref nor
# --branch given, the source is the latest published release. A branch turns
# every later push into whatever the next person to run this receives, and the
# reason that is unacceptable for updating does not stop applying at install
# time. Kept as an override because development needs it.
BRANCH="main"
BRANCH_SET=0
# An exact ref to fetch from - a release tag, usually. Wins over BRANCH when both
# are given: a branch moves under the caller, a tag does not, and whoever pins a
# release means exactly that release, not whatever main has become since.
REF=""
# The ref actually used, resolved once before the first fetch. Empty in a clone,
# which reads local files and asks the network nothing.
SOURCE_REF=""
ZEN_DIR=""
PROFILE_DIR=""
ACTION="install"
RESTART=0
GUARD=0
NONINTERACTIVE=0

# How long the offered restart waits for Zen to exit before giving up. Kept equal
# in install.ps1 ($RestartWaitSeconds); the verifier fails if the two disagree.
RESTART_WAIT=20

# ---------------------------------------------------------------------------
# The two file lists. Kept in the same order as install.ps1; the verifier fails if
# the two installers disagree about what they deploy.

FILES="src/zen-space-tab-groups.uc.mjs:chrome/JS/zen-space-tab-groups.uc.mjs
src/zen-space-tab-groups.uc.css:chrome/CSS/zen-space-tab-groups.uc.css
src/resources/zstg-panel.html:chrome/resources/zstg-panel.html
src/resources/zstg-panel.mjs:chrome/resources/zstg-panel.mjs
src/resources/zstg-i18n.mjs:chrome/resources/zstg-i18n.mjs
src/resources/zstg-core.mjs:chrome/resources/zstg-core.mjs"

LOADER="vendor/fx-autoconfig/program/config.js:config.js
vendor/fx-autoconfig/program/defaults/pref/config-prefs.js:defaults/pref/config-prefs.js"

UTILS="boot.sys.mjs chrome.manifest fs.sys.mjs module_loader.mjs uc_api.sys.mjs utils.sys.mjs"

# ---------------------------------------------------------------------------

say() { printf '%s\n' "$*"; }
ok() { printf '  [ok] %s\n' "$*"; }
# `warn` is report content, not error output, so it shares stdout with the lines it
# belongs under. On stderr the two streams interleave the moment anything captures
# them together, and a "MISSING" that lands beneath the wrong heading is worse than
# useless in a diagnostic - it was observed printing a loader problem under the mod
# section. install.ps1 never had this because Write-Host keeps one ordered stream.
# `die` stays on stderr: that one really is an error, and it ends the run.
warn() { printf '  [!!] %s\n' "$*"; }
die() { printf '\n%s\n' "$*" >&2; exit 1; }

usage() {
    cat <<'EOF'
Usage: install.sh [options]

  --check           Report what is installed and exit. Use it after a Zen update.
  --uninstall       Remove Spacekeeper from the profile. Keeps the loader, because
                    other mods may depend on it, and keeps your preferences.
  --restart         After installing, close Zen, clear the startup cache and open
                    it again, without asking. Without this flag you are asked,
                    when a terminal is available to answer.
  --guard           Also install the loader guard: an OS watcher that restores the
                    loader when a Zen update deletes it (or notifies you, when
                    restoring would need privilege). Opt-in; removed by --uninstall.
  --zen-dir DIR     Zen application directory. Set only if detection is wrong.
  --profile-dir DIR Zen profile directory. Set only if detection is wrong.
  --repo OWNER/NAME Source repository when fetching over the network.
  --branch NAME     Branch to fetch from, instead of the latest release.
  --ref NAME        Exact git ref to fetch from - a release tag, usually. Wins
                    over --branch when both are given.
  --non-interactive Take every question's default without asking. The restart is
                    skipped unless --restart asks for it; the loader elevation
                    proceeds.
  -h, --help        This text.
EOF
}

while [ $# -gt 0 ]; do
    case "$1" in
        --check) ACTION="check" ;;
        --uninstall) ACTION="uninstall" ;;
        --restart) RESTART=1 ;;
        --guard) GUARD=1 ;;
        --zen-dir) ZEN_DIR="${2:?--zen-dir needs a directory}"; shift ;;
        --profile-dir) PROFILE_DIR="${2:?--profile-dir needs a directory}"; shift ;;
        --repo) REPO="${2:?--repo needs OWNER/NAME}"; shift ;;
        --branch) BRANCH="${2:?--branch needs a name}"; BRANCH_SET=1; shift ;;
        --ref) REF="${2:?--ref needs a tag or branch}"; shift ;;
        --non-interactive) NONINTERACTIVE=1 ;;
        -h|--help) usage; exit 0 ;;
        *) die "Unknown option: $1  (try --help)" ;;
    esac
    shift
done

case "$(uname -s)" in
    Darwin) OS="macos" ;;
    Linux) OS="linux" ;;
    *) die "This installer covers macOS and Linux. On Windows use install.ps1." ;;
esac

# ---------------------------------------------------------------------------
# Where Zen is
#
# Probing a list rather than assuming one layout: on macOS the bundle may be in
# /Applications or under the user's home, and on Linux it may come from a
# distribution package, a tarball in /opt, or a flatpak. When none matches we stop
# and ask, because guessing means writing into some other application's directory,
# possibly with sudo.

find_zen_dir() {
    # An override is trusted for its layout but not for its existence: a typo used
    # to be accepted silently and the loader written into a directory it created.
    # Existence is all that is checked - anything stricter would risk rejecting a
    # legitimate layout that has not been seen.
    if [ -n "$ZEN_DIR" ]; then
        [ -d "$ZEN_DIR" ] && printf '%s' "$ZEN_DIR"
        return
    fi

    if [ "$OS" = macos ]; then
        for bundle in \
            "/Applications/Zen.app" \
            "/Applications/Zen Browser.app" \
            "$HOME/Applications/Zen.app" \
            "$HOME/Applications/Zen Browser.app"
        do
            [ -d "$bundle/Contents/Resources" ] && { printf '%s' "$bundle/Contents/Resources"; return; }
        done
        return
    fi

    # Linux: the loader goes next to the binary, so we look for the directory that
    # actually holds it rather than for a name we expect.
    for dir in \
        /opt/zen /opt/zen-browser \
        /usr/lib/zen /usr/lib/zen-browser \
        /usr/lib64/zen /usr/lib64/zen-browser \
        /usr/share/zen /usr/share/zen-browser \
        "$HOME/.local/share/zen" "$HOME/.local/share/zen-browser"
    do
        [ -x "$dir/zen" ] || [ -x "$dir/zen-bin" ] && { printf '%s' "$dir"; return; }
    done

    # Follow whatever `zen` on PATH really points at; it is usually a symlink into
    # the install directory, which covers layouts not listed above.
    if command -v zen >/dev/null 2>&1; then
        real=$(command -v zen)
        while [ -L "$real" ]; do
            link=$(readlink "$real")
            case "$link" in
                /*) real="$link" ;;
                *) real="$(dirname "$real")/$link" ;;
            esac
        done
        dir=$(dirname "$real")
        [ -x "$dir/zen" ] || [ -x "$dir/zen-bin" ] && { printf '%s' "$dir"; return; }
    fi
}

# ---------------------------------------------------------------------------
# Which profile
#
# profiles.ini is the authority, never the directory listing. On the author's own
# machine the profile flagged Default=1 is NOT the one Zen opens - the [Install...]
# section names a different one. Trusting the flag installs into a profile the user
# never sees, and reports success.

profile_root() {
    if [ "$OS" = macos ]; then
        printf '%s' "$HOME/Library/Application Support/zen"
        return
    fi

    # Linux. `~/.config/zen` is where Zen actually puts profiles - verified against
    # a real 1.21.14b tarball install, which created `~/.config/zen/profiles.ini`
    # and no `~/.zen` at all. `~/.zen` was this installer's only guess for months
    # and it was wrong; it stays in the list because it costs nothing and other
    # layouts may still use it, but it no longer comes first.
    #
    # Existence decides, never a fixed preference: a machine may carry more than
    # one of these, and the one holding profiles.ini is the answer.
    for d in \
        "$HOME/.config/zen" \
        "$HOME/.zen" \
        "$HOME/.var/app/app.zen_browser.zen/.config/zen" \
        "$HOME/.var/app/app.zen_browser.zen/.zen" \
        "$HOME/.var/app/io.github.zen_browser.zen/.config/zen" \
        "$HOME/.var/app/io.github.zen_browser.zen/.zen"
    do
        [ -f "$d/profiles.ini" ] && { printf '%s' "$d"; return; }
    done

    # Nothing found: name the conventional path so the failure message points
    # somewhere real rather than at an empty string.
    printf '%s' "$HOME/.config/zen"
}

# ---------------------------------------------------------------------------
# Was the browser already running when this was installed?
#
# Zen executes what it loaded at startup, so installing under a running browser
# leaves it running the previous version while every file-to-file check reports
# success. From outside the browser the running version cannot be read; the
# observable proxy is ordering - the browser started before the files landed.
#
# The marker exists because the copy PRESERVES each source file's modification
# time: the deployed files wear the checkout's timestamps, not the install's, so
# reading them would answer a different question and, on a fresh clone, answer it
# wrongly.
#
# The comparison is `find -newer` rather than stat: `stat -c %Y` is GNU and
# `stat -f %m` is BSD, and this script runs on both.

install_marker() { printf '%s' "$PROF/chrome/.zstg-installed"; }

profile_lock() {
    for name in parent.lock .parentlock lock; do
        [ -e "$PROF/$name" ] && { printf '%s' "$PROF/$name"; return; }
    done
}

write_install_marker() {
    # A convenience for a later diagnosis; failing to write it must never fail an
    # install that otherwise worked.
    mkdir -p "$PROF/chrome" 2>/dev/null || return 0
    date -u '+%Y-%m-%d %H:%M:%SZ' > "$(install_marker)" 2>/dev/null || :
}

# "stale", "fresh" or "unknown". Unknown stays silent everywhere: a warning that
# fires when the answer is not known trains the user to ignore it.
stale_state() {
    zen_running || { printf 'unknown'; return; }
    marker=$(install_marker)
    [ -f "$marker" ] || { printf 'unknown'; return; }
    lock=$(profile_lock)
    [ -n "$lock" ] || { printf 'unknown'; return; }
    if [ -n "$(find "$marker" -newer "$lock" 2>/dev/null)" ]; then
        printf 'stale'
    else
        printf 'fresh'
    fi
}

find_profile_dir() {
    if [ -n "$PROFILE_DIR" ]; then
        [ -d "$PROFILE_DIR" ] && printf '%s' "$PROFILE_DIR"
        return
    fi

    root=$(profile_root)
    ini="$root/profiles.ini"
    [ -f "$ini" ] || return

    # Pass 1: the [Install...] section names the profile actually in use, and beats
    # the Default=1 flag when both exist.
    path=$(awk -F= '
        /^\[/ { in_install = ($0 ~ /^\[Install/) ; next }
        in_install && $1 == "Default" { print $2; exit }
    ' "$ini")

    # Pass 2: fall back to the profile flagged Default=1.
    if [ -z "$path" ]; then
        path=$(awk -F= '
            /^\[/ { in_profile = ($0 ~ /^\[Profile/) ; p = "" ; d = "" ; next }
            in_profile && $1 == "Path" { p = $2 }
            in_profile && $1 == "Default" && $2 == "1" { d = 1 }
            in_profile && p != "" && d == 1 { print p; exit }
        ' "$ini")
    fi

    [ -z "$path" ] && return
    case "$path" in
        /*) printf '%s' "$path" ;;
        *) printf '%s' "$root/$path" ;;
    esac
}

# ---------------------------------------------------------------------------
# The offered restart
#
# Everything here is consent-gated and never kills a process: the browser is asked
# to quit the way the platform does it, and a browser that stays open (an
# unsaved-changes dialog, usually) wins - the installer reports it and falls back
# to the manual instructions.

zen_bundle() {
    # macOS only: ZEN is <bundle>/Contents/Resources; walk back up to the bundle.
    dirname "$(dirname "$ZEN")"
}

zen_binary() {
    if [ "$OS" = macos ]; then
        printf '%s' "$(zen_bundle)/Contents/MacOS/zen"
    elif [ -x "$ZEN/zen" ]; then
        printf '%s' "$ZEN/zen"
    else
        printf '%s' "$ZEN/zen-bin"
    fi
}

zen_running() {
    # Matched against the detected binary's full path, never the bare name: a
    # process called "zen" from another install is not the one being targeted.
    command -v pgrep >/dev/null 2>&1 || return 1
    pgrep -f "$(zen_binary)" >/dev/null 2>&1
}

startup_cache_dir() {
    # The cache mirrors the profile's path relative to the profile root, under a
    # per-platform cache root. A profile outside the known root (an unusual
    # --profile-dir, or IsRelative=0) means the location cannot be derived safely;
    # returning nothing makes the caller skip the cache step rather than guess.
    root=$(profile_root)
    case "$PROF" in
        "$root"/*) rel=${PROF#"$root"/} ;;
        *) return 1 ;;
    esac
    # A relative path that climbs out of the root would aim the recursive delete
    # somewhere else entirely; refusing beats trusting profiles.ini that far.
    case "$rel" in
        *..*) return 1 ;;
    esac
    if [ "$OS" = macos ]; then
        printf '%s' "$HOME/Library/Caches/zen/$rel/startupCache"
    else
        case "$root" in
            "$HOME/.var/app/"*) printf '%s' "${root%/.zen}/cache/zen/$rel/startupCache" ;;
            *) printf '%s' "$HOME/.cache/zen/$rel/startupCache" ;;
        esac
    fi
}

# Is there a human who will actually answer?
#
# `/dev/tty` opening is NOT that question, and answering the wrong one hung this
# installer forever under `wsl -- bash -lc`: a controlling terminal existed, so the
# prompt was printed and the read blocked on input nobody was going to type. Cron
# and CI reach the same state.
#
# stdout being a terminal is the honest discriminator, and it keeps the case the
# /dev/tty trick was written for: under `curl … | sh` a person's stdin is the
# script, but their stdout is still their terminal. Automation captures stdout, so
# it skips - which is the behavior it wanted anyway.
someone_is_there() {
    # Declared absence beats detection: --non-interactive is the caller stating
    # that no one will answer, so every prompt takes its default by contract
    # instead of by whichever rescue path happens to fire.
    [ "$NONINTERACTIVE" = 1 ] && return 1
    [ -t 1 ] || return 1
    ( : </dev/tty ) 2>/dev/null || return 1
}

ask_tty() {
    someone_is_there || return 1
    printf '%s [y/N] ' "$1" >/dev/tty
    IFS= read -r answer </dev/tty || return 1
    case "$answer" in
        [Yy]*) return 0 ;;
        *) return 1 ;;
    esac
}

CACHE_CLEARED=0

do_restart() {
    # Sets RESTART_OUTCOME to "performed" or "notclosed". The cache is cleared
    # only after the process is observed gone: clearing it while the browser runs
    # is a race the browser wins by rewriting it on shutdown.
    if zen_running; then
        say "Asking Zen to quit..."
        if [ "$OS" = macos ]; then
            osascript -e "quit app \"$(basename "$(zen_bundle)" .app)\"" >/dev/null 2>&1 || true
        else
            # shellcheck disable=SC2046
            kill -TERM $(pgrep -f "$(zen_binary)") 2>/dev/null || true
        fi
        waited=0
        while [ "$waited" -lt "$RESTART_WAIT" ]; do
            zen_running || break
            sleep 1
            waited=$((waited + 1))
        done
        if zen_running; then
            warn "Zen did not close within $RESTART_WAIT seconds - a dialog may be waiting for you."
            RESTART_OUTCOME="notclosed"
            return 0
        fi
    fi

    cache=$(startup_cache_dir || true)
    if [ -n "$cache" ]; then
        rm -rf "$cache"
        ok "startup cache cleared"
        CACHE_CLEARED=1
    else
        warn "The profile is outside the known profile root; skipping the cache clearing."
    fi

    if [ "$OS" = macos ]; then
        open -a "$(zen_bundle)"
    else
        # Detached on purpose: closing the terminal must not take the browser down.
        ( nohup "$(zen_binary)" >/dev/null 2>&1 & )
    fi
    ok "Zen started"
    RESTART_OUTCOME="performed"
}

# ---------------------------------------------------------------------------
# The loader guard
#
# An OS-level watcher — a LaunchAgent on macOS, a systemd user path unit on
# Linux — that runs <profile>/spacekeeper/guard.sh when the loader file changes
# or disappears, and once per login. Everything the guard needs is deployed here;
# after this install, the installer and any clone can be deleted.

GUARD_DIR_NAME="spacekeeper"
AGENT_PLIST="$HOME/Library/LaunchAgents/org.spacekeeper.guard.plist"
UNIT_DIR="$HOME/.config/systemd/user"

guard_installed() {
    [ -f "$PROF/$GUARD_DIR_NAME/guard.sh" ]
}

guard_watcher_installed() {
    if [ "$OS" = macos ]; then
        [ -f "$AGENT_PLIST" ]
    else
        # The unit file existing proves only that a write succeeded, and writing
        # into ~/.config is never the step that fails. systemd accepting it is the
        # question, so the answer comes from systemd.
        [ -f "$UNIT_DIR/spacekeeper-guard.path" ] || return 1
        command -v systemctl >/dev/null 2>&1 || return 1
        case "$(systemctl --user is-enabled spacekeeper-guard.path 2>/dev/null)" in
            enabled|enabled-runtime|static|indirect) return 0 ;;
            *) return 1 ;;
        esac
    fi
}

install_guard() {
    # A missing watcher is not a failed install. This used to `die`, which aborted
    # the whole run over an OPTIONAL extra: the mod itself installs and works
    # perfectly on a system without systemd, and asking for a watcher that cannot
    # exist should cost a warning, not the thing you actually came for. install.ps1
    # already behaved this way; the two now agree.
    if [ "$OS" = linux ] && ! command -v systemctl >/dev/null 2>&1; then
        guard_unavailable "the guard needs systemd on Linux (a user path unit is
the watcher), and this system has no systemctl."
        return
    fi

    say "Guard: a watcher will be created to restore the loader after Zen updates."
    say "  script and cache: $PROF/$GUARD_DIR_NAME/"
    if [ "$OS" = macos ]; then
        say "  watcher: $AGENT_PLIST"
    else
        say "  watcher: $UNIT_DIR/spacekeeper-guard.path"
    fi

    mkdir -p "$PROF/$GUARD_DIR_NAME/loader-cache"
    cp -f "$(fetch "src/guard/guard.sh")" "$PROF/$GUARD_DIR_NAME/guard.sh"
    chmod +x "$PROF/$GUARD_DIR_NAME/guard.sh"
    cp -f "$(fetch "vendor/fx-autoconfig/program/config.js")" \
        "$PROF/$GUARD_DIR_NAME/loader-cache/config.js"
    cp -f "$(fetch "vendor/fx-autoconfig/program/defaults/pref/config-prefs.js")" \
        "$PROF/$GUARD_DIR_NAME/loader-cache/config-prefs.js"
    printf '%s' "$ZEN" > "$PROF/$GUARD_DIR_NAME/zen-dir"
    date -u +%Y-%m-%d > "$PROF/$GUARD_DIR_NAME/cache-date"

    if [ "$OS" = macos ]; then
        mkdir -p "$(dirname "$AGENT_PLIST")"
        cat > "$AGENT_PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>org.spacekeeper.guard</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/sh</string>
        <string>$PROF/$GUARD_DIR_NAME/guard.sh</string>
    </array>
    <key>WatchPaths</key>
    <!-- The DIRECTORY, deliberately: launchd fires on a watched file's creation
         and modification but not on its deletion, and deletion is the one event
         this exists for. Removing a file inside modifies the directory. -->
    <array><string>$ZEN</string></array>
    <key>RunAtLoad</key><true/>
</dict>
</plist>
PLIST
        launchctl bootout "gui/$(id -u)" "$AGENT_PLIST" 2>/dev/null || true
        launchctl bootstrap "gui/$(id -u)" "$AGENT_PLIST" 2>/dev/null ||
            launchctl load -w "$AGENT_PLIST" 2>/dev/null || true
    else
        mkdir -p "$UNIT_DIR"
        cat > "$UNIT_DIR/spacekeeper-guard.service" <<UNIT
[Unit]
Description=Spacekeeper loader guard

[Service]
Type=oneshot
ExecStart=/bin/sh $PROF/$GUARD_DIR_NAME/guard.sh

[Install]
WantedBy=default.target
UNIT
        cat > "$UNIT_DIR/spacekeeper-guard.path" <<UNIT
[Unit]
Description=Watch the Spacekeeper loader

[Path]
# The DIRECTORY, deliberately: a watch on the file itself is lost the moment the
# file is deleted, and deletion is the one event this exists for.
PathModified=$ZEN

[Install]
WantedBy=default.target
UNIT
        systemctl --user daemon-reload 2>/dev/null || true
        systemctl --user enable --now spacekeeper-guard.path 2>/dev/null || true
        systemctl --user enable spacekeeper-guard.service 2>/dev/null || true
    fi

    # Verified, never assumed. The Windows installer printed "[ok] guard installed"
    # while the registration had failed with access denied, leaving the cache, the
    # script, the success message - and nothing watching. That is the exact failure
    # the guard exists to prevent, wearing a green check, and the same shape of bug
    # lived here: every systemctl call above swallows its error.
    if ! guard_watcher_installed; then
        guard_unavailable "the watcher could not be registered."
        return
    fi
    ok "guard installed"
}

# The cache and the script are on disk either way, so the installer and the panel
# can still restore by hand. What must not happen is claiming a watcher exists.
guard_unavailable() {
    warn "$1"
    warn "The loader cache is in place, but nothing will restore it automatically."
    warn "After a Zen update, run this installer again to put the loader back."
}

# ---------------------------------------------------------------------------
# Sources: a clone next to this script, or the repository over the network

SCRIPT_DIR=""
case "${0:-}" in
    */*) SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd) ;;
esac
FROM_CLONE=0
[ -n "$SCRIPT_DIR" ] && [ -f "$SCRIPT_DIR/src/zen-space-tab-groups.uc.mjs" ] && FROM_CLONE=1

STAGING=""
# The explicit `return 0` is load-bearing: the status of an EXIT trap's last command
# replaces the script's own. Without it, `[ -n "" ]` returned 1 on every run that had
# nothing to clean up, so a successful --check reported failure to anything reading
# the exit code.
cleanup() { [ -n "$STAGING" ] && rm -rf "$STAGING"; return 0; }
trap cleanup EXIT INT TERM

# Created up front rather than on first use: every loop below reads its lines
# through a redirect precisely so it runs in this shell, but a value assigned
# inside one would still be invisible to the trap that has to delete it.
if [ "$FROM_CLONE" = 0 ]; then
    STAGING=$(mktemp -d "${TMPDIR:-/tmp}/spacekeeper.XXXXXX")
fi

# The tag of the latest published release, learned by asking rather than by
# computing.
#
# GitHub redirects /releases/latest to /releases/tag/<tag>, so the final URL IS
# the answer — no API call, so none of api.github.com's 60-per-hour-per-IP limit,
# and no version comparison here at all. That absence is the point: the rule for
# which release is newest lives in one place, zstg-core.mjs, where it is tested,
# and duplicating it into sh and PowerShell would put it in three places where
# copies fail only on inputs nobody has yet.
#
# What makes the pointer trustworthy is not GitHub: it is that the release step
# sets it deliberately, with --latest on the current line and without it on a
# hotfix for an older one, and audits it. Read the "The pointer is ours" section
# of the change for why this differs from taking /releases/latest blindly.
resolve_latest() {
    url="https://github.com/$REPO/releases/latest"
    final=""
    if command -v curl >/dev/null 2>&1; then
        final=$(curl -sIL -o /dev/null -w '%{url_effective}' "$url" 2>/dev/null)
    elif command -v wget >/dev/null 2>&1; then
        final=$(wget -S --spider --max-redirect=10 "$url" 2>&1 |
            awk '/^ *Location: /{print $2}' | tail -1)
    else
        die "Neither curl nor wget is available, and this is not a clone."
    fi
    case "$final" in
        */releases/tag/*) : ;;
        *)
            # Stopping, never falling back to a branch. A quiet branch install is
            # discovered months later if ever; a loud failure with an override to
            # hand is recoverable in one command.
            die "Could not determine the latest release (asked $url).
If this is a network problem, try again. To install an exact version anyway:
  --ref v1.2.3      an exact release tag
  --branch main     the moving branch, as older versions always did" ;;
    esac
    printf '%s' "${final##*/tag/}"
}

fetch() {
    # $1 = path relative to the repository root; prints a local path to the file
    if [ "$FROM_CLONE" = 1 ]; then
        printf '%s' "$SCRIPT_DIR/$1"
        return
    fi
    local_path="$STAGING/$1"
    if [ ! -f "$local_path" ]; then
        mkdir -p "$(dirname "$local_path")"
        url="https://raw.githubusercontent.com/$REPO/$SOURCE_REF/$1"
        if command -v curl >/dev/null 2>&1; then
            curl -fsSL "$url" -o "$local_path" || die "Could not download $1"
        elif command -v wget >/dev/null 2>&1; then
            wget -qO "$local_path" "$url" || die "Could not download $1"
        else
            die "Neither curl nor wget is available, and this is not a clone."
        fi
    fi
    printf '%s' "$local_path"
}

# ---------------------------------------------------------------------------

# A flatpak Zen keeps its application files in a read-only image: the loader can
# never be written into it, so the honest move is to say so instead of failing
# later with a raw permission error from cp.
flatpak_zen() {
    for d in \
        /var/lib/flatpak/app/app.zen_browser.zen \
        /var/lib/flatpak/app/io.github.zen_browser.zen \
        "$HOME/.local/share/flatpak/app/app.zen_browser.zen" \
        "$HOME/.local/share/flatpak/app/io.github.zen_browser.zen"
    do
        [ -d "$d" ] && return 0
    done
    return 1
}

ZEN=$(find_zen_dir || true)
PROF=$(find_profile_dir || true)

say ""
say "Spacekeeper"
say ""

if [ -z "$ZEN" ]; then
    if [ "$OS" = linux ] && flatpak_zen; then
        die "Zen is installed via flatpak. Its application files live in a read-only
image, so the fx-autoconfig loader cannot be installed this way."
    fi
    die "Zen Browser not found.
Pass --zen-dir with the directory holding the Zen files:
  macOS: /Applications/Zen.app/Contents/Resources
  Linux: the directory containing the 'zen' binary (see: readlink -f \$(command -v zen))"
fi
if [ -z "$PROF" ] || [ ! -d "$PROF" ]; then
    die "Zen profile not found.
Pass --profile-dir with your profile directory.
You can read it in about:profiles, under 'Root Directory'."
fi

say "  Zen:     $ZEN"
say "  Profile: $PROF"
say ""

# ---------------------------------------------------------------------------

if [ "$ACTION" = check ]; then
    loader_missing=0
    mod_missing=0

    say "Loader (deleted by every Zen update):"
    while IFS=: read -r _ dest; do
        [ -n "$dest" ] || continue
        if [ -f "$ZEN/$dest" ]; then ok "$dest"; else warn "$dest MISSING"; loader_missing=1; fi
    done <<EOF
$LOADER
EOF
    if [ -f "$PROF/chrome/utils/boot.sys.mjs" ]; then
        ok "chrome/utils"
    else
        warn "chrome/utils MISSING"; loader_missing=1
    fi

    say ""
    say "Spacekeeper:"
    while IFS=: read -r _ dest; do
        [ -n "$dest" ] || continue
        if [ -f "$PROF/$dest" ]; then ok "$dest"; else warn "$dest MISSING"; mod_missing=1; fi
    done <<EOF
$FILES
EOF

    say ""
    if [ "$(stale_state)" = stale ]; then
        say ""
        warn "Zen has been running since before these files were installed,"
        warn "so it is still executing the previous version."
        warn "Close Zen, clear the startup cache in about:support, and open it again."
    fi

    say ""
    say "Guard (optional):"
    if guard_installed || guard_watcher_installed; then
        guard_broken=0
        guard_installed || { warn "guard script MISSING"; guard_broken=1; }
        guard_watcher_installed || { warn "guard watcher MISSING"; guard_broken=1; }
        [ -f "$PROF/$GUARD_DIR_NAME/loader-cache/config.js" ] || { warn "guard cache MISSING"; guard_broken=1; }
        if [ "$guard_broken" = 0 ]; then
            ok "installed (cache of $(cat "$PROF/$GUARD_DIR_NAME/cache-date" 2>/dev/null || printf 'unknown date'))"
        else
            warn "partially installed - run this installer with --guard to repair it"
        fi
    else
        say "  not installed (--guard adds a watcher that restores the loader after updates)"
    fi

    say ""
    if [ "$loader_missing" = 0 ] && [ "$mod_missing" = 0 ]; then
        # The files are all there, so this is not a failure - but "Everything
        # installed." on its own, right under the staleness warning, reads as a
        # contradiction and is the sentence people stop at.
        if [ "$(stale_state)" = stale ]; then
            say "Everything installed - but Zen is still running the earlier version, as noted above."
        else
            say "Everything installed."
        fi
        exit 0
    fi
    if [ "$loader_missing" = 1 ]; then
        say "The loader is missing - most likely Zen updated. Run this installer again."
    fi
    exit 1
fi

if [ "$ACTION" = uninstall ]; then
    rm -f "$(install_marker)" 2>/dev/null || :
    while IFS=: read -r _ dest; do
        [ -n "$dest" ] || continue
        if [ -f "$PROF/$dest" ]; then rm -f "$PROF/$dest"; ok "removed $dest"; fi
    done <<EOF
$FILES
EOF
    if guard_installed; then
        sh "$PROF/$GUARD_DIR_NAME/guard.sh" --remove
        ok "removed the guard (watcher, script and cache)"
    elif guard_watcher_installed; then
        # A leftover watcher with no script cannot remove itself.
        if [ "$OS" = macos ]; then
            launchctl bootout "gui/$(id -u)" "$AGENT_PLIST" 2>/dev/null || true
            rm -f "$AGENT_PLIST"
        else
            systemctl --user disable --now spacekeeper-guard.path spacekeeper-guard.service 2>/dev/null || true
            rm -f "$UNIT_DIR/spacekeeper-guard.path" "$UNIT_DIR/spacekeeper-guard.service"
            systemctl --user daemon-reload 2>/dev/null || true
        fi
        rm -rf "$PROF/$GUARD_DIR_NAME"
        ok "removed the guard watcher"
    fi
    say ""
    say "The fx-autoconfig loader was left in place: other mods may be using it."
    say "Your preferences are kept, under zen.stg. in about:config."
    say "Restart Zen."
    exit 0
fi

# ---------------------------------------------------------------------------
# Where the files come from, decided once.
#
# Resolved HERE rather than at startup so --check and --uninstall, which exit
# above, never reach the network for an answer they do not use. A clone never
# reaches it at all.
#
# Precedence: an explicit --ref wins, then an explicit --branch, then the latest
# release. Both overrides are deliberate acts by someone who typed them; the
# default is the one everybody else gets, and it is a release.
if [ "$FROM_CLONE" = 0 ]; then
    if [ -n "$REF" ]; then
        SOURCE_REF="$REF"
    elif [ "$BRANCH_SET" = 1 ]; then
        SOURCE_REF="$BRANCH"
    else
        SOURCE_REF=$(resolve_latest) || exit 1
        [ -n "$SOURCE_REF" ] || die "Could not determine the latest release."
        say "Installing release $SOURCE_REF."
        say ""
    fi
fi

# ---------------------------------------------------------------------------
# The loader needs write access to the application directory; the mod does not.

# Presence is not enough: a loader that exists but is OLDER than the release is
# the case that sends someone here in the first place. The panel's repair
# detects a changed loader and offers to run this installer; deciding by
# presence made that installer report success and change nothing, which is worse
# than not offering the button - the user is told the problem is solved.
# Content decides, so an identical loader still skips and still asks for no
# elevation, and a differing one is rewritten.
loader_present=1
while IFS=: read -r src dest; do
    [ -n "$dest" ] || continue
    if [ -f "$ZEN/$dest" ]; then
        cmp -s "$(fetch "$src")" "$ZEN/$dest" || loader_present=0
    else
        loader_present=0
    fi
done <<EOF
$LOADER
EOF
for u in $UTILS; do
    installed="$PROF/chrome/utils/$u"
    if [ -f "$installed" ]; then
        cmp -s "$(fetch "vendor/fx-autoconfig/profile/chrome/utils/$u")" "$installed" || loader_present=0
    else
        loader_present=0
    fi
done

if [ "$loader_present" = 0 ]; then
    # Whether elevation is needed is decided BEFORE announcing it. Announcing
    # first meant a per-user install - one under $HOME, which this installer
    # explicitly supports - was told it needed administrator rights and then
    # proceeded to ask for nothing. Claiming a permission you do not use teaches
    # the user to disbelieve the next claim.
    SUDO=""
    if [ -w "$ZEN" ]; then
        : # writable as this user; no elevation needed
    elif command -v sudo >/dev/null 2>&1; then
        SUDO="sudo"
    else
        die "The directory is not writable and sudo is not available.
If this is a flatpak install, the application files are read-only and the loader
cannot be installed this way."
    fi

    say "The fx-autoconfig loader has to be written into the Zen application"
    if [ -n "$SUDO" ]; then
        say "directory, which needs administrator rights:"
    else
        say "directory:"
    fi
    say ""
    while IFS=: read -r _ dest; do
        [ -n "$dest" ] || continue
        say "  $ZEN/$dest"
    done <<EOF
$LOADER
EOF
    say ""

    # The Windows installer confirms before elevating; with a cached sudo
    # credential this one would elevate with zero interaction. Same wording, same
    # default. No terminal to answer keeps today's behavior for piped runs.
    if [ -n "$SUDO" ] && someone_is_there; then
        printf 'Continue? [Y/n] ' >/dev/tty
        IFS= read -r answer </dev/tty || answer=""
        case "$answer" in
            [Nn]*) die "Stopped. Nothing was changed." ;;
        esac
    fi

    say "Loader:"
    while IFS=: read -r src dest; do
        [ -n "$dest" ] || continue
        file=$(fetch "$src")
        $SUDO mkdir -p "$ZEN/$(dirname "$dest")"
        $SUDO cp -f "$file" "$ZEN/$dest"
        ok "$dest"
    done <<EOF
$LOADER
EOF

    # The profile side is written as the user, never through sudo: root-owned files
    # here would break the next non-elevated install.
    mkdir -p "$PROF/chrome/utils"
    for u in $UTILS; do
        file=$(fetch "vendor/fx-autoconfig/profile/chrome/utils/$u")
        cp -f "$file" "$PROF/chrome/utils/$u"
    done
    ok "chrome/utils"
    say ""
else
    say "Loader: already up to date, skipping (no administrator rights needed)."
    say ""
fi

say "Spacekeeper:"
while IFS=: read -r src dest; do
    [ -n "$dest" ] || continue
    file=$(fetch "$src")
    mkdir -p "$PROF/$(dirname "$dest")"
    cp -f "$file" "$PROF/$dest"
    ok "$dest"
done <<EOF
$FILES
EOF
write_install_marker

if [ "$GUARD" = 1 ]; then
    say ""
    install_guard
fi

# ---------------------------------------------------------------------------
# Offer to finish the job: close Zen, clear the startup cache, open Zen again.

RESTART_OUTCOME="manual"

if [ "$RESTART" = 1 ]; then
    say ""
    do_restart
else
    if zen_running; then
        prompt="Restart Zen now? It will close, the startup cache will be cleared, and it will reopen."
    else
        prompt="Zen is not running. Clear the startup cache and launch it now?"
    fi
    if ask_tty "$prompt"; then
        say ""
        do_restart
    fi
fi

say ""
case "$RESTART_OUTCOME" in
    performed)
        if [ "$CACHE_CLEARED" = 1 ]; then
            say "Done. Zen was restarted and the startup cache cleared."
        else
            say "Done. Zen was restarted; clear the startup cache yourself if the"
            say "mod does not load:  about:support -> Clear startup cache"
        fi
        say "Open about:spacekeeper."
        ;;
    notclosed)
        say "Done, but Zen is still open and nothing was deleted. Close it yourself,"
        say "then clear the startup cache and reopen it:"
        say "  about:support -> Clear startup cache"
        ;;
    *)
        say "Done. Restart Zen, then open about:spacekeeper."
        say ""
        say "If nothing happens after the restart, clear the startup cache:"
        say "  about:support -> Clear startup cache"
        ;;
esac
say ""
say "Re-run this installer after every Zen update - updates delete the loader."
