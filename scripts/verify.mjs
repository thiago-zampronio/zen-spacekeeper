#!/usr/bin/env node
// Checks that specification, code, documentation and installation are in sync.
//
// The verifier: spec <-> code <-> docs <-> installation sync check. Pure ESM,
// no npm dependency:
// it only reads and compares, and shells out to `openspec`, `git`, `node` and
// `eslint` the same way the PowerShell script does.
//
// Needs no administrator privilege and changes nothing.
// Run it after any change, before archiving a change.
//
// What it does NOT do: verify behavior. This script catches a requirement with no
// implementation, a pref with no documentation and a stale file in the profile - it
// does not catch an implementation that is present and wrong. For behavior, use
// `ZSTG.selfTest()` in the browser console.
//
// Usage: node scripts/verify.mjs [--profile DIR] [--zen-dir DIR]
// Both are detected the way the installers do it; an undetected one skips the
// Installation section with a warning instead of failing checks that say nothing
// about the repository.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { accessSync, constants as fsConstants, existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];
const warnings = [];
const onWindows = process.platform === "win32";
const onMacOS = process.platform === "darwin";

// --- arguments -------------------------------------------------------------
let profileDir = "";
let zenDir = "";
{
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i].toLowerCase();
    if (a === "--profile" || a === "-profile") profileDir = argv[++i] || "";
    else if (a === "--zen-dir" || a === "-zendir") zenDir = argv[++i] || "";
  }
}

