// ==UserScript==
// @name           Spacekeeper
// @description    Automatic tab grouping by site, scoped to Zen Spaces
// @version        0.25.0
// ==/UserScript==

const LOG = "[ZSTG]";
// Kept in step with @version above by verify.ps1. It was duplicated as a literal
// in four places and drifted: inspect() reported 0.2.0 while the script was 0.16.0,
// so the one number people are asked for when reporting a problem was wrong.
const VERSION = "0.25.0";
const KEY_ATTR = "zstg-key";
const SPACE_ATTR = "zen-workspace-id";
const PREF_PREFIX = "zen.stg.";

// The pure logic — key derivation, rules, colors, the deterministic test cases —
// lives in zstg-core.mjs, so verify.ps1 can run it under plain node on every
// commit. Without it there is nothing to run: fail once, loudly, and stay off
// (start() never runs when this is null).
const core = (() => {
  try {
    return ChromeUtils.importESModule("chrome://userchrome/content/zstg-core.mjs");
  } catch (ex) {
    console.error(`${LOG} could not load zstg-core.mjs - the mod cannot run:`, ex);
    return null;
  }
})();
const {
  COLORS,
  GROUPABLE_SCHEMES,
  parseRules,
  hashColor,
  rgbToHsl,
  colorName,
  keyFromParts,
  runDerivationTests,
} = core ?? {};

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEFAULTS = {
  enabled: true,
  groupBySubdomain: false,
  // Sites that deserve host granularity, without fragmenting everything else.
  // e.g. "google.com" splits Gmail, Drive and search into distinct groups.
  subdomainDomains: "",
  // "host" -> mail.google (unambiguous) | "sub" -> mail (readable, ambiguous)
  subdomainLabel: "host",
  minTabs: 1,
  focusMode: false,
  // How many groups stay open in focus mode. Keeping only the active one makes
  // the sidebar flicker on every tab switch; keeping the N most recent ones
  // reduces that motion without losing the effect.
  focusKeep: 3,
  spaceScopedTabSwitch: true,
  faviconColors: true,
  excludedDomains: "",
  customRules: "[]",
  colors: "{}",
  groups: "{}",
  // "auto" follows the browser language. Any other value pins the interface to
  // one of the languages in the catalog, independently of the browser.
  locale: "auto",
  // Off by default: every line records the site of the tab involved, so the file
  // ends up being a history of the sites you visit, in plain text inside the
  // profile. That has to be a deliberate choice, not a silent default.
  debugLog: false,
};

// ---------------------------------------------------------------------------
// Log file
// ---------------------------------------------------------------------------

const LOG_MAX_BYTES = 1_000_000;

let logSequence = 0;
let logPath;
let logUnavailable = false;

/**
 * Resolved on demand, never at module top level: if `PathUtils` were missing, an
 * exception here would take down the whole file, and grouping with it.
 */
function logPathFor() {
  if (logPath === undefined) {
    try {
      logPath = PathUtils.join(PathUtils.profileDir, "zstg-debug.log");
    } catch {
      logPath = null;
      logUnavailable = true;
    }
  }
  return logPath;
}

/**
 * Records an event in <profile>/zstg-debug.log, one JSON line per event.
 * It exists because the hardest moments to diagnose — session restore, reclaiming
 * groups — happen before anyone opens the console.
 * Can be turned off with `zen.stg.debugLog`.
 */
function dbg(event, data) {
  try {
    if (logUnavailable || !prefBool("debugLog")) {
      return;
    }
    const path = logPathFor();
    if (!path) {
      return;
    }
    const line =
      JSON.stringify({
        n: ++logSequence,
        t: new Date().toISOString(),
        event,
        ...data,
      }) + "\n";
    // "appendOrCreate" and not "append": the latter requires an existing file and
    // would fail on the very first write.
    IOUtils.writeUTF8(path, line, { mode: "appendOrCreate" })
      .then(async () => {
        if (logSequence % 50 === 0) {
          const info = await IOUtils.stat(path);
          if (info.size > LOG_MAX_BYTES) {
            await IOUtils.writeUTF8(path, "");
          }
        }
      })
      .catch(ex => {
        // A write failure breaks nothing, but it has to be visible: a log that
        // fails silently is worse than no log at all.
        if (!logUnavailable) {
          logUnavailable = true;
          console.error(`${LOG} log file disabled — ${ex}`, path);
        }
      });
  } catch (ex) {
    if (!logUnavailable) {
      logUnavailable = true;
      console.error(`${LOG} log file disabled — ${ex}`);
    }
  }
}

/**
 * At most the host of an address ever reaches the log: a full URL carries paths
 * and query-string tokens, a materially different exposure than a hostname. On a
 * parse failure the raw input must not leak in its place, so this returns "".
 */
function hostOnly(spec) {
  try {
    return Services.io.newURI(String(spec)).host || "";
  } catch {
    return "";
  }
}

/**
 * Declares the defaults on the default branch. Without this the prefs never show
 * up in about:config, and anyone creating them by hand may pick the wrong type —
 * in which case reads fall back to the default and the pref appears to do nothing.
 */
function declareDefaults() {
  const branch = Services.prefs.getDefaultBranch(PREF_PREFIX);
  for (const [name, value] of Object.entries(DEFAULTS)) {
    try {
      if (typeof value === "boolean") {
        branch.setBoolPref(name, value);
      } else if (typeof value === "number") {
        branch.setIntPref(name, value);
      } else {
        branch.setStringPref(name, value);
      }
    } catch (ex) {
      console.warn(`${LOG} could not declare ${name}: ${ex.message}`);
    }
  }
}

function prefBool(name) {
  try {
    return Services.prefs.getBoolPref(PREF_PREFIX + name, DEFAULTS[name]);
  } catch {
    return DEFAULTS[name];
  }
}

function prefInt(name) {
  try {
    const v = Services.prefs.getIntPref(PREF_PREFIX + name, DEFAULTS[name]);
    return v >= 1 ? v : DEFAULTS[name];
  } catch {
    return DEFAULTS[name];
  }
}

function prefStr(name) {
  try {
    return Services.prefs.getStringPref(PREF_PREFIX + name, DEFAULTS[name]);
  } catch {
    return DEFAULTS[name];
  }
}

function prefJSON(name, expectsArray) {
  const raw = prefStr(name);
  try {
    const v = JSON.parse(raw);
    if (expectsArray ? Array.isArray(v) : v && typeof v === "object") {
      return v;
    }
    console.warn(`${LOG} ${name}: unexpected format, using default`);
  } catch (ex) {
    console.warn(`${LOG} ${name}: invalid JSON (${ex.message}), using default`);
  }
  return JSON.parse(DEFAULTS[name]);
}

// ---------------------------------------------------------------------------
// Interface language
// ---------------------------------------------------------------------------

/**
 * Loads the shared catalog. The panel imports this same file, so a visible text
 * exists in exactly one place.
 *
 * If the import fails the key itself is displayed: the menu still opens, and the
 * broken key names the entry that is missing. Losing the whole script over a
 * missing text file would be a far worse trade.
 */
let _t = null;

function t(key, values) {
  if (_t) {
    return _t(key, values);
  }
  try {
    const i18n = ChromeUtils.importESModule(
      "chrome://userchrome/content/zstg-i18n.mjs"
    );
    const language = i18n.chooseLanguage(
      prefStr("locale"),
      Services.locale.appLocaleAsBCP47
    );
    _t = i18n.createTranslator(language, (missingKey, lang, absent) => {
      dbg("missingText", { key: missingKey, language: lang, absent });
    });
    dbg("language", { chosen: language, browser: Services.locale.appLocaleAsBCP47 });
  } catch (ex) {
    console.error(`${LOG} could not load the text catalog:`, ex);
    _t = k => k;
  }
  return _t(key, values);
}

