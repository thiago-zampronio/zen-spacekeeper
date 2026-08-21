import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { analyze, parseLog, splitSessions, triggerFor } from "../scripts/lib/log.mjs";
import { req } from "./helpers/requirements.mjs";

/**
 * The fixtures are real event streams from a real session, with every key, label,
 * Space id and favicon replaced by a neutral one — the browsing history of the
 * person who reported the bug is not test data. The event SHAPES are untouched,
 * which is the whole value: a hand-written fixture would only ever exercise the
 * shapes I remembered to write.
 */

const dir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const load = name => {
  const { events, unreadable } = parseLog(readFileSync(join(dir, name), "utf8"));
  expect(unreadable, "fixture should parse cleanly").toBe(0);
  expect(events.length, "fixture should not be empty").toBeGreaterThan(0);
  const sessions = splitSessions(events);
  return sessions.map(analyze);
};

const findings = reports => reports.flatMap(r => r.findings);
const ids = reports => findings(reports).map(f => f.id);

describe("the fixtures are anonymous", () => {
  it("carries no identifier from the profile it came from", () => {
    // A fixture is committed to a public repository. If sanitisation ever
    // regresses, this is the test that says so rather than a reviewer noticing.
    const all = ["pre-fix-born-at-bottom.log", "post-fix-rises.log", "trigger-interleaved.log"]
      .map(f => readFileSync(join(dir, f), "utf8"))
      .join("\n");
    for (const token of [
      "google", "notion", "slack", "amazon", "alice", "claude", "github",
      "youtube", "chatgpt", "mxtoolbox", "zampronio",
    ]) {
      expect(all.toLowerCase(), `fixture leaks "${token}"`).not.toContain(token);
    }
    // The Space ids must be the placeholder shape, never a real uuid.
    for (const m of all.matchAll(/\{[0-9a-f-]{36}\}/gi)) {
      expect(m[0]).toMatch(/^\{00000000-0000-4000-8000-\d{12}\}$/);
    }
  });
});

describe(req("group-presentation/Open groups sit above collapsed ones"), () => {
  // The regression test for the bug this checker was built to catch. Proving the
  // detector detects was done by hand against a live log, which will not exist
  // for long; this keeps the proof.
  it("catches a group born expanded under the collapsed cluster", () => {
    const reports = load("pre-fix-born-at-bottom.log");
    const born = findings(reports).filter(f => f.id === "bornOnTop");
    expect(born.length).toBeGreaterThan(0);
    for (const f of born) {
      expect(f.text).toMatch(/born expanded below \d+ collapsed group/);
      expect(f.requirement).toBe("group-presentation/Open groups sit above collapsed ones");
    }
  });

  it("reports nothing on a session where new groups rose correctly", () => {
    const reports = load("post-fix-rises.log");
    expect(findings(reports)).toEqual([]);
  });

  it("counts the rises and the correct no-ops separately", () => {
    const [report] = load("post-fix-rises.log");
    expect(report.stats.born).toBeGreaterThan(0);
    expect(report.stats.born).toBe(report.stats.rose + report.stats.settled);
  });
});

describe("the reorder's trigger is found by key, not by adjacency", () => {
  // The first version of this check read the nearest preceding non-noise event
  // and called a correctly triggered rise a violation, because an unrelated
  // `movedToGroup` had landed in between. The reorder is deferred through
  // setTimeout, so adjacency was never the right model.
  it("accepts a rise whose trigger is separated by unrelated events", () => {
    const reports = load("trigger-interleaved.log");
    expect(ids(reports)).not.toContain("reorderTrigger");
    expect(findings(reports)).toEqual([]);
  });

  it("finds the expand that caused the rise, several events back", () => {
    const { events } = parseLog(readFileSync(join(dir, "trigger-interleaved.log"), "utf8"));
    const [session] = splitSessions(events);
    const i = session.findIndex(e => e.event === "focusRise");
    expect(i).toBeGreaterThan(0);
    expect(triggerFor(session, i)).toBe("collapseEvent");
    // The event immediately before is NOT the trigger — that is the whole point.
    expect(session[i - 1].event).not.toBe("collapseEvent");
  });

  it("refuses a trigger for a different key", () => {
    const session = [
      { n: 1, t: "2026-01-01T00:00:00.000Z", event: "collapseEvent", key: "domain:alpha" },
      { n: 2, t: "2026-01-01T00:00:00.010Z", event: "focusRise", key: "domain:bravo" },
    ];
    expect(triggerFor(session, 1)).toBeNull();
  });

  it("refuses a trigger that is too old to be the cause", () => {
    const session = [
      { n: 1, t: "2026-01-01T00:00:00.000Z", event: "collapseEvent", key: "domain:alpha" },
      { n: 2, t: "2026-01-01T00:01:00.000Z", event: "focusRise", key: "domain:alpha" },
    ];
    expect(triggerFor(session, 1)).toBeNull();
  });
});

