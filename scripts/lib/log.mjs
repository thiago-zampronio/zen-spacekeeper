/**
 * Reading a `zstg-debug.log` and asserting over it.
 *
 * Pure: text in, findings out. No filesystem, no process, no printing — so the
 * same analysis serves the CLI (`scripts/check-log.mjs`, over a live log) and the
 * test suite (over committed fixtures). The layout assertions themselves live in
 * `strip.mjs`; this file is about the event stream around them.
 *
 * A finding is `{ id, requirement, text, detail[] }`. An untested entry is a
 * check that found nothing to assert over — reported separately, because a check
 * with an empty sample is not a passing check.
 */

import {
  duplicateKeys,
  emptyGroups,
  looseBeforeGroups,
  misplacedExpanded,
  render,
} from "./strip.mjs";

export function parseLog(text) {
  const events = [];
  let unreadable = 0;
  for (const line of String(text).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) {
      continue;
    }
    try {
      events.push(JSON.parse(trimmed));
    } catch {
      // Rotation can cut a line mid-write. Counted, so a file that is broken
      // throughout cannot pass for a clean one.
      unreadable++;
    }
  }
  return { events, unreadable };
}

/**
 * The mod numbers its entries from 1 per browser session, so an `n === 1` opens a
 * session. Rotation trims from the FRONT, so the file usually opens mid-session:
 * index 0 is always a boundary, or that leading session — the oldest, and often
 * the one worth checking — is dropped without a word.
 */
export function splitSessions(events) {
  if (!events.length) {
    return [];
  }
  const starts = events.map((e, i) => (e.n === 1 ? i : -1)).filter(i => i >= 0);
  const bounds = starts[0] === 0 ? starts : [0, ...starts];
  return bounds.map((from, i) => events.slice(from, bounds[i + 1] ?? events.length));
}

const at = e => String(e?.t ?? "").slice(11, 19);

/**
 * The trigger a reorder move came from, found BY KEY inside a time window.
 *
 * Not by adjacency: the reorder is deferred through setTimeout, so unrelated work
 * interleaves between the trigger and the move. A first version of this check
 * read the nearest preceding non-noise event and reported a real, correctly
 * triggered rise as a violation because a `movedToGroup` had slipped in between.
 */
export function triggerFor(session, index, windowMs = 2000) {
  const move = session[index];
  const key = move.key ?? null;
  const t = Date.parse(move.t ?? "");
  for (let j = index - 1; j >= 0; j--) {
    const e = session[j];
    const dt = t - Date.parse(e.t ?? "");
    if (Number.isFinite(dt) && dt > windowMs) {
      break;
    }
    if (e.event === "collapseEvent" && e.key === key) {
      return "collapseEvent";
    }
    if (e.event === "groupCreated" && e.key === key) {
      return "groupCreated";
    }
  }
  return null;
}

/** The first strip after `index` that mentions `key`. */
export function stripWith(session, index, key, lookahead = 8) {
  for (let j = index + 1; j < session.length && j <= index + lookahead; j++) {
    const e = session[j];
    if (e.event === "strip" && (e.strip ?? []).some(s => s.startsWith(`[${key} `))) {
      return e;
    }
  }
  return null;
}