// Cache invalidated by a pref observer — changes apply without restarting.
let _cfg = null;

function cfg() {
  if (_cfg) {
    return _cfg;
  }
  const rules = parseRules(prefStr("customRules"));

  _cfg = {
    enabled: prefBool("enabled"),
    groupBySubdomain: prefBool("groupBySubdomain"),
    subdomainDomains: prefStr("subdomainDomains")
      .split(",")
      .map(s => s.trim().toLowerCase())
      .filter(Boolean),
    subdomainLabel: prefStr("subdomainLabel") === "sub" ? "sub" : "host",
    minTabs: prefInt("minTabs"),
    focusMode: prefBool("focusMode"),
    focusKeep: Math.max(1, prefInt("focusKeep")),
    spaceScopedTabSwitch: prefBool("spaceScopedTabSwitch"),
    faviconColors: prefBool("faviconColors"),
    excluded: prefStr("excludedDomains")
      .split(",")
      .map(s => s.trim().toLowerCase())
      .filter(Boolean),
    rules,
    colors: prefJSON("colors", false),
    groups: prefJSON("groups", false),
  };
  return _cfg;
}

function saveGroupMap(map) {
  try {
    Services.prefs.setStringPref(PREF_PREFIX + "groups", JSON.stringify(map));
  } catch (ex) {
    console.warn(`${LOG} could not save the group map: ${ex.message}`);
  }
}

function saveColors(map) {
  try {
    Services.prefs.setStringPref(PREF_PREFIX + "colors", JSON.stringify(map));
  } catch (ex) {
    console.warn(`${LOG} could not save colors: ${ex.message}`);
  }
}

// ---------------------------------------------------------------------------
// Group key derivation
// ---------------------------------------------------------------------------

/**
 * Thin wrapper over the core derivation: extracts what only the browser can give
 * (the nsIURI parts, the live configuration, the real Public Suffix List) and
 * delegates. The logic itself lives in zstg-core.mjs, where node can test it.
 * @param {nsIURI} uri
 * @param {object} [over] partial config overriding the current one (used by tests)
 * @returns {{key: string, label: string}|null} null when the tab is not groupable.
 */
function keyFromURI(uri, over) {
  if (!uri || !GROUPABLE_SCHEMES.has(uri.scheme)) {
    return null;
  }
  let host;
  try {
    host = uri.host;
  } catch {
    return null;
  }
  if (!host) {
    return null;
  }
  const c = over ? { ...cfg(), ...over } : cfg();
  return keyFromParts(uri.scheme, host, c, Services.eTLD);
}

function keyFromTab(tab) {
  let uri;
  try {
    uri = tab.linkedBrowser?.currentURI;
  } catch {
    return null;
  }
  return keyFromURI(uri);
}