describe("sessions", () => {
  it("keeps the leading session when the file opens mid-stream", () => {
    // Rotation trims from the front, so index 0 is a boundary whether or not an
    // n === 1 sits there. Getting this wrong silently dropped 720 of 1176 real
    // entries — the older half, and the one carrying the bug.
    const events = [
      { n: 851, t: "2026-01-01T00:00:00.000Z", event: "strip", strip: [] },
      { n: 852, t: "2026-01-01T00:00:01.000Z", event: "strip", strip: [] },
      { n: 1, t: "2026-01-01T01:00:00.000Z", event: "strip", strip: [] },
      { n: 2, t: "2026-01-01T01:00:01.000Z", event: "strip", strip: [] },
    ];
    const sessions = splitSessions(events);
    expect(sessions).toHaveLength(2);
    expect(sessions[0].map(e => e.n)).toEqual([851, 852]);
    expect(sessions[1].map(e => e.n)).toEqual([1, 2]);
  });

  it("treats a file that opens on n === 1 as one session", () => {
    const events = [
      { n: 1, t: "2026-01-01T00:00:00.000Z", event: "strip", strip: [] },
      { n: 2, t: "2026-01-01T00:00:01.000Z", event: "strip", strip: [] },
    ];
    expect(splitSessions(events)).toHaveLength(1);
  });

  it("counts a line broken by rotation instead of ignoring it", () => {
    const { events, unreadable } = parseLog('{"n":1,"event":"strip","strip":[]}\n{"n":2,"eve');
    expect(events).toHaveLength(1);
    expect(unreadable).toBe(1);
  });
});

describe("a check with an empty sample is never a pass", () => {
  it("reports an untested entry rather than success", () => {
    const [report] = load("trigger-interleaved.log");
    expect(report.findings).toEqual([]);
    expect(report.untested.map(u => u.id)).toContain("bornOnTop");
  });

  it("declares the reorder untested when the option was off at startup", () => {
    const session = [
      {
        n: 1,
        t: "2026-01-01T00:00:00.000Z",
        event: "started",
        version: "0.0.0",
        config: { focusMode: true, focusReorder: false, looseTabsAtBottom: true },
      },
    ];
    const { untested, findings: f } = analyze(session);
    expect(f).toEqual([]);
    expect(untested.find(u => u.id === "bornOnTop").why).toMatch(/reorder option was off/);
  });
});

describe(req("diagnostics/A version mismatch is reported, not merely detected"), () => {
  it("treats a stale running script as a finding, not a footnote", () => {
    const session = [
      {
        n: 1,
        t: "2026-01-01T00:00:00.000Z",
        event: "stalenessCheck",
        state: "mismatch",
        running: "0.58.0",
        installed: "0.59.0",
      },
    ];
    const { findings: f } = analyze(session);
    expect(f.map(x => x.id)).toContain("stale");
    expect(f[0].detail.join(" ")).toMatch(/not the repository/);
  });
});

describe(req("tab-grouping/Removal of empty groups"), () => {
  it("ignores a single zero-tab reading, which the dump can produce mid-operation", () => {
    const strip = ["[domain:alpha x0]"];
    const session = [
      { n: 1, t: "2026-01-01T00:00:00.000Z", event: "strip", strip },
      { n: 2, t: "2026-01-01T00:00:01.000Z", event: "strip", strip: ["[domain:alpha x1]"] },
    ];
    expect(analyze(session).findings.map(f => f.id)).not.toContain("emptyGroup");
  });

  it("reports a zero-tab group that survives into a second strip", () => {
    const strip = ["[domain:alpha x0]"];
    const session = [
      { n: 1, t: "2026-01-01T00:00:00.000Z", event: "strip", strip },
      { n: 2, t: "2026-01-01T00:00:01.000Z", event: "strip", strip },
    ];
    expect(analyze(session).findings.map(f => f.id)).toContain("emptyGroup");
  });
});
