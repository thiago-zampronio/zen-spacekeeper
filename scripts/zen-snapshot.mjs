#!/usr/bin/env node
/*
 * The Zen fingerprint: the few lines of Zen's own code this mod is built on top of,
 * extracted from the installed browser and written into the repository, so that git
 * shows what moved after an update.
 *
 * Why a fingerprint and not the files: the sources live inside `omni.ja`, they are
 * Mozilla and Zen code under the MPL, and the largest of them changes on every
 * release for reasons that have nothing to do with us. What this mod depends on is a
 * few dozen lines — the tab group's markup, and the selectors around a collapsed
 * group. Those diff in one screen. A hash per source file still answers "did this
 * file change at all".
 *
 * What is deliberately NOT here: `tabbrowser.js`, where the move calls live. Zen
 * ships the optimized kind of jar, and that one entry cannot be read out of it
 * reliably — `unzip` by name, `unzip` by glob, `bsdtar`, a local-header walk and a
 * raw text search all fail, or disagree between runs on the same file. The move
 * calls are guarded at runtime instead, which is the better guard anyway: the
 * startup canary probes that they still exist, and every move checks afterwards
 * that the strip actually changed.
 *
 * Run it after every Zen update, then read `git diff vendor/zen-fingerprint`.
 * Nothing runs it automatically: it needs an installed browser, which no CI of this
 * project has.
 *
 * Usage: node scripts/zen-snapshot.mjs [--app <path to the browser>]
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "vendor/zen-fingerprint");

// The files inside omni.ja whose shape this mod's stylesheet depends on.
const MARKUP_SOURCE = "chrome/browser/content/browser/tabbrowser/tabgroup.js";
const STYLE_SOURCES = [
  "chrome/browser/skin/classic/browser/tabbrowser/tabs.css",
  "chrome/browser/content/browser/zen-styles/zen-folders.css",
  "chrome/browser/content/browser/zen-styles/zen-split-view.css",
];
const SOURCES = [MARKUP_SOURCE, ...STYLE_SOURCES];

function fail(message) {
  console.error("zen-snapshot: " + message);
  process.exit(1);
}

function findApp() {
  const flag = process.argv.indexOf("--app");
  if (flag !== -1 && process.argv[flag + 1]) {
    return process.argv[flag + 1];
  }
  const candidates = [
    "/Applications/Zen.app/Contents/Resources",
    join(homedir(), "Applications/Zen.app/Contents/Resources"),
    join(homedir(), ".local/share/zen"),
    "/opt/zen",
    "C:/Program Files/Zen Browser",
  ];
  const found = candidates.find(dir => existsSync(join(dir, "browser/omni.ja")));
  if (!found) {
    fail(
      "no installed browser found. Pass --app <path>, the directory that holds " +
        "browser/omni.ja and application.ini."
    );
  }
  return found;
}

const app = findApp();
const jar = join(app, "browser/omni.ja");
if (!existsSync(jar)) {
  fail("no archive at " + jar);
}

// application.ini carries the two identifiers worth recording: the version a person
// would name, and the build the mod itself compares against at startup.
const ini = existsSync(join(app, "application.ini"))
  ? readFileSync(join(app, "application.ini"), "utf8")
  : "";
const version = /^Version=(.+)$/m.exec(ini)?.[1]?.trim() ?? "unknown";
const build = /^BuildID=(.+)$/m.exec(ini)?.[1]?.trim() ?? "unknown";

/*
 * Reading omni.ja without an external tool.
 *
 * Every local file header is examined, and the walk never skips ahead by an entry's
 * declared size: Zen's archive carries a large blob before the zip proper, and one
 * bogus size read out of it is enough to leap over real entries.
 */
function entriesFrom(buf, wanted) {
  const SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
  const found = {};
  for (let at = buf.indexOf(SIGNATURE); at !== -1; at = buf.indexOf(SIGNATURE, at + 4)) {
    if (at + 30 > buf.length) {
      break;
    }
    const method = buf.readUInt16LE(at + 8);
    const compressed = buf.readUInt32LE(at + 18);
    const nameLength = buf.readUInt16LE(at + 26);
    const extraLength = buf.readUInt16LE(at + 28);
    if ((method !== 0 && method !== 8) || nameLength < 1 || nameLength > 300 || compressed < 1) {
      continue;
    }
    const name = buf.toString("utf8", at + 30, at + 30 + nameLength);
    if (!wanted.includes(name) || found[name]) {
      continue;
    }
    const start = at + 30 + nameLength + extraLength;
    const data = buf.subarray(start, start + compressed);
    try {
      found[name] = method === 0 ? data.toString("utf8") : inflateRawSync(data).toString("utf8");
    } catch {
      // An entry that will not inflate is reported as unreadable by the manifest.
    }
  }
  return found;
}

const sources = entriesFrom(readFileSync(jar), SOURCES);
const unreadable = SOURCES.filter(f => !sources[f]);
if (unreadable.length === SOURCES.length) {
  fail("nothing could be read out of " + jar);
}

// -- The markup our selectors walk ------------------------------------------
const markup =
  /static markup = `([\s\S]*?)`;/.exec(sources[MARKUP_SOURCE] ?? "")?.[1] ??
  "NOT FOUND - the tab group element no longer declares a markup template";

// -- Every selector that touches a group, its container or its label --------
const selectorLines = [];
for (const file of STYLE_SOURCES) {
  (sources[file] ?? "").split("\n").forEach((line, i) => {
    const l = line.trim();
    if (!l.includes("tab-group") && !l.includes("zen-folder")) {
      return;
    }
    if (!/collapsed|tab-group-container|tab-group-label|tabbrowser-tab|hasmultipletabs/.test(l)) {
      return;
    }
    selectorLines.push(`${file}:${i + 1}: ${l}`);
  });
}

const sha = text => createHash("sha256").update(text).digest("hex").slice(0, 16);
const header =
  `# Zen ${version} (build ${build})\n` +
  "# Generated by scripts/zen-snapshot.mjs - do not edit by hand.\n\n";

mkdirSync(out, { recursive: true });
writeFileSync(join(out, "tabgroup-markup.txt"), header + markup.trim() + "\n");
writeFileSync(join(out, "collapse-selectors.txt"), header + selectorLines.join("\n") + "\n");
writeFileSync(
  join(out, "manifest.json"),
  JSON.stringify(
    {
      zenVersion: version,
      buildID: build,
      sha256Short: Object.fromEntries(
        SOURCES.map(f => [f, sources[f] ? sha(sources[f]) : "unreadable"])
      ),
    },
    null,
    2
  ) + "\n"
);

console.log(`zen-snapshot: Zen ${version}, build ${build}`);
console.log(`  ${selectorLines.length} selectors from ${STYLE_SOURCES.length} stylesheets`);
if (unreadable.length) {
  console.log(`  unreadable in this archive: ${unreadable.join(", ")}`);
}
console.log("  written to vendor/zen-fingerprint/");
console.log("  now read: git diff vendor/zen-fingerprint");