/** String version, for diagnostics and tests. */
function keyFromText(url, over) {
  try {
    return keyFromURI(Services.io.newURI(url), over);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Space and eligibility
// ---------------------------------------------------------------------------

function spaceOfTab(tab) {
  return tab.getAttribute(SPACE_ATTR) || null;
}

function isOurGroup(g) {
  return !!g && !g.isZenFolder && g.hasAttribute(KEY_ATTR);
}

/**
 * A tab is a candidate for organization only if it is neither native Zen structure
 * nor inside the user's own manual organization.
 */
function isEligible(tab) {
  if (!tab || !tab.isConnected || tab.closing) {
    return false;
  }
  if (tab.pinned) {
    return false;
  }
  if (tab.hasAttribute("zen-essential") || tab.hasAttribute("essential")) {
    return false;
  }
  if (tab.hasAttribute("zen-empty-tab")) {
    return false;
  }
  if (tab.splitview || tab.group?.hasAttribute("split-view-group")) {
    return false;
  }
  if (tab.group?.isZenFolder) {
    return false;
  }
  // A plain group without our marking = the user's own organization
  if (tab.group && !isOurGroup(tab.group)) {
    return false;
  }
  if (!spaceOfTab(tab)) {
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Finding and creating groups
// ---------------------------------------------------------------------------

function findGroup(spaceId, key) {
  for (const g of window.gBrowser.tabGroups) {
    if (
      isOurGroup(g) &&
      g.getAttribute(SPACE_ATTR) === spaceId &&
      g.getAttribute(KEY_ATTR) === key
    ) {
      return g;
    }
  }
  return null;
}

function spaceContainer(spaceId) {
  return window.gZenWorkspaces?.workspaceElement?.(spaceId)?.tabsContainer ?? null;
}

/**
 * addTabGroup requires a non-null insertBefore and inserts the group into that
 * node's parent. That is why the anchor must be a direct child of the right
 * Space container — it is what guarantees the group is born in the tab's Space.
 */
function anchorFor(tab, spaceId) {
  const container = spaceContainer(spaceId);
  if (!container) {
    return null;
  }
  let node = tab;
  while (node && node.parentNode !== container) {
    node = node.parentNode;
  }
  return node || container.lastElementChild;
}

/**
 * Effective color for a key. The hash is deterministic, so it is not persisted —
 * we only store what cannot be recomputed: the favicon-derived color and the color
 * picked by hand. That is what makes derivation possible after creation.
 */
function colorFor(key) {
  const c = cfg();
  if (c.colors[key]) {
    return c.colors[key];
  }
  return hashColor(key);
}

// ---------------------------------------------------------------------------
// Favicon-derived color
// ---------------------------------------------------------------------------

/**
 * Reads the favicon the browser already has for the tab and returns the closest
 * native color. Any failure returns `null`, and the caller falls back to the hash.
 */
async function colorFromFavicon(tab) {
  const url = window.gBrowser.getIcon?.(tab) || tab.getAttribute("image");
  if (!url) {
    return null;
  }

  const img = new window.Image();
  img.src = url;
  await img.decode();

  const N = 32;
  const canvas = window.document.createElementNS(
    "http://www.w3.org/1999/xhtml",
    "canvas"
  );
  canvas.width = N;
  canvas.height = N;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, N, N);
  const { data } = ctx.getImageData(0, 0, N, N);

  // Favicons carry a lot of transparent pixels and a lot of white/black background:
  // both are discarded so they do not dominate the result.
  const buckets = new Array(12).fill(0);
  let chromatic = 0;
  let total = 0;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) {
      continue;
    }
    total++;
    const { h, s, l } = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    if (s < 0.25 || l < 0.12 || l > 0.92) {
      continue;
    }
    chromatic++;
    buckets[Math.floor(h / 30) % 12] += s;
  }

  if (!total || chromatic / total < 0.1) {
    return "gray";
  }

  let best = 0;
  for (let i = 1; i < buckets.length; i++) {
    if (buckets[i] > buckets[best]) {
      best = i;
    }
  }
  return colorName(best * 30 + 15);
}

/**
 * Applies the derived color without holding up group creation: the group is already
 * born with the hash color, and the derived one lands when the favicon is available.
 */
function applyFaviconColor(group, tab, key) {
  const icon = window.gBrowser.getIcon?.(tab) || tab.getAttribute("image");
  dbg("derivedColorStart", {
    key,
    enabled: cfg().faviconColors,
    alreadySet: cfg().colors[key] ?? null,
    icon: icon ? String(icon).slice(0, 80) : null,
  });
  if (!cfg().faviconColors || cfg().colors[key]) {
    return;
  }
  colorFromFavicon(tab)
    .then(color => {
      if (!color || !group.isConnected || cfg().colors[key]) {
        return;
      }
      const c = cfg();
      c.colors[key] = color;
      saveColors(c.colors);
      group.color = color;
      dbg("derivedColor", { key, color });
    })
    .catch(ex => {
      dbg("derivedColorFailed", { key, error: String(ex) });
    });
}

/**
 * If the user changed the color by hand, that becomes the color for the key.
 *
 * Compares against the color the system would give this key — registered, derived
 * or hashed. If the group has another one, you were the one who changed it.
 *
 */
function recordManualColor(group) {
  const key = group.getAttribute(KEY_ATTR);
  if (!key || !group.color) {
    return;
  }
  const c = cfg();
  // Previously this only saved when a color was already registered. With favicon
  // derivation off nothing is ever registered, so the manual choice was lost when
  // the group was recreated — and the panel promised the opposite.
  // Previously this only saved when a color was already registered.
  if (group.color !== colorFor(key)) {
    c.colors[key] = group.color;
    saveColors(c.colors);
    dbg("manualColor", { key, color: group.color });
  }
}

function tabsWithSameKey(spaceId, key) {
  const out = [];
  for (const t of window.gBrowser.tabs) {
    if (spaceOfTab(t) !== spaceId || !isEligible(t)) {
      continue;
    }
    if (keyFromTab(t)?.key === key) {
      out.push(t);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

let busy = false;

function guarded(fn) {
  if (busy) {
    // Dropped work self-corrects on the next event, but silently dropping it made
    // "why didn't it react" undiagnosable. Visible in the log, harmless otherwise.
    dbg("droppedWhileBusy", {});
    return undefined;
  }
  busy = true;
  try {
    return fn();
  } catch (ex) {
    console.error(`${LOG} error:`, ex);
    return undefined;
  } finally {
    busy = false;
  }
}

/**
 * @param {boolean} force ignores the global `enabled` switch (manual commands)
 */
function organize(tab, force = false) {
  if (!force && !cfg().enabled) {
    return;
  }
  if (!isEligible(tab)) {
    return;
  }

  const spaceId = spaceOfTab(tab);
  const info = keyFromTab(tab);
  if (!info) {
    // No longer groupable — it entered the exclusion list, or navigated to an
    // internal page. Staying inside the old group would make that group lie about
    // its own contents.
    const previousGroup = tab.group;
    if (previousGroup && isOurGroup(previousGroup)) {
      window.gBrowser.ungroupTab(tab);
      removeEmptyGroups();
      dbg("leftNotGroupable", {
        from: previousGroup.getAttribute(KEY_ATTR),
        space: spaceId,
      });
    }
    return;
  }

  const current = tab.group;
  let target = findGroup(spaceId, info.key);

  // Session restore finishes after the script initializes, so one of our groups
  // may already be on screen without its marking. We claim it here, right before
  // creating a new group — which is exactly when a missing marking causes a
  // duplicate.
  if (!target && Object.keys(cfg().groups).length) {
    reclaimGroups();
    target = findGroup(spaceId, info.key);
  }

  if (target) {
    recordManualColor(target);
    if (current === target) {
      return;
    }
    target.addTabs([tab]);
    updateHiddenCount(target);
    dbg("movedToGroup", { key: info.key, space: spaceId, group: target.id });
    return;
  }

  // No target group: only create one if the minimum is reached
  const candidates = tabsWithSameKey(spaceId, info.key);
  if (candidates.length < cfg().minTabs) {
    // Not being able to join a new group is no reason to stay in the old one: a tab
    // that navigated from `google` to `maxmilhas` no longer belongs to the `google`
    // group. Without this exit, it stayed stuck in the wrong group.
    if (current && isOurGroup(current) && current.getAttribute(KEY_ATTR) !== info.key) {
      window.gBrowser.ungroupTab(tab);
      removeEmptyGroups();
      dbg("leftPreviousGroup", {
        from: current.getAttribute(KEY_ATTR),
        to: info.key,
        space: spaceId,
      });
    }
    dbg("belowMinimum", {
      key: info.key,
      space: spaceId,
      candidates: candidates.length,
      minTabs: cfg().minTabs,
    });
    return;
  }

  // Take the tab out of an old group of ours so the anchor is a direct child of
  // the Space container
  if (current && isOurGroup(current)) {
    window.gBrowser.ungroupTab(tab);
  }

  const anchor = anchorFor(tab, spaceId);
  if (!anchor) {
    console.warn(`${LOG} container for Space ${spaceId} not found`);
    return;
  }

  const group = window.gBrowser.addTabGroup(candidates, {
    label: info.label,
    color: colorFor(info.key),
    insertBefore: anchor,
  });

  if (!group) {
    dbg("addTabGroupReturnedNull", { key: info.key, space: spaceId });
    return;
  }
  markAsOurs(group, info.key, spaceId);
  applyFaviconColor(group, tab, info.key);
  dbg("groupCreated", {
    key: info.key,
    label: info.label,
    space: spaceId,
    group: group.id,
    tabs: candidates.length,
  });
}

/**
 * `zstg-key` lives only on the element and is not part of session data. We store
 * the id -> key link in a pref to recognize the group after a restore; without it
 * a restored group looks like a user group and a second group for the same key
 * ends up being created.
 */
function markAsOurs(group, key, spaceId) {
  group.setAttribute(KEY_ATTR, key);
  if (spaceId) {
    group.setAttribute(SPACE_ATTR, spaceId);
  }
  const map = cfg().groups;
  if (map[group.id] !== key) {
    map[group.id] = key;
    saveGroupMap(map);
  }
}

/**
 * Re-stamps groups brought back by session restore, matching by id — which the
 * session store preserves. Matching is by id, never by label, so we never adopt a
 * group the user created with the same name.
 */
function reclaimGroups({ prune = false } = {}) {
  const map = cfg().groups;
  let reclaimed = 0;
  const liveIds = new Set();

  for (const g of window.gBrowser.tabGroups) {
    if (g.isZenFolder || g.hasAttribute("split-view-group")) {
      continue;
    }
    const key = map[g.id];
    if (!key) {
      continue;
    }
    liveIds.add(g.id);
    if (!g.hasAttribute(KEY_ATTR)) {
      g.setAttribute(KEY_ATTR, key);
      reclaimed++;
    }
    if (!g.getAttribute(SPACE_ATTR)) {
      const first = g.tabs?.[0];
      const space = first ? spaceOfTab(first) : null;
      if (space) {
        g.setAttribute(SPACE_ATTR, space);
      }
    }
  }

  // Pruning only happens on request. Called during startup, when the session has
  // not restored the groups yet, it would erase the very map that lets us
  // recognize them — that is how the link used to be lost.
  if (prune) {
    const pruned = {};
    for (const id of liveIds) {
      pruned[id] = map[id];
    }
    if (Object.keys(pruned).length !== Object.keys(map).length) {
      _cfg.groups = pruned;
      saveGroupMap(pruned);
      dbg("mapPruned", { before: Object.keys(map).length, after: liveIds.size });
    }
  }

  if (reclaimed) {
    console.log(`${LOG} ${reclaimed} restored group(s) recognized`);
  }

  dbg("reclaimGroups", {
    reclaimed,
    savedMap: { ...map },
    groups: [...window.gBrowser.tabGroups].map(g => ({
      id: g.id,
      label: g.label,
      key: g.getAttribute(KEY_ATTR),
      space: g.getAttribute(SPACE_ATTR),
      isFolder: !!g.isZenFolder,
      tabs: g.tabs?.length ?? 0,
    })),
  });
}

function removeEmptyGroups() {
  for (const g of [...window.gBrowser.tabGroups]) {
    if (isOurGroup(g) && !g.tabs.length) {
      g.remove();
    }
  }
}

// ---------------------------------------------------------------------------
// Visual finishing
// ---------------------------------------------------------------------------

const COUNT_ATTR = "zstg-hidden-count";

/**
 * Writes on the group how many tabs stay hidden while it is collapsed, for the CSS
 * to display. It counts hidden tabs, not group tabs: the active tab stays visible
 * in a collapsed group and is therefore discounted.
 *
 * An attribute is the loosest possible coupling to the browser component — if the
 * internal structure changes, we lose the display, never the organization.
 */
function updateHiddenCount(group) {
  if (!isOurGroup(group)) {
    return;
  }
  if (!group.collapsed) {
    group.removeAttribute(COUNT_ATTR);
    group.querySelector(".tab-group-label")?.removeAttribute(COUNT_ATTR);
    return;
  }
  const tabs = [...(group.tabs ?? [])];
  const activeTab = window.gBrowser.selectedTab;
  const hidden = tabs.filter(t => t !== activeTab).length;
  // The attribute also goes on the label because `attr()` only sees attributes of
  // the element owning the pseudo-element — writing it only on the group produced
  // a visible, empty counter.
  const labelEl = group.querySelector(".tab-group-label");
  if (hidden > 0) {
    group.setAttribute(COUNT_ATTR, String(hidden));
    labelEl?.setAttribute(COUNT_ATTR, String(hidden));
  } else {
    group.removeAttribute(COUNT_ATTR);
    labelEl?.removeAttribute(COUNT_ATTR);
  }
}

function updateHiddenCounts() {
  for (const g of window.gBrowser.tabGroups) {
    updateHiddenCount(g);
  }
}

// ---------------------------------------------------------------------------
// Focus mode
// ---------------------------------------------------------------------------

/** Groups by recent use, most recent first. Ids only, so we hold no nodes. */
let recentGroups = [];

function applyFocusMode() {
  if (!cfg().focusMode) {
    return;
  }
  const activeTab = window.gBrowser.selectedTab;
  const activeGroup = activeTab?.group;

  // A tab outside any group does not tear down your context: nothing is collapsed.
  if (!isOurGroup(activeGroup)) {
    return;
  }

  recentGroups = [
    activeGroup.id,
    ...recentGroups.filter(id => id !== activeGroup.id),
  ];

  // The N most recent stay open. With N = 1 the behavior is the old one; above
  // that, moving between recent groups no longer shifts the sidebar.
  const keep = new Set(recentGroups.slice(0, cfg().focusKeep));

  const spaceId = spaceOfTab(activeTab);
  for (const g of window.gBrowser.tabGroups) {
    if (!isOurGroup(g) || g.getAttribute(SPACE_ATTR) !== spaceId) {
      continue;
    }
    const shouldCollapse = !keep.has(g.id);
    if (g.collapsed !== shouldCollapse) {
      g.collapsed = shouldCollapse;
    }
  }
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function currentSpace() {
  return window.gZenWorkspaces?.activeWorkspace ?? null;
}

function regroup() {
  return guarded(() => {
    const spaceId = currentSpace();
    if (!spaceId) {
      return 0;
    }
    const targets = [...window.gBrowser.tabs].filter(
      t => spaceOfTab(t) === spaceId && isEligible(t)
    );
    reclaimGroups({ prune: true });
    for (const t of targets) {
      organize(t, true);
    }
    removeEmptyGroups();
    updateHiddenCounts();
    console.log(`${LOG} regroup: ${targets.length} tabs evaluated in Space ${spaceId}`);
    return targets.length;
  });
}

function ungroup() {
  return guarded(() => {
    const spaceId = currentSpace();
    if (!spaceId) {
      return 0;
    }
    let n = 0;
    for (const g of [...window.gBrowser.tabGroups]) {
      if (!isOurGroup(g) || g.getAttribute(SPACE_ATTR) !== spaceId) {
        continue;
      }
      for (const t of [...g.tabs]) {
        window.gBrowser.ungroupTab(t);
        n++;
      }
      g.remove();
    }
    console.log(`${LOG} ungroup: ${n} tabs released in Space ${spaceId}`);
    return n;
  });
}

/**
 * Adopts unmarked plain groups whose tabs all produce the same key. It exists to
 * migrate groups created by earlier versions, which would otherwise be stranded:
 * without `zstg-key` they are neither reused, nor styled when collapsed, nor
 * touched by ungroup.
 *
 * Requiring that ALL tabs agree on the key is what prevents hijacking a thematic
 * group you created yourself.
 */
function recoverOldGroups() {
  return guarded(() => {
    const spaceId = currentSpace();
    const reclaimed = [];

    for (const g of window.gBrowser.tabGroups) {
      if (g.isZenFolder || g.hasAttribute("split-view-group")) {
        continue;
      }
      if (g.hasAttribute(KEY_ATTR)) {
        continue;
      }
      const tabs = [...(g.tabs ?? [])];
      if (!tabs.length) {
        continue;
      }
      const space = spaceOfTab(tabs[0]);
      if (space !== spaceId) {
        continue;
      }
      const keys = new Set(tabs.map(t => keyFromTab(t)?.key ?? null));
      if (keys.size !== 1) {
        continue;
      }
      const key = [...keys][0];
      if (!key) {
        continue;
      }
      markAsOurs(g, key, space);
      reclaimed.push({ id: g.id, label: g.label, key });
    }

    console.log(`${LOG} recoverOldGroups: ${reclaimed.length} group(s)`, reclaimed);
    dbg("recoverOldGroups", { reclaimed });
    return reclaimed;
  });
}

/**
 * Renames the active tab's group. The name is only a label: identity comes from
 * the `zstg-key` attribute, so renaming never breaks matching by key.
 */
function renameGroup(newLabel) {
  return guarded(() => {
    const g = window.gBrowser.selectedTab?.group;
    if (!isOurGroup(g)) {
      console.warn(`${LOG} the active tab is not in a Spacekeeper group`);
      return null;
    }
    if (typeof newLabel !== "string" || !newLabel.trim()) {
      return g.label;
    }
    const before = g.label;
    g.label = newLabel.trim();
    dbg("renamed", { key: g.getAttribute(KEY_ATTR), before, after: g.label });
    return g.label;
  });
}

function promptRename() {
  const g = window.gBrowser.selectedTab?.group;
  if (!isOurGroup(g)) {
    return;
  }
  const field = { value: g.label ?? "" };
  const ok = Services.prompt.prompt(
    window,
    t("rename.title"),
    t("rename.field"),
    field,
    null,
    {}
  );
  if (ok) {
    renameGroup(field.value);
  }
}

function setCollapsed(collapsed) {
  return guarded(() => {
    const spaceId = currentSpace();
    let n = 0;
    for (const g of window.gBrowser.tabGroups) {
      if (isOurGroup(g) && g.getAttribute(SPACE_ATTR) === spaceId) {
        g.collapsed = collapsed;
        updateHiddenCount(g);
        n++;
      }
    }
    return n;
  });
}

// ---------------------------------------------------------------------------
// Lifecycle: update and uninstall, driven from the panel
// ---------------------------------------------------------------------------

const REPO = "thiago-zampronio/zen-spacekeeper";

// Kept equal to the installers' file lists; verify.ps1 fails if they disagree.
// The fetch happens HERE, in the chrome script, never in the panel document —
// the panel's CSP stays exactly as strict as it is.
const UPDATE_FILES = [
  ["src/zen-space-tab-groups.uc.mjs", "chrome/JS/zen-space-tab-groups.uc.mjs"],
  ["src/zen-space-tab-groups.uc.css", "chrome/CSS/zen-space-tab-groups.uc.css"],
  ["src/resources/zstg-panel.html", "chrome/resources/zstg-panel.html"],
  ["src/resources/zstg-i18n.mjs", "chrome/resources/zstg-i18n.mjs"],
  ["src/resources/zstg-core.mjs", "chrome/resources/zstg-core.mjs"],
];
const LOADER_SOURCES = [
  ["vendor/fx-autoconfig/program/config.js", "config.js"],
  ["vendor/fx-autoconfig/program/defaults/pref/config-prefs.js", "defaults/pref/config-prefs.js"],
];

function profilePath(relative) {
  return PathUtils.join(PathUtils.profileDir, ...relative.split("/"));
}

/**
 * The single deliberate exception to "nothing touches the network": one request,
 * in direct response to the user's click in the panel, for the latest RELEASE —
 * never a moving branch. A check downloads nothing but the version.
 */
async function checkForUpdate() {
  const r = await window.fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!r.ok) {
    throw new Error(`HTTP ${r.status}`);
  }
  const release = await r.json();
  const tag = String(release.tag_name ?? "");
  dbg("updateCheck", { tag });
  return { tag, version: tag.replace(/^v/, "") };
}

async function fetchRaw(tag, path) {
  const r = await window.fetch(`https://raw.githubusercontent.com/${REPO}/${tag}/${path}`);
  if (!r.ok) {
    throw new Error(`${path}: HTTP ${r.status}`);
  }
  return r.text();
}

/**
 * All-or-nothing: every file lands in a staging directory first, and only then
 * replaces the installed ones — a half-fetched update must leave the previous
 * install untouched. Only profile-side files are ever written; a release that
 * also changed the loader is reported, because the application directory belongs
 * to the installer, where a human is present to grant privilege.
 */
async function applyUpdate(tag) {
  const staging = profilePath("spacekeeper-staging");
  await IOUtils.makeDirectory(staging, { ignoreExisting: true });
  const fetched = [];
  for (const [src, dest] of UPDATE_FILES) {
    const text = await fetchRaw(tag, src);
    const stagePath = PathUtils.join(staging, dest.replace(/\//g, "_"));
    await IOUtils.writeUTF8(stagePath, text);
    fetched.push([stagePath, dest]);
  }

  // The loader comparison reads the release and the installed application
  // directory (GreD); nothing there is ever written from here.
  let loaderChanged = false;
  const appDir = Services.dirsvc.get("GreD", Ci.nsIFile).path;
  for (const [src, installedRel] of LOADER_SOURCES) {
    const releaseText = await fetchRaw(tag, src);
    let installedText = null;
    try {
      installedText = await IOUtils.readUTF8(
        PathUtils.join(appDir, ...installedRel.split("/"))
      );
    } catch {
      loaderChanged = true;
    }
    if (installedText !== null && installedText !== releaseText) {
      loaderChanged = true;
    }
  }

  for (const [stagePath, dest] of fetched) {
    await IOUtils.move(stagePath, profilePath(dest));
  }
  await IOUtils.remove(staging, { recursive: true, ignoreAbsent: true });

  // A guard cache that matches the (unchanged) loader gets its date refreshed,
  // so the restore notification keeps naming a meaningful date.
  if (!loaderChanged && (await IOUtils.exists(profilePath("spacekeeper/guard.sh")).catch(() => false) ||
      await IOUtils.exists(profilePath("spacekeeper/guard.ps1")).catch(() => false))) {
    await IOUtils.writeUTF8(
      profilePath("spacekeeper/cache-date"),
      new Date().toISOString().slice(0, 10)
    ).catch(() => {});
  }

  dbg("updated", { tag, files: fetched.length, loaderChanged });
  return { updated: fetched.length, loaderChanged };
}

function runProcess(executable, args) {
  return new Promise((resolve, reject) => {
    try {
      const file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
      file.initWithPath(executable);
      const proc = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);
      proc.init(file);
      proc.runAsync(args, args.length, {
        observe(_subject, topic) {
          if (topic === "process-finished") {
            resolve();
          } else {
            reject(new Error(topic));
          }
        },
      });
    } catch (ex) {
      reject(ex);
    }
  });
}

/**
 * Removes everything Spacekeeper put in the profile: the mod files and, when
 * installed, the guard — through the guard's own removal, so the installer's
 * uninstall, the panel's uninstall and the self-disarm all leave the same
 * machine behind. The loader stays (other mods may use it); the preferences
 * stay (a reinstall finds the configuration). The running session keeps
 * working: these files are only read at startup.
 */
async function uninstallSelf() {
  for (const [, dest] of UPDATE_FILES) {
    await IOUtils.remove(profilePath(dest), { ignoreAbsent: true });
  }
  const guardSh = profilePath("spacekeeper/guard.sh");
  const guardPs = profilePath("spacekeeper/guard.ps1");
  try {
    if (await IOUtils.exists(guardSh)) {
      await runProcess("/bin/sh", [guardSh, "--remove"]);
    } else if (await IOUtils.exists(guardPs)) {
      await runProcess(
        "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
        ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", guardPs, "-Remove"]
      );
    }
  } catch (ex) {
    dbg("guardRemovalFailed", { error: String(ex) });
  }
  await IOUtils.remove(profilePath("spacekeeper"), { recursive: true, ignoreAbsent: true });
  dbg("uninstalled", {});
  return true;
}

/**
 * Dissolves every group of ours, in every Space — no tab closes, no tab changes
 * Space. Used only by the clean-handover reset: after an update it guarantees no
 * group survives carrying a previous version's structure, and after an uninstall
 * it leaves no orphaned markings behind.
 */
function ungroupAllOurs() {
  let n = 0;
  for (const g of [...window.gBrowser.tabGroups]) {
    if (!isOurGroup(g)) {
      continue;
    }
    for (const t of [...g.tabs]) {
      window.gBrowser.ungroupTab(t);
      n++;
    }
    g.remove();
  }
  saveGroupMap({});
  if (_cfg) {
    _cfg.groups = {};
  }
  return n;
}

/**
 * The clean handover: dissolve our groups everywhere, then restart with the
 * startup cache invalidated (fx-autoconfig's own utility). Returns false when
 * the utility is unavailable, and the panel shows the manual steps instead.
 */
function resetAndRestart() {
  // Availability is checked BEFORE anything is dissolved: `false` must always
  // mean "nothing happened", because the panel answers it with manual steps
  // that assume the groups and the cache are still intact.
  const restart = window.UC_API?.Runtime?.restart;
  if (typeof restart !== "function") {
    return false;
  }
  guarded(ungroupAllOurs);
  dbg("resetAndRestart", {});
  return restart(true);
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

const scheduled = new Set();

/** On TabOpen the tab is usually still at about:blank — evaluate it later. */
function schedule(tab) {
  if (scheduled.has(tab)) {
    return;
  }
  scheduled.add(tab);
  window.setTimeout(() => {
    scheduled.delete(tab);
    guarded(() => organize(tab));
  }, 120);
}

const lastKey = new WeakMap();

const progressListener = {
  onLocationChange(browser, _webProgress, _request, _location, flags) {
    // Ignore anchor/hash changes: they do not change the site
    const SAME_DOC =
      globalThis.Ci?.nsIWebProgressListener?.LOCATION_CHANGE_SAME_DOCUMENT ?? 0x1;
    if (flags & SAME_DOC) {
      return;
    }
    const tab = window.gBrowser.getTabForBrowser(browser);
    if (!tab) {
      return;
    }
    const next = keyFromTab(tab)?.key ?? null;
    if (lastKey.get(tab) === next) {
      return;
    }
    lastKey.set(tab, next);
    guarded(() => organize(tab));
  },
};

function onTabOpen(e) {
  schedule(e.target);
}

/**
 * The favicon is almost never ready when the group is born — the log showed
 * `icon: null` on every creation. This is the second moment the spec calls for:
 * when the icon arrives, derive the color for the key if it does not have one yet.
 */
function onTabAttrModified(e) {
  if (!e.detail?.changed?.includes("image")) {
    return;
  }
  const tab = e.target;
  const group = tab.group;
  if (!isOurGroup(group)) {
    return;
  }
  const key = group.getAttribute(KEY_ATTR);
  if (!key || cfg().colors[key]) {
    return;
  }
  guarded(() => applyFaviconColor(group, tab, key));
}

function onTabClose() {
  window.setTimeout(() => {
    guarded(removeEmptyGroups);
    guarded(updateHiddenCounts);
  }, 0);
}

function onTabSelect() {
  guarded(applyFocusMode);
  // The active tab is not counted as hidden, so switching tabs changes the number
  // being displayed.
  guarded(updateHiddenCounts);
}

/** Covers the label click, the commands and focus mode in one place. */
function onGroupCollapseChanged(e) {
  const g = e.target;
  window.setTimeout(() => guarded(() => updateHiddenCount(g)), 0);
}

const prefObserver = {
  observe(_subject, _topic, data) {
    _cfg = null;
    // A failed write disables logging only until the pref is next touched:
    // toggling it is the natural "try again" gesture, and the log exists
    // precisely for the moments things are going wrong.
    if (data === PREF_PREFIX + "debugLog") {
      logUnavailable = false;
    }
    // The language is resolved once and memoized; changing it has to invalidate
    // that too, or the panel would save the choice and nothing would change.
    if (data === PREF_PREFIX + "locale") {
      _t = null;
      // The menu was built with the previous labels; rebuilding is what makes
      // the change visible without restarting the browser.
      try {
        removeMenu();
        createMenu();
      } catch (ex) {
        console.warn(`${LOG} could not rebuild the menu:`, ex);
      }
    }
  },
};

// ---------------------------------------------------------------------------
// Self-test
// ---------------------------------------------------------------------------

/**
 * Covers what can be verified without touching the user's tabs: key derivation,
 * rule precedence, exclusions and tolerance to invalid configuration.
 * The scenarios that require opening tabs in different Spaces live in the manual
 * checklist in the README — they cannot be simulated without altering the real session.
 */
function selfTest() {
  // The deterministic derivation cases live in zstg-core.mjs and also run under
  // node in verify.ps1. Here they run against the REAL Services.eTLD — the same
  // list, two judges, and a case passing in only one of them is itself a finding.
  //
  // Every field the derivation reads is overridden by `noRules`. Without
  // `subdomainDomains`, the user's real configuration leaked into the cases and a
  // deterministic test started depending on the environment.
  const noRules = {
    rules: [],
    excluded: [],
    groupBySubdomain: false,
    subdomainDomains: [],
    subdomainLabel: "host",
  };
  const cases = runDerivationTests((url, over) =>
    keyFromText(url, { ...noRules, ...over })
  );
  const check = (name, actual, expected) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    cases.push({ name, ok, actual, expected });
  };

  // ---- Invariants against the real state of the window ----
  // These are not made-up examples: they check what is on screen right now, and
  // therefore catch regressions a table of cases cannot.

  const ours = [...window.gBrowser.tabGroups].filter(isOurGroup);

  check(
    "every group of ours declares key and Space",
    ours.every(g => g.getAttribute(KEY_ATTR) && g.getAttribute(SPACE_ATTR)),
    true
  );

  const pairs = ours.map(
    g => `${g.getAttribute(SPACE_ATTR)}|${g.getAttribute(KEY_ATTR)}`
  );
  check(
    "no duplicated (Space, key) pair",
    pairs.length === new Set(pairs).size,
    true
  );

  check(
    "no tab lives in a group from another Space",
    ours.every(g =>
      [...(g.tabs ?? [])].every(t => spaceOfTab(t) === g.getAttribute(SPACE_ATTR))
    ),
    true
  );

  check(
    "no group of ours is empty",
    ours.every(g => (g.tabs?.length ?? 0) > 0),
    true
  );

  check(
    "displayed count matches hidden tabs",
    ours.every(g => {
      const attr = g.querySelector(".tab-group-label")?.getAttribute(COUNT_ATTR);
      if (!g.collapsed) {
        return !attr;
      }
      const hidden = [...(g.tabs ?? [])].filter(
        t => t !== window.gBrowser.selectedTab
      ).length;
      return hidden ? Number(attr) === hidden : !attr;
    }),
    true
  );

  check(
    "Zen folders never get our marking",
    [...window.gBrowser.tabGroups]
      .filter(g => g.isZenFolder)
      .every(g => !g.hasAttribute(KEY_ATTR)),
    true
  );

  // With derivation off, a new key must fall back to the hash
  const unseenKey = `domain:zzz-teste-${cfg().minTabs}`;
  check(
    "key without registered color resolves by hash",
    COLORS.includes(colorFor(unseenKey)),
    true
  );
  check(
    "reading a hashed color persists nothing",
    cfg().colors[unseenKey] ?? null,
    null
  );

  const failures = cases.filter(c => !c.ok);
  console.log(
    `${LOG} self-test: ${cases.length - failures.length}/${cases.length} passed`
  );
  for (const f of failures) {
    console.error(`${LOG} FAILED "${f.name}": actual`, f.actual, "expected", f.expected);
  }
  return { total: cases.length, failures: failures.length, cases };
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

function inspect() {
  return {
    version: VERSION,
    config: cfg(),
    activeSpace: currentSpace(),
    tabs: [...window.gBrowser.tabs].map(t => ({
      title: t.label,
      space: spaceOfTab(t),
      key: keyFromTab(t)?.key ?? null,
      isEligible: isEligible(t),
      group: t.group?.getAttribute(KEY_ATTR) ?? t.group?.label ?? null,
    })),
    groups: [...window.gBrowser.tabGroups].map(g => ({
      label: g.label,
      key: g.getAttribute(KEY_ATTR),
      space: g.getAttribute(SPACE_ATTR),
      ours: isOurGroup(g),
      isFolder: !!g.isZenFolder,
      tabs: g.tabs.length,
      collapsed: !!g.collapsed,
    })),
  };
}

// ---------------------------------------------------------------------------
// Space-scoped tab switching
// ---------------------------------------------------------------------------

let originalSwitch = null;

/** Browsers whose tabs belong to the active Space (essentials count everywhere). */
function browsersInCurrentSpace() {
  const spaceId = currentSpace();
  const out = [];
  for (const tab of window.gBrowser.tabs) {
    const browser = tab.linkedBrowser;
    if (!browser) {
      continue;
    }
    const tabSpace = spaceOfTab(tab);
    const essential =
      tab.hasAttribute("zen-essential") || tab.hasAttribute("essential");
    // In this version of Zen, essential tabs carry a Space id. They only count as
    // a destination when they declare no Space or declare the current one — an
    // essential from another Space is exactly what used to drag the user there.
    if (tabSpace === spaceId || (essential && !tabSpace)) {
      out.push(browser);
    }
  }
  return out;
}

/**
 * Zen changed `URILoadingHelper.switchToTabHavingURI` to scan
 * `gZenWorkspaces.allUsedBrowsers`, which includes tabs from every Space — hence
 * the jump between Spaces. Instead of reimplementing the switch (and with it URI
 * comparison, private windows, cross-window adoption and split view), the wrapper
 * merely narrows that set during the call and delegates.
 *
 * A welcome side effect: with no candidate in the current Space, the original
 * function does what it would do if the tab did not exist — opens here when
 * allowed, and reports "did not switch" when not. The caller contract comes free.
 */
function installSpaceScopedSwitch() {
  if (originalSwitch) {
    return;
  }
  const original = window.switchToTabHavingURI;
  if (typeof original !== "function") {
    console.warn(`${LOG} switchToTabHavingURI missing; space-scoped switch not installed`);
    return;
  }
  originalSwitch = original;

  window.switchToTabHavingURI = function (...args) {
    if (!cfg().spaceScopedTabSwitch) {
      return original.apply(this, args);
    }

    const spaces = window.gZenWorkspaces;
    let candidates;
    try {
      if (!spaces || !("allUsedBrowsers" in spaces) || !currentSpace()) {
        return original.apply(this, args);
      }
      candidates = browsersInCurrentSpace();
    } catch (ex) {
      console.error(`${LOG} space filter failed, delegating to native:`, ex);
      return original.apply(this, args);
    }

    // The shadowing below only holds while `original` reads `allUsedBrowsers`
    // SYNCHRONOUSLY during this call. If Zen ever makes the switch async, the
    // property is restored before the read and the wrapper silently reverts to
    // native (all-Spaces) behavior.
    const previous = Object.getOwnPropertyDescriptor(spaces, "allUsedBrowsers");
    Object.defineProperty(spaces, "allUsedBrowsers", {
      value: candidates,
      configurable: true,
    });
    const spaceBefore = currentSpace();
    let result;
    try {
      result = original.apply(this, args);
      return result;
    } finally {
      if (previous) {
        Object.defineProperty(spaces, "allUsedBrowsers", previous);
      } else {
        delete spaces.allUsedBrowsers;
      }
      dbg("switchToTabHavingURI", {
        host: hostOnly(args[0]?.spec ?? args[0] ?? ""),
        spaceBefore,
        spaceAfter: currentSpace(),
        changedSpace: spaceBefore !== currentSpace(),
        candidates: candidates.length,
        totalTabs: window.gBrowser.tabs.length,
        switched: result,
      });
    }
  };
}

function uninstallSpaceScopedSwitch() {
  if (originalSwitch) {
    window.switchToTabHavingURI = originalSwitch;
    originalSwitch = null;
  }
}

// ---------------------------------------------------------------------------
// about:spacekeeper
// ---------------------------------------------------------------------------

const PANEL_URL = "chrome://userchrome/content/zstg-panel.html";
const PANEL_CONTRACT = "@mozilla.org/network/protocol/about;1?what=spacekeeper";
const PANEL_CID = Components.ID("{7b1f5c40-9a2e-4d31-8f6a-2c0e5d7a4b11}");

let panelRegistered = false;
let panelFactory = null;

/**
 * Registers `about:spacekeeper` pointing at the page under chrome://userchrome/.
 *
 * The page loads with UI privilege so it can read and write prefs without a bridge
 * between processes. The price is documented in the design: a script on that page
 * has full power over the browser, which is why it is local and never touches the network.
 */
function registerPanel() {
  if (panelRegistered) {
    return;
  }
  const registrar = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);

  if (registrar.isCIDRegistered(PANEL_CID)) {
    panelRegistered = true; // another window already registered it
    return;
  }

  // If the contract already resolves, someone (Zen, an update) took the address.
  if (Cc[PANEL_CONTRACT]) {
    console.warn(`${LOG} about:spacekeeper is already registered by another component`);
    dbg("panelAddressTaken", {});
    return;
  }

  const aboutModule = {
    QueryInterface: ChromeUtils.generateQI(["nsIAboutModule"]),
    newChannel(uri, loadInfo) {
      const channel = Services.io.newChannelFromURIWithLoadInfo(
        Services.io.newURI(PANEL_URL),
        loadInfo
      );
      channel.originalURI = uri;
      return channel;
    },
    getURIFlags() {
      const F = Ci.nsIAboutModule;
      // No SAFE_FOR_UNTRUSTED_CONTENT on purpose: the page is UI, not content.
      // IS_SECURE_CHROME_UI does not exist in every version.
      return F.ALLOW_SCRIPT | (F.IS_SECURE_CHROME_UI ?? 0);
    },
    getChromeURI() {
      return Services.io.newURI(PANEL_URL);
    },
  };

  panelFactory = {
    QueryInterface: ChromeUtils.generateQI(["nsIFactory"]),
    createInstance(iid) {
      return aboutModule.QueryInterface(iid);
    },
  };

  try {
    registrar.registerFactory(
      PANEL_CID,
      "Zen Space Tab Groups — panel",
      PANEL_CONTRACT,
      panelFactory
    );
    panelRegistered = true;
    dbg("panelRegistered", { url: PANEL_URL });
  } catch (ex) {
    console.error(`${LOG} could not register about:spacekeeper:`, ex);
  }
}

function unregisterPanel() {
  if (!panelRegistered || !panelFactory) {
    return;
  }
  // Only the last browser window tears the registration down: unregistering while
  // other windows live would break about:spacekeeper in all of them. If the
  // registering window closes first, the registration deliberately outlives it —
  // only this window holds the factory, and the chrome URL it points at stays valid.
  for (const w of Services.wm.getEnumerator("navigator:browser")) {
    if (w !== window && !w.closed) {
      return;
    }
  }
  try {
    Components.manager
      .QueryInterface(Ci.nsIComponentRegistrar)
      .unregisterFactory(PANEL_CID, panelFactory);
  } catch (ex) {
    console.warn(`${LOG} failed to unregister the panel: ${ex}`);
  }
  panelFactory = null;
  panelRegistered = false;
}

function openPanel() {
  window.gBrowser.selectedTab = window.gBrowser.addTrustedTab("about:spacekeeper");
}

// ---------------------------------------------------------------------------
// UI: context menu and hotkeys
// ---------------------------------------------------------------------------

const MENU_ID = "zstg-menu";

/*
 * A function and not a constant: the labels are resolved when the menu is built,
 * so switching the language in the panel is enough — no restart, no rebuild.
 */
const menuItems = () => [
  [t("menu.preferences"), () => openPanel()],
  [t("menu.rename"), () => promptRename()],
  [t("cmd.regroup"), () => regroup()],
  [t("cmd.ungroup"), () => ungroup()],
  [t("cmd.collapse"), () => setCollapsed(true)],
  [t("cmd.expand"), () => setCollapsed(false)],
];

/*
 * Two menus, because there are two natural clicks: the one on a tab
 * (`tabContextMenu`) and the one on the empty area of the sidebar
 * (`toolbar-context-menu`) — the latter is where people click to act on a group.
 */
const MENU_POPUPS = ["tabContextMenu", "toolbar-context-menu"];

function createMenu() {
  for (const popupId of MENU_POPUPS) {
    const popup = document.getElementById(popupId);
    const id = `${MENU_ID}-${popupId}`;
    if (!popup || document.getElementById(id)) {
      continue;
    }
    const menu = document.createXULElement("menu");
    menu.id = id;
    menu.setAttribute("label", t("menu.root"));

    const mp = document.createXULElement("menupopup");
    for (const [labelEl, fn] of menuItems()) {
      const item = document.createXULElement("menuitem");
      item.setAttribute("label", labelEl);
      item.addEventListener("command", fn);
      mp.appendChild(item);
    }
    menu.appendChild(mp);
    popup.appendChild(menu);
  }
}

function removeMenu() {
  for (const popupId of MENU_POPUPS) {
    document.getElementById(`${MENU_ID}-${popupId}`)?.remove();
  }
}

/**
 * Default hotkeys: Ctrl+Alt+A regroups, Ctrl+Alt+D ungroups.
 * attachToWindow (and not autoAttach) because this script already runs once per
 * window — autoAttach would register the same hotkey over and over.
 */
function registerHotkeys() {
  const H = window.UC_API?.Hotkeys;
  if (!H) {
    console.warn(`${LOG} UC_API.Hotkeys unavailable; hotkeys not registered`);
    return;
  }
  const hotkeyDefs = [
    { id: "zstg-regroup", key: "A", command: () => regroup() },
    { id: "zstg-ungroup", key: "D", command: () => ungroup() },
  ];
  for (const d of hotkeyDefs) {
    if (document.getElementById(d.id)) {
      continue;
    }
    try {
      H.define({ ...d, modifiers: "accel alt" }).attachToWindow(window);
    } catch (ex) {
      console.warn(`${LOG} hotkey ${d.id} not registered: ${ex.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

/**
 * The mod is deliberately defensive — optional chaining and try/catch everywhere —
 * so when Zen renames an internal, features degrade without a single line in the
 * console. This is the one loud moment: after startup, every point of the Zen
 * contract is probed, and whatever is missing gets named in ONE error (a Zen
 * refactor must not flood the console). Silence means the contract holds.
 */
function checkZenContract() {
  const spaces = window.gZenWorkspaces;
  const probes = {
    "gZenWorkspaces": !!spaces,
    "gZenWorkspaces.workspaceElement()": typeof spaces?.workspaceElement === "function",
    "gZenWorkspaces.activeWorkspace": !!currentSpace(),
    "gZenWorkspaces.allUsedBrowsers": !!spaces && "allUsedBrowsers" in spaces,
    "gBrowser.addTabGroup()": typeof window.gBrowser?.addTabGroup === "function",
    "gBrowser.tabGroups": !!window.gBrowser?.tabGroups?.[Symbol.iterator],
    "switchToTabHavingURI()": typeof (originalSwitch ?? window.switchToTabHavingURI) === "function",
    "UC_API.Hotkeys": !!window.UC_API?.Hotkeys,
  };
  const missing = Object.keys(probes).filter(name => !probes[name]);
  if (missing.length) {
    console.error(
      `${LOG} ${VERSION}: the Zen contract is broken — missing: ${missing.join(", ")}. ` +
        `A Zen update likely changed internals this mod depends on.`
    );
    dbg("contractBroken", { missing });
  }
  return missing;
}

async function whenReady() {
  if (!window.gBrowserInit?.delayedStartupFinished) {
    await new Promise(resolve => {
      const obs = subject => {
        if (subject === window) {
          Services.obs.removeObserver(obs, "browser-delayed-startup-finished");
          resolve();
        }
      };
      Services.obs.addObserver(obs, "browser-delayed-startup-finished");
    });
  }
  // Spaces are assembled after session restore
  for (let i = 0; i < 100 && !currentSpace(); i++) {
    await new Promise(r => window.setTimeout(r, 100));
  }
}

async function start() {
  declareDefaults();
  await whenReady();

  guarded(reclaimGroups);
  // Zen restores tabs and groups after this point; the delayed passes reach what
  // did not exist yet.
  for (const delay of [1000, 3000, 8000]) {
    window.setTimeout(() => guarded(reclaimGroups), delay);
  }
  // The binding map's only housekeeping used to be the manual regroup command;
  // whoever never ran it accumulated dead ids forever. One restore-safe prune per
  // session: 60s is a wide margin past the recognition passes above, and pruning
  // any earlier is exactly what "Group binding survives restore" forbids — during
  // startup a prune once erased the very map that recognizes restored groups.
  window.setTimeout(() => guarded(() => reclaimGroups({ prune: true })), 60000);

  const container = window.gBrowser.tabContainer;
  container.addEventListener("TabOpen", onTabOpen);
  container.addEventListener("TabClose", onTabClose);
  container.addEventListener("TabSelect", onTabSelect);
  container.addEventListener("TabAttrModified", onTabAttrModified);
  container.addEventListener("TabGroupCollapse", onGroupCollapseChanged);
  container.addEventListener("TabGroupExpand", onGroupCollapseChanged);
  window.gBrowser.addTabsProgressListener(progressListener);
  Services.prefs.addObserver(PREF_PREFIX, prefObserver);

  createMenu();
  registerHotkeys();
  installSpaceScopedSwitch();
  registerPanel();
  checkZenContract();

  window.addEventListener(
    "unload",
    () => {
      container.removeEventListener("TabOpen", onTabOpen);
      container.removeEventListener("TabClose", onTabClose);
      container.removeEventListener("TabSelect", onTabSelect);
      container.removeEventListener("TabAttrModified", onTabAttrModified);
      container.removeEventListener("TabGroupCollapse", onGroupCollapseChanged);
      container.removeEventListener("TabGroupExpand", onGroupCollapseChanged);
      window.gBrowser.removeTabsProgressListener(progressListener);
      Services.prefs.removeObserver(PREF_PREFIX, prefObserver);
      removeMenu();
      uninstallSpaceScopedSwitch();
      unregisterPanel();
    },
    { once: true }
  );

  console.log(
    `${LOG} ${VERSION} ready — active Space ${currentSpace()}, ` +
      `grouping ${cfg().enabled ? "on" : "off"}, minTabs ${cfg().minTabs}`
  );

  const spaces = window.gZenWorkspaces;
  dbg("started", {
    version: VERSION,
    activeSpace: currentSpace(),
    spaceName: spaces?.getWorkspaceFromId?.(currentSpace())?.name ?? null,
    config: { ...cfg(), colors: undefined, groups: undefined },
    totalTabs: window.gBrowser.tabs.length,
    totalGroups: [...window.gBrowser.tabGroups].length,
  });
}

// Nothing starts without the core: half a mod that silently drops commands would
// be worse than a dead one that said why (the import failure above already did).
if (core) {
  window.ZSTG = {
    version: VERSION,
    inspect,
    selfTest,
    keyFromText,
    regroup,
    ungroup,
    recoverOldGroups,
    renameGroup,
    collapseAll: () => setCollapsed(true),
    expandAll: () => setCollapsed(false),
    keyFromTab,
    checkForUpdate,
    applyUpdate,
    uninstallSelf,
    resetAndRestart,
    reloadConfig: () => {
      _cfg = null;
      _t = null;
      return cfg();
    },
  };

  start();
}