export function analyze(session) {
  const findings = [];
  const untested = [];
  const of = name => session.filter(e => e.event === name);
  const strips = of("strip");
  const started = of("started")[0] ?? null;
  const cfg = started?.config ?? null;

  const fail = (id, requirement, text, detail = []) =>
    findings.push({ id, requirement, text, detail });
  const skip = (id, why) => untested.push({ id, why });

  // -- Preconditions -------------------------------------------------------
  const stale = of("stalenessCheck")[0] ?? null;
  if (stale && stale.state !== "match") {
    fail(
      "stale",
      "diagnostics/A version mismatch is reported, not merely detected",
      `the running script did not match the installed one (${stale.running} / ${stale.installed})`,
      ["every finding below describes the code that was running, not the repository"]
    );
  }
  if (!started) {
    skip("config", "no `started` entry — this session's configuration is unknown");
  }

  // -- Nothing failed ------------------------------------------------------
  const failed = session.filter(
    e => /Failed$/.test(e.event) || e.event === "addTabGroupReturnedNull"
  );
  for (const e of failed) {
    fail("failureEvent", "diagnostics/Self-test of the mod's own assumptions", `${e.event} was recorded`, [
      `${at(e)} ${JSON.stringify(e)}`,
    ]);
  }

  // -- A new group is born in the open cluster -----------------------------
  // The requirement only binds with the option on, so a session that ran with it
  // off is untested rather than quietly passing.
  const reorderOn = !cfg || (cfg.focusMode && cfg.focusReorder);
  let born = 0;
  let rose = 0;
  let settled = 0;
  if (!reorderOn) {
    skip("bornOnTop", "the reorder option was off at startup");
  } else {
    for (let i = 0; i < session.length; i++) {
      const e = session[i];
      if (e.event !== "groupCreated") {
        continue;
      }
      const strip = stripWith(session, i, e.key);
      if (!strip) {
        continue;
      }
      born++;
      const wrong = misplacedExpanded(strip.strip).find(m => m.key === e.key);
      if (wrong) {
        fail(
          "bornOnTop",
          "group-presentation/Open groups sit above collapsed ones",
          `${e.key} was born expanded below ${wrong.collapsedAbove} collapsed group(s)`,
          [`${at(e)} ${render(strip.strip)}`]
        );
      } else if (session.slice(i + 1, i + 4).some(f => f.event === "focusRise")) {
        rose++;
      } else {
        settled++;
      }
    }
    if (!born) {
      skip("bornOnTop", "no group was created in this session");
    }
  }

  // -- The reorder's trigger list ------------------------------------------
  const moves = session
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.event === "focusRise" || e.event === "focusSink");
  if (!moves.length) {
    skip("reorderTrigger", "no reorder move in this session");
  }
  for (const { e, i } of moves) {
    if (!triggerFor(session, i)) {
      fail(
        "reorderTrigger",
        "group-presentation/Open groups sit above collapsed ones",
        `${e.event} on ${e.key} traces back to no collapse, expand or creation of that key`,
        [`${at(e)} ${JSON.stringify(e)}`]
      );
    }
  }

  // The slide is cosmetic by contract, so a move that did not animate is not a
  // violation. A session where NONE animated leaves the slide untested.
  const slides = of("focusSlide");
  const played = slides.filter(e => (e.played ?? 0) > 0).length;
  if (!slides.length) {
    skip("slide", "no reorder animated in this session");
  } else if (!played) {
    skip("slide", `${slides.length} slide(s), none of them played`);
  }

  // -- Loose tabs at the bottom --------------------------------------------
  if (cfg && !cfg.looseTabsAtBottom) {
    skip("loose", "the loose-tabs-at-bottom option was off at startup");
  } else {
    const settles = strips.filter(e => e.reason === "afterSettle");
    if (!settles.length) {
      skip("loose", "no settle in this session");
    }
    for (const e of settles) {
      if (looseBeforeGroups(e.strip).length) {
        fail(
          "loose",
          "tab-grouping/Loose tabs live below the groups",
          "a loose tab was left above a group after a settle",
          [`${at(e)} ${render(e.strip)}`]
        );
      }
    }
  }

  // -- Group identity ------------------------------------------------------
  if (!strips.length) {
    skip("identity", "no strip in this session");
  }
  for (const e of strips) {
    for (const d of duplicateKeys(e.strip)) {
      fail(
        "duplicateKey",
        "space-isolation/Per-Space group scope",
        `${d.key} appears ${d.count} times in one Space's strip`,
        [`${at(e)} ${render(e.strip)}`]
      );
    }
  }

  // An empty group must be removed. Reported only when it SURVIVES into a second
  // strip: dumpStrip renders `node.tabs?.length ?? 0`, so a single x0 can be the
  // dump reading a group mid-operation rather than a group that is really empty.
  const zeroRuns = new Map();
  for (const e of strips) {
    const now = new Set(emptyGroups(e.strip).map(g => g.key));
    for (const key of now) {
      const run = (zeroRuns.get(key) ?? 0) + 1;
      zeroRuns.set(key, run);
      if (run === 2) {
        fail(
          "emptyGroup",
          "tab-grouping/Removal of empty groups",
          `${key} was still on the strip with no tabs across two consecutive strips`,
          [`${at(e)} ${render(e.strip)}`]
        );
      }
    }
    for (const key of [...zeroRuns.keys()]) {
      if (!now.has(key)) {
        zeroRuns.delete(key);
      }
    }
  }

  // The project's core invariant, read off the inventory the reclaim pass dumps.
  const inventories = of("reclaimGroups").filter(e => Array.isArray(e.groups));
  if (!inventories.length) {
    skip("pairs", "no group inventory in this session");
  }
  for (const e of inventories) {
    const seen = new Set();
    for (const g of e.groups) {
      if (!g.key) {
        continue;
      }
      const pair = `${g.space}|${g.key}`;
      if (seen.has(pair)) {
        fail(
          "pairs",
          "space-isolation/Per-Space group scope",
          `two groups claim ${pair}`,
          [`${at(e)}`]
        );
      }
      seen.add(pair);
    }
  }

  const spaces = new Set(session.map(e => e.space).filter(Boolean));
  if (spaces.size < 2) {
    skip("crossSpace", "only one Space touched — cross-Space isolation not exercised");
  }

  return {
    findings,
    untested,
    stats: {
      entries: session.length,
      from: session[0]?.n ?? null,
      to: session[session.length - 1]?.n ?? null,
      version: started?.version ?? null,
      config: cfg,
      staleness: stale?.state ?? null,
      created: of("groupCreated").length,
      joined: of("movedToGroup").length,
      born,
      rose,
      settled,
      rises: of("focusRise").length,
      sinks: of("focusSink").length,
      collapseEvents: of("collapseEvent").length,
      slides: slides.length,
      slidesPlayed: played,
      slideDurations: [...new Set(slides.map(e => e.duration))],
      dropped: of("droppedWhileBusy").length,
      strips: strips.length,
      spaces: spaces.size,
    },
  };
}
