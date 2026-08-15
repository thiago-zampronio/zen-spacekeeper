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
#
# POSIX sh on purpose: some minimal images ship dash as /bin/sh, and nothing here
# needs arrays or [[ ]].

set -eu

REPO="thiago-zampronio/zen-spacekeeper"
BRANCH="main"
ZEN_DIR=""
PROFILE_DIR=""
ACTION="install"
RESTART=0

# How long the offered restart waits for Zen to exit before giving up. Kept equal
# in install.ps1 ($RestartWaitSeconds); verify.ps1 fails if the two disagree.
RESTART_WAIT=20

# ---------------------------------------------------------------------------
# The two file lists. Kept in the same order as install.ps1; verify.ps1 fails if
# the two installers disagree about what they deploy.

FILES="src/zen-space-tab-groups.uc.mjs:chrome/JS/zen-space-tab-groups.uc.mjs
src/zen-space-tab-groups.uc.css:chrome/CSS/zen-space-tab-groups.uc.css
src/resources/zstg-panel.html:chrome/resources/zstg-panel.html
src/resources/zstg-i18n.mjs:chrome/resources/zstg-i18n.mjs"

LOADER="vendor/fx-autoconfig/program/config.js:config.js
vendor/fx-autoconfig/program/defaults/pref/config-prefs.js:defaults/pref/config-prefs.js"

UTILS="boot.sys.mjs chrome.manifest fs.sys.mjs module_loader.mjs uc_api.sys.mjs utils.sys.mjs"

# ---------------------------------------------------------------------------

say() { printf '%s\n' "$*"; }
ok() { printf '  [ok] %s\n' "$*"; }
warn() { printf '  [!!] %s\n' "$*" >&2; }
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
  --zen-dir DIR     Zen application directory. Set only if detection is wrong.
  --profile-dir DIR Zen profile directory. Set only if detection is wrong.
  --repo OWNER/NAME Source repository when fetching over the network.
  --branch NAME     Branch to fetch from.
  -h, --help        This text.
EOF
}

while [ $# -gt 0 ]; do
    case "$1" in
        --check) ACTION="check" ;;
        --uninstall) ACTION="uninstall" ;;
        --restart) RESTART=1 ;;
        --zen-dir) ZEN_DIR="${2:?--zen-dir needs a directory}"; shift ;;
        --profile-dir) PROFILE_DIR="${2:?--profile-dir needs a directory}"; shift ;;
        --repo) REPO="${2:?--repo needs OWNER/NAME}"; shift ;;
        --branch) BRANCH="${2:?--branch needs a name}"; shift ;;
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
    [ -n "$ZEN_DIR" ] && { printf '%s' "$ZEN_DIR"; return; }

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
    else
        # A flatpak install keeps its own home; prefer it when the plain path is absent.
        if [ -d "$HOME/.zen" ]; then
            printf '%s' "$HOME/.zen"
        elif [ -d "$HOME/.var/app/app.zen_browser.zen/.zen" ]; then
            printf '%s' "$HOME/.var/app/app.zen_browser.zen/.zen"
        elif [ -d "$HOME/.var/app/io.github.zen_browser.zen/.zen" ]; then
            printf '%s' "$HOME/.var/app/io.github.zen_browser.zen/.zen"
        else
            printf '%s' "$HOME/.zen"
        fi
    fi
}

find_profile_dir() {
    [ -n "$PROFILE_DIR" ] && { printf '%s' "$PROFILE_DIR"; return; }

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

ask_tty() {
    # Piped into sh, stdin is the script itself, so the prompt talks to the
    # controlling terminal. No terminal means no one to ask: the caller skips.
    ( : </dev/tty ) 2>/dev/null || return 1
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

fetch() {
    # $1 = path relative to the repository root; prints a local path to the file
    if [ "$FROM_CLONE" = 1 ]; then
        printf '%s' "$SCRIPT_DIR/$1"
        return
    fi
    local_path="$STAGING/$1"
    if [ ! -f "$local_path" ]; then
        mkdir -p "$(dirname "$local_path")"
        url="https://raw.githubusercontent.com/$REPO/$BRANCH/$1"
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
    if [ "$loader_missing" = 0 ] && [ "$mod_missing" = 0 ]; then
        say "Everything installed."
        exit 0
    fi
    if [ "$loader_missing" = 1 ]; then
        say "The loader is missing - most likely Zen updated. Run this installer again."
    fi
    exit 1
fi

if [ "$ACTION" = uninstall ]; then
    while IFS=: read -r _ dest; do
        [ -n "$dest" ] || continue
        if [ -f "$PROF/$dest" ]; then rm -f "$PROF/$dest"; ok "removed $dest"; fi
    done <<EOF
$FILES
EOF
    say ""
    say "The fx-autoconfig loader was left in place: other mods may be using it."
    say "Your preferences are kept, under zen.stg. in about:config."
    say "Restart Zen."
    exit 0
fi

# ---------------------------------------------------------------------------
# The loader needs write access to the application directory; the mod does not.

loader_present=1
while IFS=: read -r _ dest; do
    [ -n "$dest" ] || continue
    [ -f "$ZEN/$dest" ] || loader_present=0
done <<EOF
$LOADER
EOF
[ -f "$PROF/chrome/utils/boot.sys.mjs" ] || loader_present=0

if [ "$loader_present" = 0 ]; then
    say "The fx-autoconfig loader has to be written into the Zen application"
    say "directory, which needs administrator rights:"
    say ""
    while IFS=: read -r _ dest; do
        [ -n "$dest" ] || continue
        say "  $ZEN/$dest"
    done <<EOF
$LOADER
EOF
    say ""

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

    # The Windows installer confirms before elevating; with a cached sudo
    # credential this one would elevate with zero interaction. Same wording, same
    # default. No terminal to answer keeps today's behavior for piped runs.
    if [ -n "$SUDO" ] && ( : </dev/tty ) 2>/dev/null; then
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
    say "Loader: already present, skipping (no administrator rights needed)."
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
