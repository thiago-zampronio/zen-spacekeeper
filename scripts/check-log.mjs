#!/usr/bin/env node
/**
 * Behaviour check over a real `zstg-debug.log`.
 *
 * verify.mjs answers "is the repository consistent with itself". This answers
 * "did the running browser behave": it reads the log the mod already writes and
 * asserts the invariants the specification names.
 *
 * All the analysis lives in lib/log.mjs and lib/strip.mjs, under test against
 * committed fixtures. This file only finds a log and prints. It is the
 * operational entry point; `npm test` is the other one, over the fixtures.
 *
 * Passive by nature: it sees only what the session happened to exercise, so it
 * reports untested checks separately and never counts them as passing.
 *
 *   node scripts/check-log.mjs [path/to/zstg-debug.log] [--all]
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { analyze, parseLog, splitSessions } from "./lib/log.mjs";

// Deliberately not the profiles.ini walk verify.mjs does: that answers "which
// profile does Zen use", and the question here is only "where is a log". Looking
// for the file itself also finds it in a non-default profile, which is exactly
// where a disposable test profile would live.
function findLogs() {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  const roots =
    process.platform === "win32"
      ? [join(process.env.APPDATA || "", "zen")]
      : process.platform === "darwin"
        ? [join(home, "Library/Application Support/zen")]
        : [
            join(home, ".config/zen"),
            join(home, ".zen"),
            join(home, ".var/app/app.zen_browser.zen/.config/zen"),
            join(home, ".var/app/io.github.zen_browser.zen/.config/zen"),
          ];
  const found = [];
  for (const root of roots) {
    for (const dir of [root, join(root, "Profiles")]) {
      if (!existsSync(dir)) {
        continue;
      }
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) {
          continue;
        }
        const log = join(dir, entry.name, "zstg-debug.log");
        if (existsSync(log)) {
          found.push({ path: log, at: statSync(log).mtimeMs });
        }
      }
    }
  }
  return found.sort((a, b) => b.at - a.at);
}

const args = process.argv.slice(2);
const all = args.includes("--all");
let logPath = args.find(a => !a.startsWith("--")) ?? "";

if (!logPath) {
  const found = findLogs();
  if (!found.length) {
    console.error(
      "No zstg-debug.log found. Turn on zen.stg.debugLog, use the browser for a\n" +
        "while, then re-run — or pass the path explicitly."
    );
    process.exit(2);
  }
  logPath = found[0].path;
  if (found.length > 1) {
    console.log(`${found.length} logs found; using the most recently written.`);
  }
}

console.log(`Spacekeeper behaviour check\n\n  Log: ${logPath}`);

const { events, unreadable } = parseLog(readFileSync(logPath, "utf8"));
if (!events.length) {
  console.error("The log holds no readable entries.");
  process.exit(2);
}
const sessions = splitSessions(events);
const selected = all ? sessions : [sessions[sessions.length - 1]];
console.log(
  `  ${events.length} entries, ${sessions.length} session(s); checking ${
    all ? "all of them" : "the last one"
  }${unreadable ? `; ${unreadable} unreadable line(s)` : ""}`
);

let failed = 0;
let skipped = 0;

for (const [i, session] of selected.entries()) {
  const label = all ? `session ${i + 1}/${selected.length}` : "last session";
  const { findings, untested, stats } = analyze(session);
  console.log(`\n===== ${label} — ${stats.entries} entries, n=${stats.from}..${stats.to}`);

  if (stats.version) {
    console.log(`  version ${stats.version}, staleness ${stats.staleness ?? "not checked"}`);
    const c = stats.config;
    console.log(
      `  focusMode=${c?.focusMode} focusReorder=${c?.focusReorder} ` +
        `looseTabsAtBottom=${c?.looseTabsAtBottom} minTabs=${c?.minTabs}`
    );
    console.log(
      "  configuration read at startup only: the log records no preference change,\n" +
        "  so a toggle mid-session is invisible here"
    );
  }

  console.log(
    `\n  exercised: ${stats.created} groups created (${stats.rose} rose, ${stats.settled} needed no move), ` +
      `${stats.joined} tabs joined an existing group`
  );
  console.log(
    `             ${stats.rises} rises, ${stats.sinks} sinks, ${stats.collapseEvents} collapse/expand events, ` +
      `${stats.strips} strips, ${stats.spaces} Space(s)`
  );
  if (stats.slides) {
    console.log(
      `             ${stats.slidesPlayed}/${stats.slides} slides played at ${stats.slideDurations.join(", ")}ms`
    );
  }
  if (stats.dropped) {
    console.log(`             ${stats.dropped} droppedWhileBusy — self-correcting by design`);
  }

  if (findings.length) {
    console.log(`\n  ${findings.length} violation(s):`);
    for (const f of findings) {
      console.log(`  [!!] ${f.text}`);
      console.log(`       requirement: ${f.requirement}`);
      for (const d of f.detail) {
        console.log(`       ${d}`);
      }
    }
  } else {
    console.log("\n  [ok] no violation");
  }

  if (untested.length) {
    console.log(`\n  ${untested.length} check(s) with nothing to assert over:`);
    for (const u of untested) {
      console.log(`  [--] ${u.id}: ${u.why}`);
    }
  }

  failed += findings.length;
  skipped += untested.length;
}

console.log("");
if (failed) {
  console.log(`${failed} violation(s) across ${selected.length} session(s).`);
  process.exit(1);
}
console.log(
  `NO VIOLATION IN THIS LOG${skipped ? `, with ${skipped} check(s) untested` : ""}.`
);
console.log(
  "Passive check: it sees only what the session exercised. An untested list is not\na clean bill of health."
);