// --- small helpers ---------------------------------------------------------
function readText(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

// Scanning nothing must never read as scanning something clean: the vendored
// loader could be gone and the list of its files would still come back
// satisfied, green. So a missing directory throws instead of returning an empty
// list. The single deliberate exception is openspec/changes, which is legitimately
// absent when no change is in flight: that one call passes { optional: true }.
function requireDir(path, options) {
  if (existsSync(path)) return true;
  if (options && options.optional) return false;
  throw new Error("verify cannot run: directory not found: " + path);
}

// Dot-prefixed names are skipped because Get-ChildItem treats them as hidden on
// Unix: a .DS_Store left by Finder must not read as a vendored loader utility or as
// a resource missing from the profile.
function listDir(path, kind, options) {
  if (!requireDir(path, options)) return [];
  return readdirSync(path)
    .filter((name) => !name.startsWith("."))
    .sort()
    .filter((name) => {
      const s = statSync(join(path, name));
      return kind === "dirs" ? s.isDirectory() : kind === "files" ? s.isFile() : true;
    });
}

// Depth-first, names sorted: mirrors the order Get-ChildItem -Recurse reports.
function walkFiles(path, options) {
  if (!requireDir(path, options)) return [];
  const out = [];
  for (const name of readdirSync(path).sort()) {
    if (name.startsWith(".")) continue;
    const full = join(path, name);
    if (statSync(full).isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}

// Test-Path takes a wildcard pattern, and the file maps use one ("src/*.uc.mjs"):
// a literal existsSync would report every glob as a path that no longer exists.
function pathExists(relative) {
  if (!/[*?]/.test(relative)) return existsSync(join(root, relative));
  const parts = relative.split(/[\\/]/).filter(Boolean);
  const walk = (dir, i) => {
    if (i === parts.length) return existsSync(dir);
    const part = parts[i];
    if (!/[*?]/.test(part)) return existsSync(join(dir, part)) && walk(join(dir, part), i + 1);
    if (!existsSync(dir)) return false;
    const re = new RegExp(
      "^" +
        [...part].map((c) => (c === "*" ? "[^\\\\/]*" : c === "?" ? "[^\\\\/]" : escapeRegExp(c))).join("") +
        "$",
      "i",
    );
    return readdirSync(dir).some((n) => re.test(n) && walk(join(dir, n), i + 1));
  };
  return walk(root, 0);
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// PowerShell's -match is case-insensitive and unanchored; this is its equivalent.
function like(text, pattern) {
  return new RegExp(pattern, "i").test(text);
}

function group1(text, pattern, flags) {
  const m = new RegExp(pattern, flags).exec(text);
  return m && m[1] !== undefined ? m[1] : "";
}

function allGroup1(text, pattern, flags) {
  const out = [];
  const re = new RegExp(pattern, flags.includes("g") ? flags : flags + "g");
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push(m[1]);
    if (m[0] === "") re.lastIndex++;
  }
  return out;
}

function countMatches(text, pattern, flags) {
  return allGroup1(text, "(" + pattern + ")", flags).length;
}

// Sort-Object -Unique: case-insensitive uniqueness, case-insensitive ordering.
function sortUnique(values) {
  const seen = new Map();
  for (const v of values) if (!seen.has(v.toLowerCase())) seen.set(v.toLowerCase(), v);
  return [...seen.values()].sort((a, b) => {
    const x = a.toLowerCase();
    const y = b.toLowerCase();
    return x < y ? -1 : x > y ? 1 : 0;
  });
}

// PowerShell's -contains / -notcontains compare strings case-insensitively.
function containsCI(list, value) {
  const v = String(value).toLowerCase();
  return list.some((x) => String(x).toLowerCase() === v);
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex").toUpperCase();
}

function which(command) {
  const paths = (process.env.PATH || "").split(onWindows ? ";" : ":").filter(Boolean);
  const exts = onWindows ? (process.env.PATHEXT || ".COM;.EXE;.BAT;.CMD").split(";") : [""];
  for (const dir of paths) {
    for (const ext of exts) {
      const candidate = join(dir, command + ext);
      try {
        if (!statSync(candidate).isFile()) continue;
        // Get-Command answers with something launchable. A gate weaker than the
        // launch it guards reports a toolchain problem as a failing check, so the
        // execute bit is required where the platform has one.
        if (!onWindows) accessSync(candidate, fsConstants.X_OK);
        return candidate;
      } catch {
        // not there, or not executable; keep looking
      }
    }
  }
  return null;
}

// cmd.exe applies no quoting of its own, so anything with a space or a shell
// metacharacter has to arrive already quoted.
function quoteForCmd(value) {
  return /[\s&|<>^()]/.test(value) ? '"' + value + '"' : value;
}

// stdout and stderr together, the way `2>&1 | Out-String` reads them.
//
// A .cmd or .bat launcher - npm writes one next to every POSIX shell script it
// installs - can only be executed through a shell: since the CVE-2024-27980 fix
// spawnSync refuses one with EINVAL. Callers pass the full path resolved by which()
// for the same reason: libuv's PATH search only appends .com and .exe, so a bare
// name never finds the .cmd shim that is all Windows has for openspec or eslint.
//
// `error` is kept apart from a non-zero exit: a tool that never started is a broken
// toolchain, not a tool reporting a problem, and the two must not read alike.
function run(command, args, cwd) {
  const viaShell = onWindows && /\.(cmd|bat)$/i.test(command);
  const options = { cwd: cwd || root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 };
  const r = viaShell
    ? spawnSync(quoteForCmd(command), args.map(quoteForCmd), { ...options, shell: true })
    : spawnSync(command, args, options);
  return {
    code: r.status === null ? 1 : r.status,
    out: (r.stdout || "") + (r.stderr || ""),
    stdout: r.stdout || "",
    error: r.error || (r.status === null ? new Error("the process did not run to completion") : null),
  };
}

// A tool that could not be launched must be reported as exactly that. Reading the
// empty output as a substantive result points the operator at the specs when the
// problem is their toolchain.
function launchFailed(result, what) {
  if (!result.error) return false;
  check(false, what + " could not be launched (" + result.error.message + "); the check did not run");
  return true;
}

function section(title) {
  console.log("");
  console.log("-- " + title);
}

function check(ok, text) {
  console.log("  " + (ok ? "[ok]" : "[!!]") + " " + text);
  if (!ok) failures.push(text);
}

function detail(text) {
  console.log("       " + text);
}

// --- environment -----------------------------------------------------------
if (onWindows) {
  // Re-reads PATH from the registry: a shell opened before Node was installed still
  // carries the old PATH, and the openspec wrapper calls `node` without a full path.
  // Outside Windows this whole block is a no-op. The current PATH is kept at the end
  // so that resolving the tools can only get easier, never harder.
  const fromRegistry = (hive) => {
    const r = spawnSync("reg", ["query", hive, "/v", "Path"], { encoding: "utf8" });
    if (r.status !== 0 || !r.stdout) return "";
    const m = /Path\s+REG_(?:EXPAND_)?SZ\s+(.*)/i.exec(r.stdout);
    return m ? m[1].trim() : "";
  };
  const machine = fromRegistry("HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment");
  const user = fromRegistry("HKCU\\Environment");
  const npm = process.env.APPDATA ? join(process.env.APPDATA, "npm") : "";
  process.env.PATH = [machine, user, npm, process.env.PATH || ""].filter(Boolean).join(";");
}

// Detection mirrors the installers: profiles.ini's install section first, then the
// Default flag; the application directory from the platform's usual places.
function detectProfileDir() {
  // Linux carries the same correction as install.sh: a real Zen tarball install
  // creates ~/.config/zen/profiles.ini and no ~/.zen. Existence decides. The
  // flatpak paths come from install.sh and are probed after the two install.ps1
  // knows about, so a machine both scripts agree on resolves identically.
  const home = process.env.HOME || process.env.USERPROFILE || "";
  const roots = onWindows
    ? [join(process.env.APPDATA || "", "zen")]
    : onMacOS
      ? [join(home, "Library/Application Support/zen")]
      : [
          join(home, ".config/zen"),
          join(home, ".zen"),
          join(home, ".var/app/app.zen_browser.zen/.config/zen"),
          join(home, ".var/app/app.zen_browser.zen/.zen"),
          join(home, ".var/app/io.github.zen_browser.zen/.config/zen"),
          join(home, ".var/app/io.github.zen_browser.zen/.zen"),
        ];
  const profileRoot = roots.find((r) => r && existsSync(join(r, "profiles.ini")));
  if (!profileRoot) return "";

  const sections = new Map();
  let current = null;
  for (const line of readText(join(profileRoot, "profiles.ini")).split(/\r?\n/)) {
    const s = /^\[(.+)\]$/.exec(line);
    const kv = /^([^=]+)=(.*)$/.exec(line);
    if (s) {
      current = s[1];
      sections.set(current, new Map());
    } else if (current && kv) {
      sections.get(current).set(kv[1], kv[2]);
    }
  }

  let path = "";
  for (const [name, keys] of sections) {
    if (name.startsWith("Install") && keys.get("Default")) {
      path = keys.get("Default");
      break;
    }
  }
  if (!path) {
    for (const [name, keys] of sections) {
      if (name.startsWith("Profile") && keys.get("Default") === "1") {
        path = keys.get("Path") || "";
        break;
      }
    }
  }
  if (!path) return "";
  return isAbsolute(path) ? path : join(profileRoot, path);
}

function detectZenDir() {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  if (onWindows) {
    const candidates = [
      join(process.env.ProgramFiles || "", "Zen Browser"),
      join(process.env["ProgramFiles(x86)"] || "", "Zen Browser"),
      join(process.env.LOCALAPPDATA || "", "Programs", "Zen Browser"),
      join(process.env.LOCALAPPDATA || "", "Zen Browser"),
    ];
    return candidates.find((c) => c && existsSync(join(c, "zen.exe"))) || "";
  }
  if (onMacOS) {
    const bundles = [
      "/Applications/Zen.app",
      "/Applications/Zen Browser.app",
      join(home, "Applications/Zen.app"),
      join(home, "Applications/Zen Browser.app"),
    ];
    const found = bundles.find((b) => existsSync(join(b, "Contents/Resources")));
    return found ? join(found, "Contents/Resources") : "";
  }
  // Linux: the four install.ps1 probes first, then the extra layouts install.sh
  // knows about. Appending keeps the first match identical where both agree.
  const dirs = [
    "/opt/zen",
    "/opt/zen-browser",
    "/usr/lib/zen",
    "/usr/lib/zen-browser",
    "/usr/lib64/zen",
    "/usr/lib64/zen-browser",
    "/usr/share/zen",
    "/usr/share/zen-browser",
    join(home, ".local/share/zen"),
    join(home, ".local/share/zen-browser"),
  ];
  return dirs.find((d) => existsSync(join(d, "zen")) || existsSync(join(d, "zen-bin"))) || "";
}

if (!profileDir) profileDir = detectProfileDir();
if (!zenDir) zenDir = detectZenDir();

// ---------------------------------------------------------------------------
section("OpenSpec");

const openspecCmd = which("openspec");
if (openspecCmd && which("node")) {
  // The path which() resolved is what gets run, never the bare name: on Windows the
  // only launcher on disk is openspec.cmd, which spawnSync cannot find by name.
  const specs = run(openspecCmd, ["validate", "--specs", "--strict"]);
  if (!launchFailed(specs, "the openspec CLI")) check(like(specs.out, "0 failed"), "specs validated in strict mode");

  // `--archived` exists only in some CLI versions; `--all` is the widest this
  // one offers, and an unknown-option error must read as a failure, never as a
  // pass.
  const everything = run(openspecCmd, ["validate", "--all"]);
  if (!launchFailed(everything, "the openspec CLI")) {
    check(like(everything.out, "0 failed"), "active changes and specs validate");
  }

  const active = run(openspecCmd, ["list"]);
  if (!active.error && !like(active.out, "No active changes")) {
    warnings.push("there are active changes - check whether they should be archived");
  }
} else {
  // A missing tool must not degrade into a green stamp: with these skipped, an
  // "EVERYTHING IN SYNC" would be claiming things nothing checked.
  check(false, "openspec CLI and node are required; spec validation could not run");
}

// ---------------------------------------------------------------------------
section("Open changes merge truthfully");

// The cross-machine audit found deltas that could not merge: a MODIFIED (or
// REMOVED) requirement in an open change must exist, by exact name, in the main
// spec it claims to change - otherwise the archive step silently merges nothing.
//
// `archive` is matched against the REPOSITORY-RELATIVE path, never the absolute one:
// a checkout under any directory whose name contains "archive" would otherwise
// exclude every open delta, leave nothing to cross-check, and stamp the section
// green over zero work - the one thing this section exists to prevent.
const openDeltas = walkFiles(join(root, "openspec/changes"), { optional: true }).filter(
  (f) =>
    basename(f) === "spec.md" &&
    !/archive/i.test(f.substring(root.length)) &&
    basename(dirname(dirname(f))) === "specs",
);
let deltaChecks = 0;
for (const delta of openDeltas) {
  const cap = basename(dirname(delta));
  const mainText = readText(join(root, "openspec/specs", cap, "spec.md"));
  const deltaText = readText(delta);
  for (const kind of ["MODIFIED", "REMOVED"]) {
    const body = group1(deltaText, "## " + kind + " Requirements([\\s\\S]*?)(?=\\n## |$)", "");
    if (!body) continue;
    for (const raw of allGroup1(body, "### Requirement: (.+)", "g")) {
      const name = raw.trim();
      deltaChecks++;
      check(
        mainText.includes("### Requirement: " + name),
        "open delta " + cap + ": " + kind + " '" + name + "' exists in the main spec",
      );
    }
  }
}
if (deltaChecks === 0) check(true, "no open MODIFIED/REMOVED deltas to cross-check");

// Two release tags once pointed at a later release's commit: every local tag
// must point at a commit whose script carries that tag's own version.
const gitCmd = which("git");
if (gitCmd) {
  // git being installed is not git having answered: outside a repository `git tag`
  // exits 128 with nothing on stdout, and an empty tag list would otherwise pass
  // this check having read no tag at all.
  const tagList = run(gitCmd, ["tag", "--list", "v*"]);
  if (!launchFailed(tagList, "git") && tagList.code !== 0) {
    check(false, "git could not list the release tags; the tag check did not run");
    detail(tagList.out.trim().split(/\r?\n/)[0] || "");
  } else if (!tagList.error) {
    const badTags = [];
    const tags = tagList.stdout.split(/\r?\n/).filter(Boolean);
    let versionsRead = 0;
    for (const tag of tags) {
      const blob = run(gitCmd, ["cat-file", "-p", tag + ":src/zen-space-tab-groups.uc.mjs"]).stdout;
      const tv = group1(blob, 'const VERSION = "([^"]+)"', "");
      if (!tv) continue;
      versionsRead++;
      if (tv !== tag.replace(/^v+/, "")) badTags.push(tag + "->" + tv);
    }
    if (tags.length > 0 && versionsRead === 0) {
      // Same rule one line lower: tags that exist and yield no version mean the
      // objects could not be read, not that every tag is sound.
      check(false, "no version could be read from any of the " + tags.length + " release tags");
    } else {
      check(
        badTags.length === 0,
        "every local tag's commit carries its own version" + (badTags.length ? " (" + badTags.join(", ") + ")" : ""),
      );
    }
  }
} else {
  // Same rule as the other tools: what did not run cannot be reported as sound.
  check(false, "git is required; the release tag check could not run");
}

// ---------------------------------------------------------------------------
section("Requirements with an implementation");

// Every requirement in the spec needs an identifiable anchor in the code. The anchor
// proves the mechanism exists; whether it is correct is ZSTG.selfTest()'s business.
const anchors = [
  ["configuration/applies live", "Services.prefs.addObserver"],
  ["configuration/prefs declared", "getDefaultBranch"],
  ["configuration/master switch", "force = false"],
  ["configuration/diagnostic log", "IOUtils.writeUTF8"],
  ["configuration/tolerates invalid input", "function parseRules"],
  ["configuration/interface language", "function chooseLanguage"],
  ["configuration/first run seeds", "function seedRecommendedDefaults"],
  ["favicon-colors/extraction", "getImageData"],
  ["favicon-colors/classification by hue", "function colorName"],
  ["favicon-colors/does not block", "function applyFaviconColor"],
  ["favicon-colors/applies when the icon arrives", "function onTabAttrModified"],
  ["favicon-colors/manual precedence", "function recordManualColor"],
  ["group-presentation/label from the key", "label: info.label"],
  ["group-presentation/labels capitalized", "capLabel"],
  ["group-presentation/identity by attribute", "KEY_ATTR"],
  ["group-presentation/collapse hides tabs", "max-height: 0"],
  ["group-presentation/motion presets", "zstg-motion"],
  ["group-presentation/measured animation cap", "--zstg-row-cap"],
  ["group-presentation/panel motion preview", "playMotionPreview"],
  ["group-presentation/motion speed setting", "--zstg-motion-scale"],
  ["group-presentation/motion distinct both ways", "nth-last-child"],
  ["group-presentation/fold window and sheet", "--zstg-sheet"],
  ["group-presentation/reduced motion wins", "prefers-reduced-motion"],
  ["group-presentation/focus close delay", "focusDelay"],
  ["group-presentation/focus on the N recent", "recentGroups"],
  ["group-presentation/focus strategy choice", "focusStrategy"],
  ["group-presentation/idle groups retire", "sweepIdleGroups"],
  ["group-presentation/active groups on top", "resettleGroupOrder"],
  ["group-visuals/count", "COUNT_ATTR"],
  ["group-visuals/count displayed", "attr\\(zstg-hidden-count\\)"],
  ["group-visuals/collapsed dimmed", "collapsed\\] \\.tab-group-label"],
  ["grouping-commands/scoped to current Space", "function currentSpace"],
  ["grouping-commands/regroup", "function regroup"],
  ["grouping-commands/ungroup", "function ungroup"],
  ["grouping-commands/rename", "function renameGroup"],
  ["grouping-commands/collapse and expand", "function setCollapsed"],
  ["space-isolation/Space comes from the tab", "function spaceOfTab"],
  ["space-isolation/eligibility", "function isEligible"],
  ["space-isolation/group by Space and key", "function findGroup"],
  ["space-scoped-tab-switch/filter", "allUsedBrowsers"],
  ["space-scoped-tab-switch/essentials", "essential && !tabSpace"],
  ["space-scoped-tab-switch/can be turned off", "spaceScopedTabSwitch"],
  ["space-scoped-tab-switch/failure delegates", "delegating to native"],
  ["tab-grouping/key by domain", "getBaseDomainFromHost"],
  ["tab-grouping/subdomain", "groupBySubdomain"],
  ["tab-grouping/custom rules", "rule:\\$\\{rule.name\\}"],
  ["tab-grouping/minimum tabs", "candidates.length < cfg\\(\\).minTabs"],
  ["tab-grouping/non-groupable URLs", "GROUPABLE_SCHEMES"],
  ["tab-grouping/exclusion list", "c.excluded"],
  ["tab-grouping/re-evaluation on navigation", "onLocationChange"],
  ["tab-grouping/leaves the old group", "leftPreviousGroup"],
  ["tab-grouping/reclaim after restart", "function reclaimGroups"],
  ["tab-grouping/recover unmarked groups", "function recoverOldGroups"],
  ["tab-grouping/persisted link", "function saveGroupMap"],
  ["tab-grouping/empty groups", "function removeEmptyGroups"],
  ["control-panel/registers about:", "nsIAboutModule"],
  ["control-panel/page is local only", "chrome://userchrome/content/"],
  ["diagnostics/version identifiable", "const VERSION = "],
  ["diagnostics/version shown in the panel", "ZSTG\\?\\.version"],
  ["diagnostics/self-test", "function selfTest"],
  ["diagnostics/self-test checks real state", "Invariants against the real state"],
  ["diagnostics/inspection", "function inspect"],
  ["diagnostics/stable command surface", "window\\.ZSTG = "],
  ["grouping-commands/context menus", "MENU_POPUPS"],
  ["grouping-commands/keyboard shortcuts", "function registerHotkeys"],
  ["grouping-commands/outcome as a sentence", "function sentence"],
  ["grouping-commands/confirm before ungroup", "cmd.confirmUngroup"],
  ["configuration/log is bounded", "LOG_MAX_BYTES"],
  ["configuration/log off by default", "debugLog: false"],
  ["favicon-colors/snapped to the palette", "function colorName"],
  ["favicon-colors/classified by hue", "function rgbToHsl"],
  ["diagnostics/staleness compared at startup", "async function checkStaleness"],
  ["diagnostics/staleness recorded either way", 'dbg\\("stalenessCheck"'],
  ["diagnostics/staleness exposed to the panel", "get staleness\\(\\)"],
  ["control-panel/stale banner", "stale\\.title"],
  ["control-panel/update announced as banner", "function updateBanner"],
  ["control-panel/one banner shape", "function makeBanner"],
  ["control-panel/banner precedence", "function renderBanners"],
  ["control-panel/notes on request", "update\\.notesShow"],
  ["control-panel/manual check when auto is off", "manualRow\\.hidden = autoCheck"],
  ["self-update/check on panel open", "runUpdateCheck\\(false\\)"],
  ["diagnostics/restart offered from the report", "function restartToApply"],
  ["diagnostics/restart is not destructive", "Deliberately NOT resetAndRestart"],
  ["control-panel/not-loaded is its own message", "notLoaded"],
  ["installation/check notices stale code", "Get-StaleState|stale_state"],
  ["languages/single catalog", "export const CATALOG"],
  ["languages/base language fallback", "BASE_LANGUAGE"],
  ["languages/missing key is recorded", "missingText"],
  ["tab-grouping/binding map pruned in-session", "prune: true \\}\\)\\), 60000"],
  ["tab-grouping/system group for internal pages", "SYSTEM_SCHEMES"],
  ["tab-grouping/loose tabs settle below groups", "function settleLooseTabs"],
  ["group-presentation/never left nested", "function fixNestedGroups"],
  ["tab-grouping/unloaded tabs group from session", "getLazyTabValue"],
  ["tab-grouping/space organized on first visit", "function organizeSpaceOnce"],
  ["installation/profile from profiles.ini", "profiles\\.ini"],
  ["installation/loader separate from mod", "Loader \\(deleted by every Zen update\\)"],
  ["installation/guard offered, never imposed", "--guard\\) GUARD=1"],
  ["loader-guard/self-disarm", "remove_all"],
  ["loader-guard/never elevates", "indistinguishable from malware"],
  ["loader-guard/restore from cache", "loader-cache/config.js"],
  ["loader-guard/removal invokable", '"--remove"'],
  ["self-update/release not branch", "releases\\?per_page"],
  ["self-update/update announces itself", "showUpdatePill"],
  ["self-update/background check gated", "backgroundUpdateCheck"],
  ["self-update/check tells what changed", "update.notes"],
  ["self-update/alert dismissible", "updatePillDismissed"],
  ["self-update/all-or-nothing staging", "spacekeeper-staging"],
  ["self-update/loader reported not applied", "loaderChanged"],
  ["control-panel/one-click uninstall", "uninstallSelf"],
  ["control-panel/clean handover reset", "resetAndRestart"],
  ["diagnostics/contract canary", "function checkZenContract"],
  ["configuration/log records hosts only", "function hostOnly"],
  ["configuration/log recovers on toggle", "logUnavailable = false"],
  ["control-panel/pending edit flushed", "pagehide"],
  // Call-site anchors: a defined function whose call was deleted from start()
  // passes every definition anchor and ships a mod that silently does less.
  ["startup/menu wired", "createMenu\\(\\);"],
  ["startup/hotkeys wired", "registerHotkeys\\(\\);"],
  ["startup/space-scoped switch wired", "installSpaceScopedSwitch\\(\\);"],
  ["startup/panel wired", "registerPanel\\(\\);"],
  ["startup/contract canary wired", "checkZenContract\\(\\);"],
];

const js = readText(join(root, "src/zen-space-tab-groups.uc.mjs"));
const css = readText(join(root, "src/zen-space-tab-groups.uc.css"));
const coreSrc = readText(join(root, "src/resources/zstg-core.mjs"));
const guardSrc = readText(join(root, "src/guard/guard.sh")) + readText(join(root, "src/guard/guard.ps1"));
const installerSrc = readText(join(root, "install.sh")) + readText(join(root, "install.ps1"));
const panel = readText(join(root, "src/resources/zstg-panel.html")) + readText(join(root, "src/resources/zstg-i18n.mjs"));
const blobs = [js, css, panel, coreSrc, guardSrc, installerSrc];

const missingAnchors = anchors
  .filter(([, pattern]) => !blobs.some((blob) => like(blob, pattern)))
  .map(([name]) => name);
check(missingAnchors.length === 0, anchors.length + " requirements anchored in the code");
for (const n of missingAnchors) detail("no anchor: " + n);

// A capability with no anchor at all means a whole spec area nothing is proving.
const capabilities = listDir(join(root, "openspec/specs"), "dirs");
const unanchored = capabilities.filter(
  (cap) => !anchors.some(([name]) => name.toLowerCase().startsWith(cap.toLowerCase() + "/")),
);
check(unanchored.length === 0, "every capability has at least one anchor (" + capabilities.length + " capabilities)");
for (const c of unanchored) detail("no anchors: " + c);

// ---------------------------------------------------------------------------
section("Documentation");

// The block is extracted by name. If the extraction comes back empty the loop below
// has nothing to compare and every check passes without checking anything - which is
// exactly what happened when `PADROES` was renamed to `DEFAULTS`. Hence the guard.
const defaultsBlock = group1(js, "const DEFAULTS = \\{(.+?)\\n\\};", "s");
check(defaultsBlock.length > 0, "the defaults block was found in the script");

const prefs = allGroup1(defaultsBlock, "^\\s{2}(\\w+):", "gm");
check(prefs.length >= 10, prefs.length + " prefs read from the script");

// The version is the one thing a user is asked for when reporting a problem. It used
// to be four separate literals, and inspect() drifted to reporting 0.2.0 while the
// script was 0.16.0 - the number was wrong in exactly the place it mattered most.
const vHeader = group1(js, "@version\\s+(\\S+)", "");
const vConst = group1(js, 'const VERSION = "([^"]+)"', "");
check(vConst.length > 0, "the version constant was found in the script");
check(vHeader === vConst, "the header version matches the constant (" + vHeader + " / " + vConst + ")");
const vLiterals = countMatches(js, 'version: "[^"]+"', "g");
check(vLiterals === 0, "the version is not duplicated as a literal (" + vLiterals + " found)");

// A release cannot ship silent: the changelog must carry an entry for the
// version being shipped, and the GitHub release notes are that entry.
const changelog = readText(join(root, "CHANGELOG.md"));
check(like(changelog, escapeRegExp("## " + vConst)), "CHANGELOG.md has an entry for " + vConst);

const readme = readText(join(root, "README.md"));
// The user-facing docs are two layers: the README is the light pitch, the manual
// carries the technical weight. Content promises may live in either, so the
// content checks scan both; structure-specific checks name their file.
const manual = readText(join(root, "docs/MANUAL.md"));
const docsAll = readme + "\n" + manual;

// The docs teach people to look for "[ZSTG] x.y.z ready"; that literal escaped
// the version check once and drifted a full release behind.
const vReadme = group1(docsAll, "\\[ZSTG\\] (\\d+\\.\\d+\\.\\d+)", "");
check(vReadme === vConst, "the docs ready-line version matches the script (" + vReadme + " / " + vConst + ")");

const undocumented = prefs.filter((p) => !like(docsAll, escapeRegExp("zen.stg." + p)));
check(undocumented.length === 0, prefs.length + " prefs documented in the docs");
for (const p of undocumented) detail("not documented: zen.stg." + p);

const nonexistent = sortUnique(allGroup1(docsAll, "zen\\.stg\\.(\\w+)", "g")).filter((p) => !containsCI(prefs, p));
check(nonexistent.length === 0, "the docs cite no pref that does not exist");
for (const p of nonexistent) detail("cited but absent from the code: zen.stg." + p);

// The public API is what the README teaches people to type in the console. A rename
// that the README does not follow turns the documentation into a list of errors.
const api = group1(js, "window\\.ZSTG = \\{(.+?)\\n\\s*\\};", "s");
check(api.length > 0, "the public API object was found in the script");
const exposed = allGroup1(api, "^\\s+(\\w+)", "gm");
const cited = sortUnique(allGroup1(docsAll, "ZSTG\\.(\\w+)", "g"));
const broken = cited.filter((c) => !containsCI(exposed, c));
check(broken.length === 0, "the docs cite only functions that exist (" + exposed.length + " exposed)");
for (const m of broken) detail("cited but absent from the API: ZSTG." + m);

// The Structure block in the README and the file map in CLAUDE.md are where a
// reader is told what exists. Both drift the same way: a file is added or renamed
// and the maps keep describing the old repository - install.sh was missing from
// both for a while. Cited paths must exist, and every top-level path must be in
// each map; README.md, CLAUDE.md, LICENSE and NOTICE describe themselves.
function mapEntries(text, header) {
  const block = group1(text, escapeRegExp(header) + "[\\s\\S]*?```\\n([\\s\\S]+?)```", "");
  return block
    .split("\n")
    .filter((line) => /^\S/.test(line))
    .map((line) => line.split(/\s+/)[0])
    .filter(Boolean);
}

const claudeMd = readText(join(root, "CLAUDE.md"));
const maps = [
  ["the MANUAL Structure map", mapEntries(manual, "## Structure")],
  ["the CLAUDE.md file map", mapEntries(claudeMd, "## Where things live")],
];
const selfDescribing = ["README.md", "CLAUDE.md", "LICENSE", "NOTICE"];
// On disk but not part of the repository the maps describe (gitignored artifacts).
const notRepo = ["node_modules"];
const topLevel = listDir(root, "any").filter(
  (name) => !name.startsWith(".") && !selfDescribing.includes(name) && !notRepo.includes(name),
);

for (const [mapName, entries] of maps) {
  check(entries.length > 0, mapName + " was found (" + entries.length + " entries)");

  const gone = entries.filter((e) => !pathExists(e));
  check(gone.length === 0, mapName + " cites only paths that exist");
  for (const g of gone) detail("cited but absent: " + g);

  const uncovered = topLevel.filter((name) => {
    const n = name.toLowerCase();
    return !entries.some((e) => {
      const x = e.toLowerCase();
      return x === n || x === n + "/" || x.startsWith(n + "/");
    });
  });
  check(uncovered.length === 0, mapName + " covers every top-level path");
  for (const u of uncovered) detail("not in the map: " + u);
}

// ---------------------------------------------------------------------------
section("Installers");

// Two installers for the same product drift: a file added to one and forgotten in
// the other produces an install that is silently incomplete on that platform only.
// Comparing the lists is the whole reason this check exists.
const ps1 = readText(join(root, "install.ps1"));
const sh = readText(join(root, "install.sh"));

const psFiles = allGroup1(ps1, 'From = "([^"]+)"', "g");
const shFiles = allGroup1(sh, '(src/[^:"]+|vendor/[^:"]+):', "g");

check(psFiles.length > 0, "install.ps1 declares a file list (" + psFiles.length + " entries)");
check(shFiles.length > 0, "install.sh declares a file list (" + shFiles.length + " entries)");

const onlyPs = psFiles.filter((f) => !containsCI(shFiles, f));
const onlySh = shFiles.filter((f) => !containsCI(psFiles, f));
check(onlyPs.length === 0 && onlySh.length === 0, "both installers deploy the same files");
for (const f of onlyPs) detail("only in install.ps1: " + f);
for (const f of onlySh) detail("only in install.sh:  " + f);

// The staleness warning is the same three lines in both installers. It is the
// sentence a user reads once, at the moment the mod appears not to have updated,
// so the two platforms must not describe the same condition differently.
const staleLines = [
  "Zen has been running since before these files were installed,",
  "so it is still executing the previous version.",
  "Close Zen, clear the startup cache in about:support, and open it again.",
];
const staleMismatch = [];
for (const line of staleLines) {
  if (!ps1.includes(line)) staleMismatch.push("install.ps1: " + line);
  if (!sh.includes(line)) staleMismatch.push("install.sh: " + line);
}
check(staleMismatch.length === 0, "staleness wording matches between the installers");
for (const m of staleMismatch) detail("missing - " + m);

// Both must write the marker and both must remove it, or one platform silently
// loses the check and the other keeps a file nothing reads.
check(like(ps1, "Write-InstallMarker") && like(sh, "write_install_marker"), "both installers write the install marker");
check(
  like(ps1, "Remove-Item \\$marker") && like(sh, 'rm -f "\\$\\(install_marker\\)"'),
  "both installers remove the marker on uninstall",
);

// The loader's profile-side utilities are listed by name in install.sh because
// raw.githubusercontent serves files, not directories. A file added to the vendored
// loader and not to that list yields a loader that half-loads.
const vendorUtils = listDir(join(root, "vendor/fx-autoconfig/profile/chrome/utils"), "files");
const listedUtils = group1(sh, 'UTILS="([^"]+)"', "")
  .split(/\s+/)
  .filter(Boolean);
const missingUtils = vendorUtils.filter((u) => !containsCI(listedUtils, u));
check(missingUtils.length === 0, "install.sh lists every vendored loader utility (" + vendorUtils.length + ")");
for (const u of missingUtils) detail("not listed: " + u);

// The offered restart exists in both installers, with the same wording and the
// same bounded wait. A user reading instructions written for one platform must
// find the other behaving identically.
check(like(ps1, "\\[switch\\]\\$Restart") && like(sh, "--restart\\)"), "both installers declare the restart option");

const restartWording = [
  "Restart Zen now? It will close, the startup cache will be cleared, and it will reopen.",
  "Zen is not running. Clear the startup cache and launch it now?",
  "did not close within",
  "skipping the cache clearing",
  "Zen was restarted and the startup cache cleared.",
  "Done, but Zen is still open and nothing was deleted.",
];
const notShared = restartWording.filter((w) => !(like(ps1, escapeRegExp(w)) && like(sh, escapeRegExp(w))));
check(notShared.length === 0, "restart wording matches between the installers");
for (const s of notShared) detail("differs: " + s);

const waitSh = group1(sh, "^RESTART_WAIT=(\\d+)", "m");
const waitPs = group1(ps1, "\\$RestartWaitSeconds = (\\d+)", "");
check(Boolean(waitSh) && waitSh === waitPs, "the bounded wait is the same in both installers (" + waitSh + " / " + waitPs + ")");

// Every option an installer accepts is in the README, and the README teaches no
// option that does not exist. --help is left out of the extraction on purpose,
// and the --zstg-* CSS variables in the appearance table are excluded by their
// prefix. Case-sensitive on the PowerShell side: --check must not satisfy -Check.
const shOptions = sortUnique(allGroup1(sh, "^\\s+(--[a-z-]+)\\)", "gm"));
const psOptions = sortUnique(allGroup1(ps1, "\\[(?:switch|string)\\]\\$(\\w+)", "g")).filter(
  // Internal plumbing set by the self-elevation relaunch, deliberately absent
  // from the README: documenting it would invite people to pass it.
  (o) => o !== "ElevatedChild",
);
check(shOptions.length > 0, "install.sh declares options (" + shOptions.length + ")");
check(psOptions.length > 0, "install.ps1 declares options (" + psOptions.length + ")");

const undocumentedOpts = [
  ...shOptions.filter((o) => !like(docsAll, escapeRegExp(o))),
  ...psOptions.filter((o) => !new RegExp("(?<![\\w-])-" + o + "\\b").test(docsAll)).map((o) => "-" + o),
];
check(undocumentedOpts.length === 0, "every installer option is documented in the docs");
for (const o of undocumentedOpts) detail("not documented: " + o);

const readmeShOpts = sortUnique(allGroup1(docsAll, "(?<![\\w-])(--[a-z][a-z-]*)", "g")).filter(
  (o) => !o.toLowerCase().startsWith("--zstg-"),
);
const readmePsOpts = sortUnique(allGroup1(docsAll, "(?<![\\w-])-([A-Z]\\w+)", "g"));
const phantomOpts = [
  ...readmeShOpts.filter((o) => !containsCI(shOptions, o)),
  ...readmePsOpts.filter((o) => !containsCI(psOptions, o)).map((o) => "-" + o),
];
check(phantomOpts.length === 0, "the docs cite no installer option that does not exist");
for (const o of phantomOpts) detail("cited but absent: " + o);

// The two guard scripts must tell the user the same things, the same way the two
// installers must.
const guardSh = readText(join(root, "src/guard/guard.sh"));
const guardPs = readText(join(root, "src/guard/guard.ps1"));
const guardWording = [
  "A Zen update removed the Spacekeeper loader. Re-run the installer to restore it.",
  "Restored from the copy of",
  "Zen is not where it was installed.",
  "never outlives its reason to exist",
];
const guardNotShared = guardWording.filter((w) => !(like(guardSh, escapeRegExp(w)) && like(guardPs, escapeRegExp(w))));
check(guardNotShared.length === 0, "guard wording matches between the two scripts");
for (const s of guardNotShared) detail("differs: " + s);

// The panel updates the same files the installers deploy; a file added to one and
// forgotten in the other yields updates that silently skip part of the install.
const updateDests = sortUnique(allGroup1(js, '"(chrome/[^"]+)"\\]', "g"));
const shDests = sortUnique(allGroup1(sh, ':(chrome/[^"\\s]+?)"?$', "gm"));
const onlyUpdate = updateDests.filter((d) => !containsCI(shDests, d));
const onlyShDest = shDests.filter((d) => !containsCI(updateDests, d));
const destsDiffer = onlyUpdate.length > 0 || onlyShDest.length > 0;
check(
  !destsDiffer && updateDests.length > 0,
  "the panel updater and the installers deploy the same files (" + updateDests.length + ")",
);
for (const d of onlyShDest) detail("=> " + d);
for (const d of onlyUpdate) detail("<= " + d);

// ---------------------------------------------------------------------------
section("Interface texts");

// Three catalogs edited by hand drift apart silently: a key added to one language
// only shows up as a raw key on screen, and only in that language.
const i18nPath = join(root, "src/resources/zstg-i18n.mjs");
if (existsSync(i18nPath) && which("node")) {
  // pathToFileURL, never a hand-built string: a path with a space or a drive
  // letter has to be encoded, and node then imports the wrong specifier.
  const uri = pathToFileURL(resolve(i18nPath)).href;
  const code = [
    "import { LANGUAGES, BASE_LANGUAGE, CATALOG } from '" + uri + "';",
    "const base = Object.keys(CATALOG[BASE_LANGUAGE]);",
    "const bad = [];",
    "for (const l of LANGUAGES) {",
    "  const missing = base.filter(k => !(k in CATALOG[l]));",
    "  const extra = Object.keys(CATALOG[l]).filter(k => !base.includes(k));",
    "  if (missing.length || extra.length) bad.push(l + ': ' + [...missing.map(k => '-' + k), ...extra.map(k => '+' + k)].join(' '));",
    "}",
    "console.log(base.length + '|' + LANGUAGES.length + '|' + bad.join(' ; '));",
  ].join("\n");
  const out = run(process.execPath, ["--input-type=module", "-e", code]).out;
  const parts = out.trim().split("|");
  if (parts.length === 3) {
    check(parts[2].trim().length === 0, parts[0] + " texts present in all " + parts[1] + " languages");
    if (parts[2].trim()) detail(parts[2].trim());
  } else {
    check(false, "could not read the text catalog: " + out.trim());
  }
} else {
  check(false, "node is required; the language parity check could not run");
}

// ---------------------------------------------------------------------------
section("Distinct causes, distinct messages");

// "Not connected to the browser window" once covered two unrelated conditions, and
// the shared sentence is what sent a version-mismatch diagnosis after browsing
// contexts for half an hour. Neither condition can be produced on demand, so this is
// the check that keeps them apart - the screen cannot be the test here.
if (existsSync(i18nPath) && which("node")) {
  const uri = pathToFileURL(resolve(i18nPath)).href;
  const code = [
    "import { LANGUAGES, CATALOG } from '" + uri + "';",
    "const bad = [];",
    "for (const l of LANGUAGES) {",
    "  const a = CATALOG[l]['noWindow'];",
    "  const b = CATALOG[l]['notLoaded'];",
    "  if (!a || !b) bad.push(l + ': missing');",
    "  else if (a.trim() === b.trim()) bad.push(l + ': identical');",
    "}",
    "console.log(bad.length ? bad.join(' ; ') : 'ok');",
  ].join("\n");
  const out = run(process.execPath, ["--input-type=module", "-e", code]).out.trim();
  check(out === "ok", "the two unreachable-mod messages are distinct in every language");
  if (out !== "ok") detail(out);
} else {
  warnings.push("text catalog or Node not found; skipping the distinct-message check");
}

// ---------------------------------------------------------------------------
section("Language of the source");

// The project publishes its code and specification in English. A file that goes back
// to Portuguese is caught here and not in review.
const literalSources = [
  "src/zen-space-tab-groups.uc.mjs",
  "src/zen-space-tab-groups.uc.css",
  "src/resources/zstg-panel.html",
  "install.ps1",
  "install.sh",
  "scripts/verify.mjs",
  "README.md",
  "docs/MANUAL.md",
];
const sources = literalSources.concat(
  walkFiles(join(root, "openspec/specs"))
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.substring(root.length + 1)),
);

// Accents alone are not enough: unaccented Portuguese sailed through this check
// for a whole release ("restaurado(s) reconhecido(s)" in the console, "painel" in
// a factory name). The token list is deliberately short and unambiguous - every
// word on it is Portuguese-only, so a hit is never a false alarm on English prose.
// Both patterns are written with escapes so that this file does not match itself
// on the accent pass.
const accentPattern = "[\\u00e3\\u00e7\\u00f5\\u00ea\\u00f4\\u00e2\\u00ed\\u00fa]";
const ptTokens = "\\b(painel|restaurado|reconhecido|reconhecidos|depois|trocou|mudou|usuario|configuracao)\\b";
// This file skips the token pass alone - it carries the token list, which would
// match itself. The catalog is left out of the list: it holds the translations.
const tokenPassExempt = ["scripts/verify.mjs"];

const withPortuguese = [];
for (const s of sources) {
  const p = join(root, s);
  if (!existsSync(p)) continue;
  const lines = readText(p).split(/\r?\n/);
  let hit = lines.findIndex((line) => new RegExp(accentPattern, "i").test(line));
  if (hit === -1 && !tokenPassExempt.includes(s)) {
    hit = lines.findIndex((line) => new RegExp(ptTokens, "i").test(line));
  }
  if (hit !== -1) withPortuguese.push(s + " (line " + (hit + 1) + ")");
}
check(withPortuguese.length === 0, sources.length + " source files in English");
for (const s of withPortuguese) detail("Portuguese found: " + s);

// ---------------------------------------------------------------------------
section("Parity with the pre-commit hook");

// The Portuguese token list lives in two places: this script and the hook that
// runs on every commit. Two copies of one list drift exactly the way the twins
// this script polices drift - the installers, the guard scripts, the panel
// updater - so they are compared directly, and a word added to or dropped from
// one copy cannot hide.
//
// The hook folds a singular/plural pair into one alternative with an optional
// final letter (`...s?`), so its list is compared as the SET OF WORDS the
// pattern matches rather than as a string: an equivalent spelling must not
// raise a false alarm. No token is spelled out in this comment, so that this
// file being one of the hook's own sources cannot make it flag itself.
function tokenWords(pattern) {
  const inner = group1(pattern, "\\\\b\\((.+?)\\)\\\\b", "");
  const expand = (token) => {
    const m = /^(.*?)(.)\?(.*)$/.exec(token);
    return m ? [...expand(m[1] + m[3]), ...expand(m[1] + m[2] + m[3])] : [token];
  };
  const out = [];
  for (const alt of inner.split("|")) if (alt) out.push(...expand(alt));
  return sortUnique(out);
}

const hookText = readText(join(root, "scripts/hooks/pre-commit"));
const hookPtTokens = group1(hookText, "grep -niE '([^']+)'", "");
const myWords = tokenWords(ptTokens);
const tokenDrift = [];
if (myWords.length === 0) tokenDrift.push("no words could be read from this script's own token list");
if (!hookPtTokens) tokenDrift.push("no token list could be read from scripts/hooks/pre-commit");
else {
  const hookWords = tokenWords(hookPtTokens);
  if (hookWords.length === 0) tokenDrift.push("no words could be read from the pre-commit hook's token list");
  for (const w of myWords) if (!containsCI(hookWords, w)) tokenDrift.push("not in the pre-commit hook: " + w);
  for (const w of hookWords) if (!containsCI(myWords, w)) tokenDrift.push("only in the pre-commit hook: " + w);
}
check(
  tokenDrift.length === 0,
  "the Portuguese token list matches the pre-commit hook (" + myWords.length + " words)",
);
for (const d of tokenDrift) detail(d);

// ---------------------------------------------------------------------------
section("Syntax");

if (which("node")) {
  check(
    run(process.execPath, ["--check", join(root, "src/zen-space-tab-groups.uc.mjs")]).code === 0,
    "script has no syntax error",
  );
  check(run(process.execPath, ["--check", i18nPath]).code === 0, "text catalog has no syntax error");
} else {
  check(false, "node is required; the syntax check could not run");
}

// A typo'd identifier in privileged chrome code only surfaces after
// install + restart + cache clear; no-undef removes that loop. The binary comes
// from `npm install` in the repo (or a global eslint).
// npm writes two launchers side by side: an extensionless shell script for POSIX
// and a .cmd for Windows. Neither is an executable image, so the package's own JS
// entry point is preferred and run under this very Node - that path behaves the
// same on every platform. The launchers stay as the fallback, and run() sends a
// .cmd through the shell because spawnSync cannot execute one directly.
let eslint = join(root, "node_modules/eslint/bin/eslint.js");
let eslintArgs = ["--max-warnings", "0", root];
if (existsSync(eslint)) {
  eslintArgs = [eslint, ...eslintArgs];
  eslint = process.execPath;
} else {
  eslint = join(root, "node_modules/.bin/eslint" + (onWindows ? ".cmd" : ""));
  if (!existsSync(eslint)) eslint = which("eslint") || "";
}
if (eslint) {
  const lint = run(eslint, eslintArgs);
  if (!launchFailed(lint, "eslint")) check(lint.code === 0, "eslint finds nothing (no-undef, no-unused-vars)");
} else {
  check(false, "eslint is required; run npm install in the repo");
}

// ---------------------------------------------------------------------------
section("Core logic");

// The derivation cases from zstg-core.mjs, under plain node with the Public Suffix
// fixture. ZSTG.selfTest() runs the SAME list against the real Services.eTLD in the
// browser; here they run on every verify, with no browser anywhere near.
const corePath = join(root, "src/resources/zstg-core.mjs");
if (existsSync(corePath) && which("node")) {
  const coreUri = pathToFileURL(resolve(corePath)).href;
  const coreCode = [
    "import { keyFromParts, runDerivationTests, makeTestETLD } from '" + coreUri + "';",
    "const etld = makeTestETLD();",
    "const noRules = { rules: [], excluded: [], groupBySubdomain: false, subdomainDomains: [], subdomainLabel: 'host', systemGroup: false };",
    "const keyFromText = (url, over) => {",
    "  let u;",
    "  try { u = new URL(url); } catch { return null; }",
    "  const c = { ...noRules, ...over };",
    "  const path = u.pathname.replace(/^\\/*/, '') || u.hostname;",
    "  return keyFromParts(u.protocol.replace(':', ''), u.hostname, c, etld, path);",
    "};",
    "const cases = runDerivationTests(keyFromText);",
    "const failures = cases.filter(c => !c.ok);",
    "console.log(cases.length + '|' + failures.length + '|' + failures.map(f => f.name).join(' ; '));",
  ].join("\n");
  const coreOut = run(process.execPath, ["--input-type=module", "-e", coreCode]).out;
  const coreParts = coreOut.trim().split("|");
  if (coreParts.length === 3) {
    check(coreParts[1] === "0", coreParts[0] + " derivation cases pass under node");
    if (coreParts[1] !== "0") detail("failing: " + coreParts[2]);
  } else {
    check(false, "could not run the core tests: " + coreOut.trim());
  }
} else {
  check(false, "node is required; the core logic tests could not run");
}

// ---------------------------------------------------------------------------
section("Installation");

// Not detecting an installation on THIS machine says nothing about the repository:
// skip with a warning instead of failing checks a contributor cannot fix here.
if (!profileDir || !existsSync(profileDir)) {
  warnings.push("Zen profile not found on this machine; Installation section skipped");
} else {
  const destJs = join(profileDir, "chrome/JS/zen-space-tab-groups.uc.mjs");
  const destCss = join(profileDir, "chrome/CSS/zen-space-tab-groups.uc.css");

  if (existsSync(destJs)) {
    const vRepo = group1(js, "@version\\s+(\\S+)", "");
    const vProfile = group1(readText(destJs), "@version\\s+(\\S+)", "");
    check(vRepo === vProfile, "script in the profile at the repository version (" + vRepo + " / " + vProfile + ")");
  } else {
    check(false, "script not installed in the profile");
  }

  if (existsSync(destCss)) {
    const hRepo = sha256(join(root, "src/zen-space-tab-groups.uc.css"));
    check(hRepo === sha256(destCss), "stylesheet in the profile identical to the repository one");
  } else {
    check(false, "stylesheet not installed in the profile");
  }

  // Resources are copied, not linked: an edit in the repository does not reach the
  // profile until the installer runs again, and the panel keeps showing the old page.
  for (const res of listDir(join(root, "src/resources"), "files")) {
    const destRes = join(profileDir, "chrome/resources", res);
    if (existsSync(destRes)) {
      check(sha256(join(root, "src/resources", res)) === sha256(destRes), "resource in the profile up to date: " + res);
    } else {
      check(false, "resource not installed in the profile: " + res);
    }
  }

  check(existsSync(join(profileDir, "chrome/utils/boot.sys.mjs")), "loader: utils in the profile");

  // A Zen update deletes these two files; it is the most common failure in real use.
  if (!zenDir || !existsSync(zenDir)) {
    warnings.push("Zen application directory not found on this machine; loader checks skipped");
  } else {
    check(existsSync(join(zenDir, "config.js")), "loader: config.js present");
    check(existsSync(join(zenDir, "defaults/pref/config-prefs.js")), "loader: config-prefs.js present");
  }
}

// ---------------------------------------------------------------------------
console.log("");
for (const w of warnings) console.log("warning: " + w);

if (failures.length === 0) {
  console.log("EVERYTHING IN SYNC");
  console.log("Behavior is not verified here - run ZSTG.selfTest() in the console.");
  process.exit(0);
}

console.log(failures.length + " check(s) failed:");
for (const f of failures) console.log("  - " + f);
process.exit(1);
