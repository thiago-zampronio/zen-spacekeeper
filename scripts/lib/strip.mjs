/**
 * The strip as an oracle.
 *
 * `dumpStrip()` in the chrome script serializes a Space's tab container into an
 * array of strings — order, key, tab count, collapsed state, loose tabs. That
 * array is the whole assertion surface for how the sidebar is arranged, and it
 * is the reason a layout can be checked at all outside a running browser.
 *
 * Everything here is pure: it takes the array and returns findings. It does not
 * care whether the array was read out of a debug log or fetched live from a
 * driven browser, which is the point — the same assertions serve both.
 *
 * The entry shapes, straight from dumpStrip:
 *   "[domain:notion x4]"                 a group of ours, expanded
 *   "[host:docs.google.com x6 collapsed]" a group of ours, collapsed
 *   "[manual(Estudos) x3]"               the user's own group
 *   "loose:domain:github"                an ungrouped tab, key resolved
 *   "loose:?"                            an ungrouped tab, no key yet
 *   "(empty)"                            Zen's empty tab
 *   "<hbox>"                             any other element
 */

const GROUP = /^\[(.+?) x(\d+)( collapsed)?\]$/;

/** @returns {{kind: string, key: string|null, tabs: number, collapsed: boolean, manual: boolean, raw: string}} */
export function parseEntry(raw) {
  const base = { kind: "other", key: null, tabs: 0, collapsed: false, manual: false, raw };
  const g = GROUP.exec(raw);
  if (g) {
    const key = g[1];
    const manual = key.startsWith("manual(");
    return {
      ...base,
      kind: "group",
      key,
      tabs: Number(g[2]),
      collapsed: Boolean(g[3]),
      manual,
    };
  }
  if (raw === "(empty)") {
    return { ...base, kind: "empty" };
  }
  if (raw.startsWith("loose:")) {
    const key = raw.slice("loose:".length);
    return { ...base, kind: "loose", key: key === "?" ? null : key };
  }
  return base;
}

export function parseStrip(strip) {
  return (strip ?? []).map(parseEntry);
}

/** Groups only, in strip order. */
export function groupsOf(strip) {
  return parseStrip(strip).filter(e => e.kind === "group");
}

/** Position of a key among the strip's entries, or -1. */
export function indexOfKey(strip, key) {
  return parseStrip(strip).findIndex(e => e.kind === "group" && e.key === key);
}

/**
 * The open-groups-on-top partition: every expanded group must precede every
 * collapsed one. Returns the expanded groups that sit below a collapsed group,
 * each with how many collapsed groups are above it.
 *
 * Manual groups are included in the reading deliberately: the user's own group
 * occupies a position in the strip like any other, and an expanded group of
 * ours sitting below it collapsed is still the strip the user sees.
 */
export function misplacedExpanded(strip) {
  const entries = parseStrip(strip);
  const out = [];
  let collapsedAbove = 0;
  for (const e of entries) {
    if (e.kind !== "group") {
      continue;
    }
    if (e.collapsed) {
      collapsedAbove += 1;
    } else if (collapsedAbove > 0) {
      out.push({ key: e.key, collapsedAbove });
    }
  }
  return out;
}

/** True when no expanded group sits below a collapsed one. */
export function partitioned(strip) {
  return misplacedExpanded(strip).length === 0;
}

/**
 * Loose tabs belong after the Space's last group. Returns the loose entries
 * that sit before a group. Zen's empty tab is not a loose tab and is skipped.
 */
export function looseBeforeGroups(strip) {
  const entries = parseStrip(strip);
  const lastGroup = entries.reduce((acc, e, i) => (e.kind === "group" ? i : acc), -1);
  if (lastGroup < 0) {
    return [];
  }
  return entries
    .map((e, i) => ({ ...e, at: i }))
    .filter(e => e.kind === "loose" && e.at < lastGroup);
}

/** Groups of ours reported with no tabs — an empty group should have been removed. */
export function emptyGroups(strip) {
  return groupsOf(strip).filter(e => !e.manual && e.tabs === 0);
}

/** Keys appearing more than once in one Space's strip. */
export function duplicateKeys(strip) {
  const seen = new Map();
  for (const e of groupsOf(strip)) {
    seen.set(e.key, (seen.get(e.key) ?? 0) + 1);
  }
  return [...seen].filter(([, n]) => n > 1).map(([key, n]) => ({ key, count: n }));
}

/** Compact one-line rendering, for failure messages. */
export function render(strip) {
  return (strip ?? []).join(" ");
}
