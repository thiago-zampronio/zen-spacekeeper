import { describe, expect, it } from "vitest";
import {
  duplicateKeys,
  emptyGroups,
  indexOfKey,
  looseBeforeGroups,
  misplacedExpanded,
  parseEntry,
  partitioned,
} from "../scripts/lib/strip.mjs";
import { req } from "./helpers/requirements.mjs";

// The shapes come straight from dumpStrip(). Getting the parse wrong would make
// every assertion above it meaningless, so it is checked entry by entry.
describe("parsing a strip entry", () => {
  it("reads an expanded group of ours", () => {
    expect(parseEntry("[domain:alpha x4]")).toMatchObject({
      kind: "group",
      key: "domain:alpha",
      tabs: 4,
      collapsed: false,
      manual: false,
    });
  });

  it("reads a collapsed group", () => {
    expect(parseEntry("[host:bravo.example x6 collapsed]")).toMatchObject({
      kind: "group",
      key: "host:bravo.example",
      tabs: 6,
      collapsed: true,
    });
  });

  it("marks the user's own group as manual", () => {
    expect(parseEntry("[manual(Studies) x3]")).toMatchObject({
      kind: "group",
      manual: true,
      tabs: 3,
    });
  });

  it("reads a loose tab with and without a resolved key", () => {
    expect(parseEntry("loose:domain:alpha")).toMatchObject({
      kind: "loose",
      key: "domain:alpha",
    });
    expect(parseEntry("loose:?")).toMatchObject({ kind: "loose", key: null });
  });

  it("reads Zen's empty tab and anything else", () => {
    expect(parseEntry("(empty)").kind).toBe("empty");
    expect(parseEntry("<hbox>").kind).toBe("other");
  });

  it("does not mistake a key containing a space for two entries", () => {
    expect(parseEntry("[manual(My Group) x2]")).toMatchObject({
      key: "manual(My Group)",
      tabs: 2,
    });
  });
});

describe(req("group-presentation/Open groups sit above collapsed ones"), () => {
  it("accepts a strip where every expanded group precedes every collapsed one", () => {
    const strip = [
      "(empty)",
      "[domain:alpha x2]",
      "[domain:bravo x1]",
      "[host:charlie.example x6 collapsed]",
      "loose:?",
      "<hbox>",
    ];
    expect(partitioned(strip)).toBe(true);
    expect(misplacedExpanded(strip)).toEqual([]);
  });

  it("names the expanded group that sits below a collapsed one", () => {
    // This is the shape of the bug: a group born at the end of the strip.
    const strip = [
      "(empty)",
      "[domain:alpha x2]",
      "[host:bravo.example x6 collapsed]",
      "[domain:charlie x1 collapsed]",
      "[domain:delta x1]",
      "<hbox>",
    ];
    expect(partitioned(strip)).toBe(false);
    expect(misplacedExpanded(strip)).toEqual([
      { key: "domain:delta", collapsedAbove: 2 },
    ]);
  });

  it("counts only the collapsed groups actually above it", () => {
    const strip = [
      "[host:alpha.example x1 collapsed]",
      "[domain:bravo x1]",
      "[domain:charlie x1 collapsed]",
      "[domain:delta x1]",
    ];
    expect(misplacedExpanded(strip)).toEqual([
      { key: "domain:bravo", collapsedAbove: 1 },
      { key: "domain:delta", collapsedAbove: 2 },
    ]);
  });

  it("reads the user's own group as occupying a position like any other", () => {
    // A manual group collapsed above one of ours still describes the strip the
    // user is looking at, so it is not excluded from the partition reading.
    expect(misplacedExpanded(["[manual(Studies) x3 collapsed]", "[domain:alpha x1]"])).toEqual([
      { key: "domain:alpha", collapsedAbove: 1 },
    ]);
  });

  it("is vacuously satisfied by a strip with no groups", () => {
    expect(partitioned(["(empty)", "loose:?", "<hbox>"])).toBe(true);
  });

  it("finds a group's position, and reports -1 for one that is absent", () => {
    const strip = ["(empty)", "[domain:alpha x1]", "[domain:bravo x1]"];
    expect(indexOfKey(strip, "domain:bravo")).toBe(2);
    expect(indexOfKey(strip, "domain:zulu")).toBe(-1);
  });
});

describe(req("tab-grouping/Loose tabs live below the groups"), () => {
  it("accepts loose tabs after the last group", () => {
    expect(
      looseBeforeGroups(["(empty)", "[domain:alpha x1]", "loose:?", "loose:domain:bravo"])
    ).toEqual([]);
  });

  it("names a loose tab wedged between groups", () => {
    const found = looseBeforeGroups([
      "[domain:alpha x1]",
      "loose:domain:bravo",
      "[domain:charlie x1]",
    ]);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ key: "domain:bravo", at: 1 });
  });

  it("does not treat Zen's empty tab as a loose tab", () => {
    // The empty tab legitimately sits at the top of every Space.
    expect(looseBeforeGroups(["(empty)", "[domain:alpha x1]"])).toEqual([]);
  });

  it("has nothing to say about a strip with no group", () => {
    expect(looseBeforeGroups(["loose:?", "loose:domain:alpha"])).toEqual([]);
  });
});

describe(req("tab-grouping/Removal of empty groups"), () => {
  it("names a group of ours left with no tabs", () => {
    expect(emptyGroups(["[domain:alpha x0]", "[domain:bravo x2]"])).toHaveLength(1);
  });

  it("leaves the user's own empty group alone", () => {
    // Removing empty groups is a promise about the groups the system created.
    expect(emptyGroups(["[manual(Studies) x0]"])).toEqual([]);
  });
});

describe(req("space-isolation/Per-Space group scope"), () => {
  it("names a key claimed twice inside one Space's strip", () => {
    expect(duplicateKeys(["[domain:alpha x1]", "[domain:bravo x1]", "[domain:alpha x2]"])).toEqual([
      { key: "domain:alpha", count: 2 },
    ]);
  });

  it("accepts one group per key", () => {
    expect(duplicateKeys(["[domain:alpha x1]", "[domain:bravo x1]"])).toEqual([]);
  });
});
