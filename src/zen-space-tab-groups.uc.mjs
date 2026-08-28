// ==UserScript==
// @name           Spacekeeper
// @description    Automatic tab grouping by site, scoped to Zen Spaces
// @version        0.60.0
// ==/UserScript==

const LOG = "[ZSTG]";
// Kept in step with @version above by verify.mjs. It was duplicated as a literal
// in four places and drifted: inspect() reported 0.2.0 while the script was 0.16.0,
// so the one number people are asked for when reporting a problem was wrong.
const VERSION = "0.60.0";
const KEY_ATTR = "zstg-key";
const SPACE_ATTR = "zen-workspace-id";
const PREF_PREFIX = "zen.stg.";

// The pure logic — key derivation, rules, colors, the deterministic test cases —
// lives in zstg-core.mjs, so verify.mjs can run it under plain node on every
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
  SYSTEM_SCHEMES,
  parseRules,
  hashColor,
  rgbToHsl,
  colorName,
  keyFromParts,
  runDerivationTests,
  isNewerVersion,
  latestRelease,
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
  // How long focus mode waits before collapsing a group that left the recent
  // set; returning to it in time cancels the collapse. 0 restores immediacy.
  focusDelay: 800,
  // Which focus mechanic runs when focusMode is on: "groups" keeps the N most
  // recently used groups open (the original behavior), "idle" retires groups
  // nobody touched for focusIdleMinutes. focusMode itself stays a bool because
  // pref names are stored identity — a pre-strategies profile with focus on
  // lands here on "groups", exactly what it had.
  focusStrategy: "groups",
  focusIdleMinutes: 60,
  // With focus mode on, lift a group to the top of its Space when it becomes
  // active. Off by default: it moves things on the strip, which must be chosen.
  focusReorder: false,
  // The collapse/expand motion preset: "off", "swift", "fold" or "cascade".
  // Settled by a designer-vs-product review under the HIG frequency rule.
  collapseMotion: "swift",
  // Speed of the motion presets, in percent. 100 = the designed timing; lower
  // is slower. Exists as a magnifying glass — at 25% the character of each
  // preset is legible enough to judge — and as taste once judged.
  motionSpeed: 100,
  // Shortly after a window opens, every few hours after that, and when the
  // panel opens, ask GitHub whether a newer release exists — metadata only,
  // never a download — and show the floating update badge over the sidebar
  // when there is one. The second, disclosed exception to the no-network
  // rule; off turns it into zero requests.
  updateCheck: true,
  spaceScopedTabSwitch: true,
  // Internal pages (about:, chrome:) share one System group per Space.
  systemGroup: true,
  // Ungrouped tabs settle below the last group of their Space, where they are
  // findable, instead of staying wedged between groups.
  looseTabsAtBottom: true,
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
  // Marker of the one-shot first-run seed. Stored identity: never rename.
  seeded: false,
};

// ---------------------------------------------------------------------------
// Log file
// ---------------------------------------------------------------------------

const LOG_MAX_BYTES = 1_000_000;
const LOG_TTL_MS = 7 * 24 * 3600 * 1000;

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
/*
 * One prune per session: entries older than a week go. The size cap protects
 * the machine from a runaway file; the TTL keeps it from holding months of
 * stale history — a diagnostic log is about what happened recently.
 */
async function pruneDebugLog() {
  try {
    const path = logPathFor();
    if (!path || !(await IOUtils.exists(path))) {
      return;
    }
    const floor = Date.now() - LOG_TTL_MS;
    const lines = (await IOUtils.readUTF8(path)).split("\n").filter(Boolean);
    const kept = lines.filter(line => {
      const t = /"t":"([^"]+)"/.exec(line)?.[1];
      return t ? Date.parse(t) >= floor : false;
    });
    if (kept.length < lines.length) {
      await IOUtils.writeUTF8(path, kept.join("\n") + (kept.length ? "\n" : ""));
      dbg("logPruned", { entries: lines.length - kept.length, ttlDays: 7 });
    }
  } catch {
    // pruning is hygiene; a failure must never cost the session its log
  }
}

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

/*
 * The recommended experience ships as a one-shot seed of EXPLICIT prefs, never
 * as changed DEFAULTS: defaults are retroactive, and two of these values are
 * dangerous retroactively — subdomainDomains participates in key derivation
 * (a changed fallback would re-key google.com tabs and orphan the groups
 * already on a user's screen), and focusMode would start collapsing strips
 * nobody asked to collapse. The zen.stg.groups guard is what makes updates a
 * no-op for existing profiles: every existing user lacks the marker on the
 * update that ships this, but anyone who ever had a group has the map. The
 * marker is set in both branches, so this runs once per profile, ever.
 */
function seedRecommendedDefaults() {
  const p = Services.prefs;
  if (p.prefHasUserValue(PREF_PREFIX + "seeded")) {
    return;
  }
  if (p.prefHasUserValue(PREF_PREFIX + "groups")) {
    p.setBoolPref(PREF_PREFIX + "seeded", true);
    dbg("seedSkipped", { reason: "existing profile" });
    return;
  }
  p.setBoolPref(PREF_PREFIX + "focusMode", true);
  p.setStringPref(PREF_PREFIX + "focusStrategy", "idle");
  p.setBoolPref(PREF_PREFIX + "focusReorder", true);
  p.setIntPref(PREF_PREFIX + "focusKeep", 10);
  p.setStringPref(PREF_PREFIX + "collapseMotion", "fold");
  p.setStringPref(PREF_PREFIX + "subdomainDomains", "google.com");
  p.setStringPref(PREF_PREFIX + "subdomainLabel", "sub");
  p.setBoolPref(PREF_PREFIX + "seeded", true);
  dbg("seeded", { prefs: 7 });
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

/** Like prefInt, but zero is a meaningful value (e.g. "no delay"), not garbage. */
function prefIntZero(name) {
  try {
    const v = Services.prefs.getIntPref(PREF_PREFIX + name, DEFAULTS[name]);
    return v >= 0 ? v : DEFAULTS[name];
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
    // Clamped to the panel's range: an out-of-range value (a pref poked in
    // about:config, a number typed into the wrong field) silently neuters
    // focus mode — 800 groups kept open means nothing ever collapses.
    focusKeep: Math.min(10, Math.max(1, prefInt("focusKeep"))),
    focusDelay: prefIntZero("focusDelay"),
    focusStrategy: prefStr("focusStrategy") === "idle" ? "idle" : "groups",
    focusIdleMinutes: Math.min(1440, Math.max(1, prefInt("focusIdleMinutes"))),
    focusReorder: prefBool("focusReorder"),
    motionSpeed: Math.min(400, Math.max(25, prefInt("motionSpeed"))),
    updateCheck: prefBool("updateCheck"),
    collapseMotion: (() => {
      const v = prefStr("collapseMotion");
      return ["off", "swift", "fold", "cascade"].includes(v) ? v : DEFAULTS.collapseMotion;
    })(),
    spaceScopedTabSwitch: prefBool("spaceScopedTabSwitch"),
    systemGroup: prefBool("systemGroup"),
    looseTabsAtBottom: prefBool("looseTabsAtBottom"),
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
  if (!uri || (!GROUPABLE_SCHEMES.has(uri.scheme) && !SYSTEM_SCHEMES.has(uri.scheme))) {
    return null;
  }
  // Internal pages have no host; both are read defensively and the core decides.
  let host = "";
  try {
    host = uri.host ?? "";
  } catch {
    host = "";
  }
  let path = "";
  try {
    path = uri.spec.slice(uri.scheme.length + 1).split(/[?#]/)[0];
  } catch {
    path = "";
  }
  const c = over ? { ...cfg(), ...over } : cfg();
  const info = keyFromParts(uri.scheme, host, c, Services.eTLD, path);
  // The core is i18n-free and labels the System group in English; the display
  // label follows the catalog. The key never changes with the language.
  if (info && info.key === "system:") {
    return { key: info.key, label: t("group.system") };
  }
  return info;
}

function keyFromTab(tab) {
  let uri;
  try {
    uri = tab.linkedBrowser?.currentURI;
  } catch {
    return null;
  }
  const info = keyFromURI(uri);
  if (info) {
    return info;
  }
  // Lazy-restored tabs sit on about:blank until activated, but the session
  // remembers where they point — a restored tab is still a tab showing a site,
  // and grouping it must never require loading it. Anything missing here (no
  // SessionStore, no lazy value) degrades to exactly the old behavior.
  try {
    const lazyUrl = window.SessionStore?.getLazyTabValue?.(tab, "url");
    if (lazyUrl) {
      return keyFromText(lazyUrl);
    }
  } catch {
    // fall through
  }
  return null;
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
  const colorAtStart = group.color;
  colorFromFavicon(tab)
    .then(color => {
      if (!color || !group.isConnected || cfg().colors[key]) {
        return;
      }
      // A color the user picked by hand while the favicon was decoding wins:
      // the persisted map lags (recordManualColor runs on the NEXT organize),
      // so the live group color is the only witness of that fresh pick.
      if (group.color && group.color !== colorAtStart) {
        recordManualColor(group);
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
    // A label equal to the derived one modulo case is our old lowercase label;
    // anything else is the user's rename and is never touched.
    // Only the EXACT old all-lowercase derived label is recased: a rename that
    // merely differs in case ("YOUTUBE") is still the user's rename and stays.
    if (target.label === info.label.toLowerCase() && target.label !== info.label) {
      target.label = info.label;
    }
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
  // Birth is the third moment the reorder rides. The anchor above is the tab's
  // own position, and the loose settle has already pushed that tab — still on
  // about:blank when it was evaluated — to the end of the Space: without this,
  // the group the user just opened is the one group guaranteed to be born under
  // the collapsed cluster. Deferred and guarded like the collapse path, so the
  // positions it reads are the ones the browser has finished writing.
  window.setTimeout(() => guarded(() => resettleGroupOrder(group)), 0);
}

/**
 * `zstg-key` lives only on the element and is not part of session data. We store
 * the id -> key link in a pref to recognize the group after a restore; without it
 * a restored group looks like a user group and a second group for the same key
 * ends up being created.
 */
/** The motion preset rides on an attribute: CSS cannot read prefs. */
function stampMotion(group) {
  group.setAttribute("zstg-motion", cfg().collapseMotion);
  calibrateRowCap();
}

/*
 * The stylesheet animates each row's max-height, and the animation only reads as
 * motion if that cap equals the row's real height: every extra pixel is a dead
 * zone the transition spends shrinking invisible headroom, cramming the visible
 * collapse into the tail of the duration. CSS cannot measure, so the script
 * measures one expanded row and publishes it as --zstg-row-cap (+1px so a
 * rounding error never clips the row at rest).
 */
function calibrateRowCap() {
  const root = window.document.documentElement;
  if (root.style.getPropertyValue("--zstg-row-cap")) {
    return;
  }
  for (const g of window.gBrowser.tabGroups) {
    if (!isOurGroup(g) || g.collapsed) {
      continue;
    }
    for (const tab of g.tabs) {
      const h = tab.getBoundingClientRect().height;
      if (h > 8) {
        root.style.setProperty("--zstg-row-cap", `${Math.ceil(h) + 1}px`);
        return;
      }
    }
  }
}

function restampMotionAll() {
  // Re-measured too: a theme or density change is the kind of event that lands
  // together with a motion pref change, and the measurement is one rect read.
  window.document.documentElement.style.removeProperty("--zstg-row-cap");
  for (const g of window.gBrowser.tabGroups) {
    if (isOurGroup(g)) {
      stampMotion(g);
      publishSheetMetrics(g);
    }
  }
}

/*
 * The stylesheet multiplies every preset duration and stagger delay by
 * --zstg-motion-scale. The pref is a speed in percent (100 = the designed
 * timing, lower = slower), so the scale is its inverse: 25% -> 4x longer.
 */
function applyMotionSpeed() {
  window.document.documentElement.style.setProperty(
    "--zstg-motion-scale",
    String(100 / cfg().motionSpeed)
  );
}

function markAsOurs(group, key, spaceId) {
  group.setAttribute(KEY_ATTR, key);
  if (spaceId) {
    group.setAttribute(SPACE_ATTR, spaceId);
  }
  stampMotion(group);
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
      stampMotion(g);
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

/**
 * The current Space's strip in visual order — groups as one entry each, loose
 * tabs as their own. It exists for the moments something "moved on its own": a
 * dump before and after a corrective pass answers exactly who moved what. Also
 * exposed as ZSTG.dumpStrip() for live diagnosis.
 */
function dumpStrip(reason) {
  const spaceId = currentSpace();
  const container = spaceContainer(spaceId);
  if (!container) {
    return [];
  }
  const strip = [];
  for (const node of container.children) {
    if (node.localName === "tab-group") {
      const key =
        node.getAttribute(KEY_ATTR) ?? `manual(${node.label ?? ""})`;
      strip.push(
        `[${key} x${node.tabs?.length ?? 0}${node.collapsed ? " collapsed" : ""}]`
      );
    } else if (node.localName === "tab") {
      strip.push(
        node.hasAttribute("zen-empty-tab")
          ? "(empty)"
          : `loose:${keyFromTab(node)?.key ?? "?"}`
      );
    } else {
      strip.push(`<${node.localName}>`);
    }
  }
  if (reason) {
    dbg("strip", { reason, space: spaceId, strip });
  }
  return strip;
}

/**
 * A group inside a group renders broken: the browser accepts the drop but shows
 * the nested tabs at the parent's level. Reordering is what a group drag should
 * mean, so a system group found nested is restored as a sibling — the native
 * group move when the browser offers it, a rebuild with the ORIGINAL key when it
 * does not (identity, label, color and the manual-color memory all survive: the
 * key carries them). The user's own nested structures are never touched.
 */
function fixNestedGroups(spaceId) {
  for (const g of [...window.gBrowser.tabGroups]) {
    if (!isOurGroup(g) || !g.isConnected) {
      continue;
    }
    if (spaceId && g.getAttribute(SPACE_ATTR) !== spaceId) {
      continue;
    }
    const outer = g.parentElement?.closest("tab-group");
    if (!outer || outer === g) {
      continue;
    }
    const key = g.getAttribute(KEY_ATTR);
    const space = g.getAttribute(SPACE_ATTR);
    const tabs = [...(g.tabs ?? [])];
    // Detection is logged before any action: when a correction misbehaves, the
    // first question is what the detector believed it saw.
    dbg("nestedDetected", {
      key,
      space,
      outer: outer.getAttribute(KEY_ATTR) ?? `manual(${outer.label ?? ""})`,
      tabs: tabs.length,
    });
    if (!key || !space || !tabs.length) {
      continue;
    }
    const label = g.label;
    const color = g.color;

    // The native move first: it preserves the group element itself.
    try {
      const spaceTabs = [...window.gBrowser.tabs].filter(
        t => spaceOfTab(t) === space
      );
      const last = spaceTabs[spaceTabs.length - 1];
      if (last) {
        window.gBrowser.moveTabTo(g, { tabIndex: last._tPos });
      }
    } catch {
      // fall through to the rebuild
    }
    if (!g.parentElement?.closest("tab-group")) {
      dbg("unnested", { key, space, how: "moved" });
      continue;
    }

    // Rebuild: ungrouping momentarily parents the tabs into the outer group;
    // addTabGroup anchored at the container level (the same insertBefore
    // guarantee that keeps everything in its Space) pulls them into a fresh
    // sibling carrying the original identity.
    try {
      for (const t of tabs) {
        window.gBrowser.ungroupTab(t);
      }
      if (g.isConnected) {
        g.remove();
      }
      const anchor = anchorFor(tabs[0], space);
      if (!anchor) {
        continue;
      }
      const rebuilt = window.gBrowser.addTabGroup(tabs, {
        label,
        color,
        insertBefore: anchor,
      });
      if (rebuilt) {
        markAsOurs(rebuilt, key, space);
        dbg("unnested", { key, space, how: "rebuilt" });
      }
    } catch (ex) {
      dbg("unnestFailed", { key, space, error: String(ex) });
    }
  }
}

/**
 * Loose tabs live below the groups: grouping forms islands around whatever was
 * open, and the tabs left out end up wedged between islands — the hardest place
 * to find them. This settles every misplaced loose tab of ONE Space after that
 * Space's last group, preserving their relative order. It runs only at the
 * moments the system already organizes, so a manual drag is not fought in real
 * time; it moves nothing when nothing is misplaced; and it never touches what
 * eligibility already protects (pinned, essential, folders, manual groups) nor
 * any tab outside the given Space.
 */
function settleLooseTabs(spaceId) {
  if (!spaceId || !cfg().looseTabsAtBottom) {
    return;
  }
  const container = spaceContainer(spaceId);
  if (!container) {
    return;
  }
  const groups = [...container.querySelectorAll("tab-group")];
  if (!groups.length) {
    return;
  }
  const lastGroup = groups[groups.length - 1];

  const misplaced = [];
  for (const tab of window.gBrowser.tabs) {
    if (spaceOfTab(tab) !== spaceId || tab.group || !isEligible(tab)) {
      continue;
    }
    if (
      lastGroup.compareDocumentPosition(tab) &
      window.Node.DOCUMENT_POSITION_PRECEDING
    ) {
      misplaced.push(tab);
    }
  }
  if (misplaced.length) {
    dbg("looseMisplaced", {
      space: spaceId,
      keys: misplaced.map(t => keyFromTab(t)?.key ?? "?"),
      lastGroup: lastGroup.getAttribute(KEY_ATTR) ?? `manual(${lastGroup.label ?? ""})`,
    });
  }

  let moved = false;
  // Moved one at a time to the Space's current end, in their original order —
  // each move makes the moved tab the new end, so the relative order survives.
  // Always through the browser's move API, never raw DOM: raw reparenting would
  // lie to everything that tracks tab order. The object signature carries
  // forceUngrouped so landing beside a group does not join it; the numeric
  // fallback covers older signatures, with an explicit ungroup as the net.
  for (const tab of misplaced) {
    const spaceTabs = [...window.gBrowser.tabs].filter(
      t => spaceOfTab(t) === spaceId
    );
    const last = spaceTabs[spaceTabs.length - 1];
    if (!last || last === tab) {
      continue;
    }
    const from = tab._tPos;
    try {
      try {
        window.gBrowser.moveTabTo(tab, { tabIndex: last._tPos, forceUngrouped: true });
      } catch {
        window.gBrowser.moveTabTo(tab, last._tPos);
      }
      if (tab.group) {
        window.gBrowser.ungroupTab(tab);
      }
      dbg("looseSettled", {
        space: spaceId,
        key: keyFromTab(tab)?.key ?? null,
        from,
        to: tab._tPos,
      });
      moved = true;
    } catch (ex) {
      dbg("looseSettleFailed", { space: spaceId, error: String(ex) });
      break;
    }
  }
  if (moved) {
    dumpStrip("afterSettle");
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
/*
 * The Fold preset animates the container as a window over a rigid sheet of
 * rows, so the stylesheet needs the sheet's height. CSS cannot measure; the
 * script publishes, per group, the expanded container's content height
 * (--zstg-sheet-measured) and the row count (--zstg-rows, the calc fallback's
 * input). Published from updateHiddenCount because every tab-mutation path
 * already calls it. scrollHeight is measured only while expanded: under other
 * presets a collapsed group's rows are zero-height, and a 0 published here
 * would clip the sheet at rest — the expand-armed settle loop below covers
 * the tab that joined while the group was collapsed.
 */
/*
 * The height is published through a settle loop, never from a single read.
 * Field trace (2026-08-17): a snapshot taken 4-6ms after the trigger lands
 * mid-animation — a new tab's insertion animation, or fold's own
 * selected-row choreography — and published 40/80/121px for a sheet that
 * settles at 160px; the stale number became the clip and hid the tail rows
 * until the next unrelated republication. So each trigger re-arms a per-group
 * loop that reads scrollHeight once per frame and publishes only when two
 * consecutive readings agree — an integer height holds still across frames
 * only when the transitions are done. Bounded, and each iteration bails when
 * the group collapses or leaves the DOM; a newer trigger replaces the loop,
 * so the newest mutation wins. Waiting on transitionend instead would couple
 * to two animation systems the mod does not own (the browser's tab insertion
 * and fold's CSS); polling observes the outcome, not the mechanism.
 */
const SHEET_SETTLE_FRAMES = 90;
const sheetSettleTokens = new WeakMap();

function publishSheetMetrics(group) {
  const count = group.tabs?.length ?? 0;
  const prevRows = group.style.getPropertyValue("--zstg-rows");
  group.style.setProperty("--zstg-rows", String(count));
  if (group.collapsed) {
    if (prevRows !== String(count)) {
      dbg("sheetSkippedCollapsed", { key: group.getAttribute(KEY_ATTR), rows: count });
    }
    return;
  }
  const token = {};
  sheetSettleTokens.set(group, token);
  // Movement-gated, publish-once. Two field tests shaped this:
  // - "stable for two frames" alone published the LEADING plateau (the
  //   pre-animation layout reads identically before the transition starts:
  //   160 -> 41 at frame 3, on the very flow under repair);
  // - publishing every mid-flight plateau RETARGETED the running expand (the
  //   window animated to 41px, finished, then expanded the rest — a visible
  //   two-stage motion).
  // So: stability only counts after the value has been seen to MOVE, it must
  // hold for a stretch of frames scaled by the motion speed (a slowed-down
  // easing crawls, so its false plateaus last longer too), and the loop
  // publishes ONCE and stops — in a healthy flow that publish is a no-op, so
  // the animation is never redirected. A window with no movement means the
  // strip was at rest, and the initial value is published at the end.
  const publish = (h, frames) => {
    const prev = group.style.getPropertyValue("--zstg-sheet-measured");
    if (prev !== `${h}px`) {
      dbg("sheetMeasured", {
        key: group.getAttribute(KEY_ATTR),
        from: prev || null,
        to: h,
        frames,
      });
      group.style.setProperty("--zstg-sheet-measured", `${h}px`);
    }
  };
  const scale = 100 / cfg().motionSpeed;
  const settleFrames = Math.min(30, Math.ceil(6 * scale));
  const windowFrames = Math.min(300, Math.ceil(SHEET_SETTLE_FRAMES * scale));
  let frames = 0;
  let initial = -1;
  let prevRead = -1;
  let moved = false;
  let stableRun = 0;
  const step = () => {
    if (sheetSettleTokens.get(group) !== token) {
      return;
    }
    try {
      if (!group.isConnected || group.collapsed) {
        return;
      }
      const h = group.querySelector(".tab-group-container")?.scrollHeight ?? 0;
      frames += 1;
      if (initial < 0) {
        initial = h;
      } else if (!moved && h !== initial) {
        moved = true;
      }
      if (moved) {
        stableRun = h === prevRead ? stableRun + 1 : 0;
        if (stableRun >= settleFrames && h > 0) {
          publish(h, frames);
          return;
        }
      }
      prevRead = h;
      if (frames < windowFrames) {
        window.requestAnimationFrame(step);
      } else if (!moved && h > 0) {
        // Nothing moved through the whole window: the strip was at rest and
        // the initial reading IS the settled layout.
        publish(h, frames);
      }
    } catch (e) {
      dbg("sheetSettleFailed", { error: String(e) });
    }
  };
  window.requestAnimationFrame(step);
}

function updateHiddenCount(group) {
  if (!isOurGroup(group)) {
    return;
  }
  publishSheetMetrics(group);
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

/*
 * Groups by recent use PER SPACE, most recent first. Ids only, so we hold no
 * nodes. One global list was the audit's worst finding: entries from another
 * Space crowded this Space's own recent groups out of the keep-set, so
 * entering a Space collapsed the very groups it had just been using — the
 * spec says "the N most recently used groups in the Space".
 */
const recentGroupsBySpace = new Map();

// Pending focus-mode collapses, one cancellable timer per group id. The delay is
// what keeps fast group-switching from shaking the sidebar: a group the user
// returns to before its timer fires never collapses at all.
const focusTimers = new Map();

function cancelFocusTimer(id) {
  const timer = focusTimers.get(id);
  if (timer) {
    window.clearTimeout(timer);
    focusTimers.delete(id);
  }
}

function clearFocusTimers() {
  for (const timer of focusTimers.values()) {
    window.clearTimeout(timer);
  }
  focusTimers.clear();
}

/*
 * Idle strategy state: one clock per group id, touched on select/open/close and
 * on a manual chip-expand. Deliberately not persisted — a restart is a fresh
 * day, and every clock starts at "now" (seeded at first sight by the sweep, so
 * a restored group is never retired on a clock that never started).
 */
const groupLastTouch = new Map();

function touchGroup(group) {
  if (isOurGroup(group)) {
    groupLastTouch.set(group.id, Date.now());
  }
}

/*
 * The idle sweep: retire groups nobody touched for the window. It goes through
 * the normal collapsed flag, so motion presets animate the retirement and the
 * hidden-count updates ride the existing listeners. The active tab's group is
 * always immune — the user reading one tab for two hours is the opposite of
 * idle.
 */
function sweepIdleGroups() {
  const c = cfg();
  if (!c.focusMode || c.focusStrategy !== "idle") {
    return;
  }
  const windowMs = c.focusIdleMinutes * 60000;
  const now = Date.now();
  const activeGroup = window.gBrowser.selectedTab?.group;
  const alive = new Set();
  for (const g of window.gBrowser.tabGroups) {
    if (!isOurGroup(g)) {
      continue;
    }
    alive.add(g.id);
    if (g.collapsed || g === activeGroup) {
      continue;
    }
    const last = groupLastTouch.get(g.id);
    if (last === undefined) {
      groupLastTouch.set(g.id, now);
      continue;
    }
    if (now - last >= windowMs) {
      dbg("idleRetire", {
        key: g.getAttribute(KEY_ATTR),
        idleMinutes: Math.round((now - last) / 60000),
      });
      g.collapsed = true;
    }
  }
  for (const id of [...groupLastTouch.keys()]) {
    if (!alive.has(id)) {
      groupLastTouch.delete(id);
    }
  }
}

/*
 * The slide under the reorder move. A DOM move repositions in a single frame —
 * CSS cannot animate a reorder — so next to the animated expand the jump reads
 * as a glitch. FLIP fixes that without touching the move: measure the affected
 * groups before, move, measure again, and play the inverted delta back to zero
 * with element.animate (self-cleaning: no attribute or inline style survives
 * the effect). Two facts this shape was measured into, not designed from:
 *
 * - <tab-group> generates NO box — getBoundingClientRect on it is 0,0,0
 *   forever (measured via the give-up diagnostic; every delta of the first
 *   build read 0,0). So the group's position is read off its LABEL, the one
 *   child visible in both collapse states, and the transform plays on the
 *   group's element CHILDREN (label container and tab container), which do
 *   have boxes.
 * - The playback composites ("add") instead of replacing: the fold preset
 *   keeps a translateY on the tab container, and a replacing animation would
 *   stomp it for its duration and snap on release.
 *
 * The invert step waits, one rAF at a time, until the label's rect actually
 * changes, then plays before that frame paints — no flash either way. Groups
 * the move did not displace come out with a zero delta and are skipped. The
 * gates mirror the presets': the instant option and OS reduced motion mean no
 * slide, and the duration stretches by the same speed factor. Cosmetic by the
 * same contract as the reorder itself — the move ALWAYS runs, even when
 * measuring or playing throws; a rect read on a mid-flight slide sees the
 * current transform, so a stacked FLIP starts from the visually current
 * position once the previous effect is cancelled.
 */
const SLIDE_BASE_MS = 150;
const SLIDE_WAIT_FRAMES = 90;

function slideBox(group) {
  return (group.querySelector(".tab-group-label") ?? group).getBoundingClientRect();
}

function slideResettle(groups, doMove) {
  let before = null;
  try {
    const motionOff =
      cfg().collapseMotion === "off" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!motionOff) {
      before = groups.map(g => [g, slideBox(g)]);
    }
  } catch (e) {
    dbg("focusSlideFailed", { at: "measure", error: String(e) });
    before = null;
  }
  doMove();
  if (!before) {
    return;
  }
  const [moved, movedFirst] = before[0];
  let frames = 0;
  const tryPlay = () => {
    try {
      const now = slideBox(moved);
      if (
        Math.abs(now.left - movedFirst.left) <= 1 &&
        Math.abs(now.top - movedFirst.top) <= 1
      ) {
        frames += 1;
        if (frames < SLIDE_WAIT_FRAMES) {
          window.requestAnimationFrame(tryPlay);
        } else {
          dbg("focusSlideGaveUp", { frames });
        }
        return;
      }
      const duration = SLIDE_BASE_MS * (100 / cfg().motionSpeed);
      let played = 0;
      for (const [g, first] of before) {
        for (const child of g.children) {
          for (const a of child.getAnimations()) {
            if (a.id === "zstg-slide") {
              a.cancel();
            }
          }
        }
        const last = slideBox(g);
        const dx = first.left - last.left;
        const dy = first.top - last.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
          continue;
        }
        for (const child of g.children) {
          const anim = child.animate(
            [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
            { duration, easing: "ease-in-out", composite: "add" }
          );
          anim.id = "zstg-slide";
        }
        played += 1;
      }
      dbg("focusSlide", { duration, played, frames });
    } catch (e) {
      dbg("focusSlideFailed", { at: "play", error: String(e) });
    }
  };
  window.requestAnimationFrame(tryPlay);
}

/*
 * The reorder option: open groups sit above collapsed ones. The event is the
 * group CLOSING, OPENING or BEING CREATED — not tab focus: a group that
 * collapses sinks below the open cluster, a group that expands rises above the
 * collapsed cluster, and a group born expanded rises the same way.
 * Minimal moves only, so the order inside each cluster stays the user's.
 * Native move only and cosmetic by contract — on any failure it logs and
 * leaves the strip alone (the TabMove debounce already runs the nest
 * corrector, which covers the one bad outcome a move can have). Triggered by
 * collapse/expand events and by creation only, never from TabMove, so it
 * cannot fight a drag.
 */
function resettleGroupOrder(group) {
  const c = cfg();
  if (!c.focusMode || !c.focusReorder || !isOurGroup(group) || !group.isConnected) {
    return;
  }
  const spaceId = group.getAttribute(SPACE_ATTR);
  const pos = g => g.tabs?.[0]?._tPos ?? Number.MAX_SAFE_INTEGER;
  const others = [...window.gBrowser.tabGroups]
    .filter(
      g => g !== group && isOurGroup(g) && g.getAttribute(SPACE_ATTR) === spaceId
    )
    .sort((a, b) => pos(a) - pos(b));
  try {
    if (group.collapsed) {
      // Sink: below the last open group — the top of the collapsed cluster,
      // so the most recently closed group sits nearest the open ones.
      const lastExpanded = [...others].reverse().find(g => !g.collapsed);
      if (!lastExpanded || pos(lastExpanded) < pos(group)) {
        return;
      }
      const target = lastExpanded.tabs[lastExpanded.tabs.length - 1];
      if (!target) {
        return;
      }
      dbg("focusSink", {
        key: group.getAttribute(KEY_ATTR),
        below: lastExpanded.getAttribute(KEY_ATTR),
        to: target._tPos,
      });
      slideResettle([group, ...others], () =>
        window.gBrowser.moveTabTo(group, { tabIndex: target._tPos })
      );
    } else {
      // Rise: above the first collapsed group — the bottom of the open cluster.
      const firstCollapsed = others.find(g => g.collapsed);
      if (!firstCollapsed || pos(firstCollapsed) > pos(group)) {
        return;
      }
      const target = firstCollapsed.tabs[0];
      if (!target) {
        return;
      }
      dbg("focusRise", {
        key: group.getAttribute(KEY_ATTR),
        above: firstCollapsed.getAttribute(KEY_ATTR),
        to: target._tPos,
      });
      slideResettle([group, ...others], () =>
        window.gBrowser.moveTabTo(group, { tabIndex: target._tPos })
      );
    }
  } catch (e) {
    dbg("focusResettleFailed", { error: String(e) });
  }
}

function applyFocusMode() {
  const c = cfg();
  if (!c.focusMode) {
    return;
  }
  const activeTab = window.gBrowser.selectedTab;
  const activeGroup = activeTab?.group;

  // A tab outside any group does not tear down your context: nothing is collapsed.
  if (!isOurGroup(activeGroup)) {
    return;
  }

  touchGroup(activeGroup);

  // The idle strategy has no keep-set: the sweep does the collapsing on its own
  // clock. Focus still guarantees the active group is open, with either strategy.
  if (c.focusStrategy === "idle") {
    if (activeGroup.collapsed) {
      activeGroup.collapsed = false;
    }
    return;
  }

  const spaceId = spaceOfTab(activeTab);
  // Dead ids are pruned on every pass: a closed group left in the list would
  // occupy a focusKeep slot forever, quietly shrinking the promised N.
  const liveIds = new Set(
    [...window.gBrowser.tabGroups]
      .filter(g => isOurGroup(g) && g.getAttribute(SPACE_ATTR) === spaceId)
      .map(g => g.id)
  );
  const recent = [
    activeGroup.id,
    ...(recentGroupsBySpace.get(spaceId) ?? []).filter(
      id => id !== activeGroup.id && liveIds.has(id)
    ),
  ];
  recentGroupsBySpace.set(spaceId, recent);

  // The N most recent stay open. With N = 1 the behavior is the old one; above
  // that, moving between recent groups no longer shifts the sidebar.
  const keep = new Set(recent.slice(0, cfg().focusKeep));

  const delay = cfg().focusDelay;
  for (const g of window.gBrowser.tabGroups) {
    if (!isOurGroup(g) || g.getAttribute(SPACE_ATTR) !== spaceId) {
      continue;
    }
    if (keep.has(g.id)) {
      cancelFocusTimer(g.id);
      if (g.collapsed) {
        g.collapsed = false;
      }
    } else if (!g.collapsed && !focusTimers.has(g.id)) {
      if (delay <= 0) {
        g.collapsed = true;
        continue;
      }
      const id = g.id;
      focusTimers.set(
        id,
        window.setTimeout(() => {
          focusTimers.delete(id);
          guarded(() => {
            // The world may have moved while the timer ran: collapse only if the
            // group is STILL outside the keep-set, and only if focus mode still is.
            if (!cfg().focusMode) {
              return;
            }
            const keepNow = new Set(
              (recentGroupsBySpace.get(spaceId) ?? []).slice(0, cfg().focusKeep)
            );
            if (keepNow.has(id)) {
              return;
            }
            for (const gg of window.gBrowser.tabGroups) {
              if (gg.id === id && isOurGroup(gg) && !gg.collapsed) {
                gg.collapsed = true;
              }
            }
          });
        }, delay)
      );
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
    fixNestedGroups(spaceId);
    settleLooseTabs(spaceId);
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

// Kept equal to the installers' file lists; verify.mjs fails if they disagree.
// The fetch happens HERE, in the chrome script, never in the panel document —
// the panel's CSP stays exactly as strict as it is.
const UPDATE_FILES = [
  ["src/zen-space-tab-groups.uc.mjs", "chrome/JS/zen-space-tab-groups.uc.mjs"],
  ["src/zen-space-tab-groups.uc.css", "chrome/CSS/zen-space-tab-groups.uc.css"],
  ["src/resources/zstg-panel.html", "chrome/resources/zstg-panel.html"],
  ["src/resources/zstg-panel.mjs", "chrome/resources/zstg-panel.mjs"],
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

// ---------------------------------------------------------------------------
// Am I what is installed?
// ---------------------------------------------------------------------------

/**
 * What the last comparison found. `null` until it runs; `state` is one of
 * "match", "mismatch" or "unknown". The panel reads it through ZSTG.
 */
let staleness = null;

/**
 * Compares the version compiled into this script against the version in the file
 * it was loaded from.
 *
 * The browser executes what it loaded at startup, so updating the files under a
 * running Zen leaves it running the previous version with every file-to-file check
 * reporting success — which is what happened, and what took half an hour to see.
 * Reading the artifact answers that exact question; a marker file would answer
 * "did an installer run recently", which is a different question that agrees most
 * of the time and disagrees precisely when it matters.
 *
 * Called at startup, and again every time the panel opens. NOT on a timer: the
 * condition is rare, the person who would act on it is the one opening the panel,
 * and a perpetual half-hourly file read is a standing cost for an answer nobody is
 * waiting for. The startup call is nearly always "match" — the script has just been
 * read from the file it compares against — and is kept only because it is the one
 * moment that can catch a genuinely stale cached load.
 *
 * Unreadable or unparsable is "unknown", NEVER "mismatch": a false alarm here
 * teaches the user to dismiss the real one.
 */
async function checkStaleness() {
  try {
    const path = profilePath("chrome/JS/zen-space-tab-groups.uc.mjs");
    const text = await IOUtils.readUTF8(path);
    const found = /const VERSION = "([^"]+)"/.exec(text)?.[1] ?? null;
    if (!found) {
      staleness = { state: "unknown", running: VERSION, installed: null,
                    reason: "no version found in the installed file" };
    }
    else {
      staleness = {
        state: found === VERSION ? "match" : "mismatch",
        running: VERSION,
        installed: found,
      };
    }
  } catch (ex) {
    staleness = { state: "unknown", running: VERSION, installed: null,
                  reason: String(ex) };
  }
  // Logged either way. A check that only leaves a trace when it fails cannot be
  // told apart from a check that never ran.
  dbg("stalenessCheck", staleness);
  return staleness;
}

/**
 * The single deliberate exception to "nothing touches the network": one request,
 * in direct response to the user's click in the panel, for the latest RELEASE —
 * never a moving branch. A check downloads nothing but the version.
 */
/*
 * `via` names what woke the check — "panel" (the user, or the #update hash),
 * "boot" (the 45s one-shot) or "heartbeat" (the 4h tick). It exists for the
 * diagnostic log: a check with no visible effect is unexplainable without
 * knowing which clock fired it, and that exact confusion happened in the
 * field on the pill's debut morning.
 */
async function checkForUpdate(via = "panel") {
  // The list, not just the latest: someone three versions behind deserves the
  // notes of every release they missed, newest first — the from -> to line
  // alone hides two releases' worth of reasons to update.
  const r = await window.fetch(`https://api.github.com/repos/${REPO}/releases?per_page=100`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!r.ok) {
    throw new Error(`HTTP ${r.status}`);
  }
  const releases = (await r.json()).filter(x => !x.draft && !x.prerelease);
  // Sorted by VERSION, not by publish date: a hotfix published after a bigger
  // release must never become the head — the API's order is chronological,
  // and chronology is not semver.
  const ver = x => String(x.tag_name ?? "").replace(/^v/, "");
  const newer = releases
    .filter(x => isNewerVersion(ver(x), VERSION))
    .sort((a, b) => (isNewerVersion(ver(a), ver(b)) ? -1 : 1));
  // The head is the highest VERSION of the whole list, never the chronological
  // first. When something newer exists this is the same release `newer[0]` names;
  // when nothing is, the old fallback handed back whatever was published last,
  // and the repair — which runs exactly then — would have installed it. A hotfix
  // on an older line published after a bigger release made that a downgrade.
  const head = latestRelease(releases);
  const tag = String(head?.tag_name ?? "");
  dbg("updateCheck", { tag, via, installed: VERSION, missed: newer.length });
  return {
    tag,
    version: tag.replace(/^v/, ""),
    // Every missed release's published notes ride along so the panel shows
    // WHAT changed next to the from -> to line — the changelog entries, per
    // the releasing rule.
    notes: newer
      .map(x => x.tag_name + "\n" + String(x.body ?? "").trim())
      .join("\n\n")
      .trim(),
  };
}

/*
 * The update pill: a quiet floating badge over the sidebar's lower corner,
 * shown only when the background check found a newer release. Anchored to the
 * WINDOW itself, on purpose: the first cut lived in the tab strip's periphery
 * — an element Zen keeps in the DOM but never renders in its vertical layout,
 * so the pill existed and nobody ever saw it (found in the field, log said
 * updatePill, screenshot said nothing). Fixed positioning over the chrome
 * window cannot be hidden by strip internals. Clicking lands one click from
 * done: the panel's update section with the check already performed.
 */
const UPDATE_PILL_ID = "zstg-update-pill";

/*
 * Dismissing the pill is a session-wide "not now". The flag lives on the CORE
 * module, which the browser caches once per process — a plain variable here
 * would be per WINDOW (this script runs once per window), so other windows
 * kept pilling and heartbeating after "Not now", against the spec.
 */
function updateDismissed() {
  return core?.runtimeState?.updateDismissed === true;
}

function showUpdatePill(version) {
  if (updateDismissed() || window.document.getElementById(UPDATE_PILL_ID)) {
    return;
  }
  const host = window.document.documentElement;
  const pill = window.document.createXULElement("hbox");
  pill.id = UPDATE_PILL_ID;
  pill.setAttribute("align", "center");
  const main = window.document.createXULElement("toolbarbutton");
  main.className = "zstg-pill-main";
  main.setAttribute("label", t("update.pill", { version }));
  main.setAttribute("tooltiptext", t("update.pillTip"));
  main.addEventListener("command", () => {
    window.gBrowser.selectedTab = window.gBrowser.addTrustedTab(
      "about:spacekeeper#update"
    );
  });
  const close = window.document.createXULElement("toolbarbutton");
  close.className = "zstg-pill-close";
  close.setAttribute("label", "\u2715");
  close.setAttribute("tooltiptext", t("update.dismiss"));
  close.addEventListener("command", () => {
    if (core?.runtimeState) {
      core.runtimeState.updateDismissed = true;
    }
    // Every window's pill goes, not just this one's: "not now" was said once.
    for (const win of Services.wm.getEnumerator("navigator:browser")) {
      win.document.getElementById(UPDATE_PILL_ID)?.remove();
    }
    dbg("updatePillDismissed", { version });
  });
  pill.append(main, close);
  // Span the tab sidebar edge to edge: its width only exists at runtime, so
  // it is measured when the pill shows. The CSS left/width are the fallback
  // for the day the measurement fails.
  try {
    const rect = window.gBrowser.tabContainer?.getBoundingClientRect?.();
    if (rect && rect.width > 120) {
      pill.style.left = `${Math.round(rect.left) + 8}px`;
      pill.style.width = `${Math.round(rect.width) - 16}px`;
    }
  } catch {
    // fixed-position fallback from the stylesheet
  }
  host.appendChild(pill);
  dbg("updatePill", { version });
}

function removeUpdatePill() {
  window.document.getElementById(UPDATE_PILL_ID)?.remove();
}

async function backgroundUpdateCheck(via) {
  if (!cfg().updateCheck || updateDismissed()) {
    return;
  }
  try {
    const r = await checkForUpdate(via);
    if (r.version && isNewerVersion(r.version, VERSION)) {
      showUpdatePill(r.version);
    } else {
      // A pill that outlived its reason (the release was yanked, or the user
      // updated elsewhere) clears itself on the next tick.
      removeUpdatePill();
    }
  } catch (e) {
    // An offline start must not surface an error for a feature nobody asked
    // to run right now; the panel's own check reports loudly when clicked.
    dbg("updateCheckFailed", { error: String(e) });
  }
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
  try {
  await IOUtils.makeDirectory(staging, { ignoreExisting: true });
  // The file list comes from the RELEASE being installed, not from the list
  // compiled into this (old) running version: a release that adds a file would
  // otherwise install incomplete, and the missing chrome:// import would
  // disable the mod on the next start. The running list is the floor — the
  // release's list is used only when it covers at least as much.
  let files = UPDATE_FILES;
  try {
    const newScript = await fetchRaw(tag, "src/zen-space-tab-groups.uc.mjs");
    const block = newScript.match(/const UPDATE_FILES = \[([\s\S]*?)\n\];/);
    if (block) {
      const parsed = [...block[1].matchAll(/\[\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\]/g)].map(
        m => [m[1], m[2]]
      );
      if (parsed.length >= UPDATE_FILES.length) {
        files = parsed;
      }
    }
  } catch (e) {
    dbg("updateManifestFallback", { error: String(e) });
  }
  const fetched = [];
  for (const [src, dest] of files) {
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

  // The moves are the commit point. Each replaced file is backed up first and
  // everything already moved is rolled back on a mid-loop failure: a profile
  // holding two versions at once is the one outcome worse than a failed
  // update, and "all-or-nothing" must hold through the moves, not only the
  // fetches.
  const done = [];
  try {
    for (const [stagePath, dest] of fetched) {
      const target = profilePath(dest);
      const backup = stagePath + ".prev";
      try {
        await IOUtils.copy(target, backup);
      } catch {
        // a file new in this release has nothing to back up
      }
      await IOUtils.move(stagePath, target);
      done.push([backup, target]);
    }
  } catch (e) {
    for (const [backup, target] of done.reverse()) {
      await IOUtils.move(backup, target).catch(() => {});
    }
    throw e;
  }

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
  // The alert's job ends the moment the update is applied.
  removeUpdatePill();
  return { updated: fetched.length, loaderChanged };
  } finally {
    // The staging directory never outlives the attempt, success or failure.
    await IOUtils.remove(staging, { recursive: true, ignoreAbsent: true }).catch(
      () => {}
    );
  }
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
 * Restart with the startup cache invalidated, and nothing else.
 *
 * Deliberately NOT resetAndRestart: that one dissolves every group first, which is
 * right when handing the browser back on uninstall and wrong here — trading a stale
 * version for lost organization is a worse outcome than the problem being fixed.
 *
 * The two are meant to stay different, confirmed by the owner when the asymmetry
 * was raised: "Restart now" after an update dissolves the groups on purpose,
 * because a version change can alter the group marking and leave the old ones
 * unrecognized; "Restart now" from the stale banner only applies code that is
 * already on disk, and has no reason to touch anything. Do not unify them.
 *
 * Returns false when the utility is unavailable, and the panel falls back to the
 * manual steps. False always means nothing happened.
 */
function restartToApply() {
  const restart = window.UC_API?.Runtime?.restart;
  if (typeof restart !== "function") {
    return false;
  }
  dbg("restartToApply", { running: VERSION });
  return restart(true);
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
// The repair: reinstall from the userScripts menu, without the panel
// ---------------------------------------------------------------------------

// The panel is where an update is decided, but a broken page or a half-finished
// write leaves the user with no way in from inside the product. This entry is
// the way in: it does not ask what is wrong, it puts the published files back.

const REPAIR_ENTRY_ID = "zstg-repair-entry";
const RELEASES_URL = `https://github.com/${REPO}/releases`;

/**
 * Resolves the latest release and reinstalls it over whatever is on disk —
 * deliberately with no version comparison anywhere in the path. The situation
 * this exists for is the one where the version is right and the files are
 * wrong; a gate would refuse exactly when help is needed. Exposed on ZSTG as
 * the console last resort; the menu runs the same two steps with the
 * confirmation in between.
 */
async function reinstallLatest() {
  const { tag } = await checkForUpdate("repair");
  if (!tag) {
    throw new Error("no published release found");
  }
  return applyUpdate(tag);
}

/**
 * Chrome UI, independent of the panel — the same notification bar the loader
 * uses for its own prompts. A rescue path must not be able to trap the user
 * behind a modal if it throws mid-flow.
 */
function notifyRepair(label, priority, buttons) {
  const show = window.UC_API?.Notifications?.show;
  if (typeof show !== "function") {
    console.warn(`${LOG} ${label}`);
    return;
  }
  show({ label, priority, buttons, window });
}

/**
 * Appends the entry at the end of the loader's userScripts menu. The menu is
 * built once per window and never regenerated (its trigger listener is
 * {once: true}), so there is nothing to survive: once appended, the item stays
 * for the life of the window. Unconditional on purpose: `zen.stg.updateCheck`
 * silences the automatic check, and this involves none — a rescue that a
 * configuration can remove is not a rescue.
 */
function insertRepairEntry() {
  let menu = null;
  try {
    menu = window.UC_API?.Scripts?.getScriptMenuForDocument(document);
  } catch (ex) {
    console.warn(`${LOG} could not reach the userScripts menu:`, ex);
  }
  const popup = menu?.querySelector("#menuUserScriptsPopup");
  if (!popup) {
    dbg("repairEntryUnavailable", {});
    return;
  }
  const item = document.createXULElement("menuitem");
  item.id = REPAIR_ENTRY_ID;
  item.setAttribute("label", t("repair.entry"));
  // Deliberately no data-filename and no type="checkbox": the loader's shared
  // command listener toggles anything carrying a filename, and its per-popup
  // status pass rewrites anything typed checkbox. Carrying neither, this item
  // is invisible to both, and our listener is the only handler.
  item.addEventListener("command", () => {
    repairFromMenu();
  });
  popup.appendChild(item);
}

function removeRepairEntry() {
  document.getElementById(REPAIR_ENTRY_ID)?.remove();
}

/**
 * The click on the entry. The resolve is metadata only — the release must be
 * NAMED before anything is downloaded or written, so the confirmation sits
 * between the two steps, and the confirmation is the click the "nothing
 * happens without a click" line names.
 */
async function repairFromMenu() {
  let release;
  try {
    release = await checkForUpdate("repair");
    if (!release.tag) {
      throw new Error("no published release found");
    }
  } catch (ex) {
    notifyRepair(t("update.failed", { error: String(ex) }), "critical");
    return;
  }
  dbg("repairConfirm", { tag: release.tag, running: VERSION });
  notifyRepair(
    t("repair.confirm", { version: release.version, notes: RELEASES_URL }),
    "warning",
    [
      {
        label: t("repair.confirmAction"),
        // The braces matter: an async callback's Promise is truthy, and a
        // truthy return keeps the notification bar open forever.
        callback: () => {
          runRepair(release);
        },
      },
      {
        // Cancel writes nothing and fetches nothing; its only effect is the
        // bar closing itself.
        label: t("common.cancel"),
        callback: () => {
          dbg("repairCancelled", { tag: release.tag });
        },
      },
    ]
  );
}

function restartFromRepair() {
  if (!restartToApply()) {
    notifyRepair(t("repair.restartUnavailable"), "warning");
  }
}

async function runRepair(release) {
  try {
    const result = await applyUpdate(release.tag);
    if (result.loaderChanged) {
      notifyRepair(t("repair.doneLoaderChanged", { version: release.version }), "warning", [
        {
          label: t("repair.runInstaller"),
          callback: () => {
            launchInstaller(release.tag);
          },
        },
        { label: t("restart.action"), callback: restartFromRepair },
      ]);
    } else {
      notifyRepair(t("repair.done", { version: release.version }), undefined, [
        { label: t("restart.action"), callback: restartFromRepair },
      ]);
    }
  } catch (ex) {
    // applyUpdate rolled its moves back and dropped the staging directory, so
    // "nothing was changed" is literally true here.
    notifyRepair(t("update.failed", { error: String(ex) }), "critical");
  }
}

/**
 * The loader hand-off: fetch the installer FROM THE SAME RELEASE the files came
 * from, and run it with that tag pinned — never a branch — plus the
 * non-interactive flag, because a browser-launched process is exactly the
 * no-terminal case. This is the only thing in the mod that executes anything
 * outside the browser, and it is fenced on purpose: offered only when the
 * loader changed, only after an explicit second click. The installer still does
 * the privileged work and still asks for elevation itself. When the launch
 * cannot be performed, the pre-existing "run the installer" message is the
 * fallback, so the worst case stays yesterday's behaviour.
 */
async function launchInstaller(tag) {
  const isWindows = Services.appinfo.OS === "WINNT";
  const name = isWindows ? "install.ps1" : "install.sh";
  const path = profilePath(`spacekeeper-repair-${name}`);
  try {
    const { Subprocess } = ChromeUtils.importESModule(
      "resource://gre/modules/Subprocess.sys.mjs"
    );
    await IOUtils.writeUTF8(path, await fetchRaw(tag, name));
    const proc = await Subprocess.call(
      isWindows
        ? {
            command:
              "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
            arguments: [
              "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path,
              "-Ref", tag, "-NonInteractive",
            ],
          }
        : { command: "/bin/sh", arguments: [path, "--ref", tag, "--non-interactive"] }
    );
    // Drained, not ignored: an unread pipe has a finite buffer, and a chatty
    // installer blocked on a full one would hang here forever.
    let output = "";
    for (let chunk; (chunk = await proc.stdout.readString()); ) {
      output += chunk;
    }
    const { exitCode } = await proc.wait();
    dbg("repairInstaller", { tag, exitCode, tail: output.slice(-400) });
    if (exitCode === 0) {
      notifyRepair(t("repair.installerDone"), undefined, [
        { label: t("restart.action"), callback: restartFromRepair },
      ]);
    } else {
      notifyRepair(t("update.doneLoaderChanged"), "warning");
    }
  } catch (ex) {
    dbg("repairInstallerFailed", { tag, error: String(ex) });
    notifyRepair(t("update.doneLoaderChanged"), "warning");
  } finally {
    // The downloaded installer never outlives the attempt.
    await IOUtils.remove(path, { ignoreAbsent: true }).catch(() => {});
  }
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
    guarded(() => {
      organize(tab);
      settleLooseTabs(spaceOfTab(tab));
    });
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
    guarded(() => {
      organize(tab);
      settleLooseTabs(spaceOfTab(tab));
      // Recorded only AFTER the work succeeded: committing the memo first
      // meant a dropped or failed organize marked the key as handled, and the
      // tab silently never grouped until an unrelated event.
      lastKey.set(tab, next);
    });
  },
};

function onTabOpen(e) {
  schedule(e.target);
  // A new tab lands in its group asynchronously; the deferred read touches the
  // group it actually joined, which is what the idle clock cares about.
  window.setTimeout(() => guarded(() => touchGroup(e.target.group)), 0);
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

function onTabClose(e) {
  // Closing a tab is a touch: the user is working in that group right now.
  guarded(() => touchGroup(e.target.group));
  window.setTimeout(() => {
    guarded(removeEmptyGroups);
    guarded(updateHiddenCounts);
  }, 0);
}

// A group drag announces itself only through the TabMove of the tabs it carries.
// Debounced to one pass per gesture; the pass's own corrective moves re-fire the
// event, but the next pass finds nothing misplaced and stops — convergence, not
// recursion.
//
// ONLY the nest fix runs here, deliberately. Running the loose-tab settle on
// every move meant reshuffling tabs in the middle of the user's own drag — a
// dragged group bounced to wherever the settle's moves pushed the strip. The
// settle belongs to the organization moments the spec names (a tab opens or
// navigates, regroup, the restore passes), where no user gesture is in flight.
let moveSettleTimer = 0;

function onTabMove() {
  window.clearTimeout(moveSettleTimer);
  moveSettleTimer = window.setTimeout(() => {
    guarded(() => {
      dumpStrip("beforeNestFix");
      fixNestedGroups(currentSpace());
    });
  }, 150);
}

// One organization pass per Space per session, on its first activation: restored
// Spaces are full of unloaded tabs that fire no events, so nothing else would
// ever regroup them. Visiting is the trigger — background Spaces cost nothing
// until they matter.
const organizedSpaces = new Set();

function organizeSpaceOnce(spaceId) {
  if (!spaceId || organizedSpaces.has(spaceId)) {
    return;
  }
  organizedSpaces.add(spaceId);
  let organized = 0;
  for (const tab of [...window.gBrowser.tabs]) {
    if (spaceOfTab(tab) !== spaceId || tab.group || !isEligible(tab)) {
      continue;
    }
    organize(tab);
    organized++;
  }
  fixNestedGroups(spaceId);
  settleLooseTabs(spaceId);
  updateHiddenCounts();
  dbg("spaceOrganized", { space: spaceId, evaluated: organized });
}

function onTabSelect() {
  guarded(() => organizeSpaceOnce(currentSpace()));
  guarded(applyFocusMode);
  // The active tab is not counted as hidden, so switching tabs changes the number
  // being displayed.
  guarded(updateHiddenCounts);
}

/** Covers the label click, the commands and focus mode in one place. */
function onGroupCollapseChanged(e) {
  const g = e.target;
  dbg("collapseEvent", {
    type: e.type,
    key: g.getAttribute?.(KEY_ATTR) ?? null,
    collapsed: g.collapsed,
  });
  // A manual chip-expand restarts the idle clock: the user just asked for this
  // group, retiring it one sweep later would undo their gesture.
  if (e.type === "TabGroupExpand") {
    guarded(() => touchGroup(g));
  }
  // Open-groups-on-top rides this moment and the birth of a group (see
  // organize): the partition changes when a group closes, opens or appears,
  // not when a tab gains focus.
  window.setTimeout(() => guarded(() => resettleGroupOrder(g)), 0);
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
    // The motion preset lives on the groups as an attribute; a change in the
    // panel must reach the groups already on screen.
    if (data === PREF_PREFIX + "collapseMotion") {
      _cfg = null;
      restampMotionAll();
    }
    if (data === PREF_PREFIX + "motionSpeed") {
      _cfg = null;
      applyMotionSpeed();
    }
    // Turning focus mode off must not leave collapses in flight; switching
    // strategy must not either — a groups-strategy timer firing under the idle
    // strategy would collapse on a rule the user just left.
    if (data === PREF_PREFIX + "focusMode" || data === PREF_PREFIX + "focusStrategy") {
      clearFocusTimers();
    }
    // Turning the check off retires a visible pill: an alert for a feature the
    // user just disabled must not linger until restart.
    if (data === PREF_PREFIX + "updateCheck" && !cfg().updateCheck) {
      removeUpdatePill();
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
        // The repair entry's label was resolved at insertion, like the menu's;
        // remove + insert re-appends it at the same end position.
        removeRepairEntry();
        insertRepairEntry();
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
  // node in verify.mjs. Here they run against the REAL Services.eTLD — the same
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
    systemGroup: false,
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
      // A window closed before its own startup notification would leak the
      // observer (and the window it closes over) for the process lifetime.
      window.addEventListener(
        "unload",
        () => {
          try {
            Services.obs.removeObserver(obs, "browser-delayed-startup-finished");
          } catch {
            // already removed by the normal path
          }
        },
        { once: true }
      );
    });
  }
  // Spaces are assembled after session restore
  for (let i = 0; i < 100 && !currentSpace(); i++) {
    await new Promise(r => window.setTimeout(r, 100));
  }
}

async function start() {
  declareDefaults();
  guarded(seedRecommendedDefaults);
  await whenReady();

  guarded(reclaimGroups);
  // Zen restores tabs and groups after this point; the delayed passes reach what
  // did not exist yet.
  for (const delay of [1000, 3000, 8000]) {
    window.setTimeout(
      () =>
        guarded(() => {
          reclaimGroups();
          // Re-seeded each pass — for EVERY Space: session restore keeps
          // attaching tabs after the early passes, and a Space visited briefly
          // mid-restore must not stay marked "done" with its lazy tabs
          // ungrouped for the whole session. Clearing all is safe: the set
          // only gates the once-per-activation pass.
          organizedSpaces.clear();
          organizeSpaceOnce(currentSpace());
        }),
      delay
    );
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
  container.addEventListener("TabMove", onTabMove);
  container.addEventListener("TabSelect", onTabSelect);
  container.addEventListener("TabAttrModified", onTabAttrModified);
  container.addEventListener("TabGroupCollapse", onGroupCollapseChanged);
  container.addEventListener("TabGroupExpand", onGroupCollapseChanged);
  window.gBrowser.addTabsProgressListener(progressListener);
  Services.prefs.addObserver(PREF_PREFIX, prefObserver);

  createMenu();
  insertRepairEntry();
  registerHotkeys();
  installSpaceScopedSwitch();
  registerPanel();
  applyMotionSpeed();
  pruneDebugLog();
  // The idle sweep runs on its own cadence: 30s is far below any sensible idle
  // window, and the sweep is a Map scan — it exits in two reads when the idle
  // strategy is not the one running.
  const idleSweepTimer = window.setInterval(() => guarded(sweepIdleGroups), 30000);
  // First shot far from the startup path, then a slow heartbeat. The interval
  // alone proved insufficient in the field: on a laptop that sleeps every
  // night and stays awake less than 4h at a stretch, the ticks all land
  // during sleep and 21 hours passed without a single check. So the heartbeat
  // is also driven by the system waking and the window regaining focus, with
  // a process-wide floor (shared via the core module) of one automatic check
  // per 4 hours across all windows. Metadata only; showUpdatePill dedupes.
  const HEARTBEAT_MS = 4 * 3600000;
  const maybeHeartbeat = via => {
    const state = core?.runtimeState;
    if (!state || Date.now() - state.lastAutoCheck < HEARTBEAT_MS) {
      return;
    }
    state.lastAutoCheck = Date.now();
    backgroundUpdateCheck(via);
  };
  const updateCheckTimer = window.setTimeout(() => {
    if (core?.runtimeState) {
      core.runtimeState.lastAutoCheck = Date.now();
    }
    backgroundUpdateCheck("boot");
  }, 45000);
  const updateRecheckTimer = window.setInterval(
    () => maybeHeartbeat("heartbeat"),
    HEARTBEAT_MS
  );
  const onWake = () => maybeHeartbeat("wake");
  Services.obs.addObserver(onWake, "wake_notification");
  window.addEventListener("activate", onWake);
  checkZenContract();

  window.addEventListener(
    "unload",
    () => {
      container.removeEventListener("TabOpen", onTabOpen);
      container.removeEventListener("TabClose", onTabClose);
      container.removeEventListener("TabMove", onTabMove);
      window.clearTimeout(moveSettleTimer);
      container.removeEventListener("TabSelect", onTabSelect);
      container.removeEventListener("TabAttrModified", onTabAttrModified);
      container.removeEventListener("TabGroupCollapse", onGroupCollapseChanged);
      container.removeEventListener("TabGroupExpand", onGroupCollapseChanged);
      window.gBrowser.removeTabsProgressListener(progressListener);
      Services.prefs.removeObserver(PREF_PREFIX, prefObserver);
      removeMenu();
      removeRepairEntry();
      uninstallSpaceScopedSwitch();
      clearFocusTimers();
      window.clearInterval(idleSweepTimer);
      recentGroupsBySpace.clear();
      window.clearTimeout(updateCheckTimer);
      window.clearInterval(updateRecheckTimer);
      try {
        Services.obs.removeObserver(onWake, "wake_notification");
      } catch {
        // never registered or already gone
      }
      window.removeEventListener("activate", onWake);
      removeUpdatePill();
      groupLastTouch.clear();
      unregisterPanel();
    },
    { once: true }
  );

  console.log(
    `${LOG} ${VERSION} ready — active Space ${currentSpace()}, ` +
      `grouping ${cfg().enabled ? "on" : "off"}, minTabs ${cfg().minTabs}`
  );

  // Not awaited: the comparison is diagnostic, and grouping must not wait on a
  // file read to start working. The panel reads the result when it opens, by
  // which time this has long finished.
  checkStaleness().then(result => {
    if (result.state === "mismatch") {
      console.warn(
        `${LOG} running ${result.running}, but ${result.installed} is installed. ` +
          `Restart Zen and clear the startup cache (about:support).`
      );
    }
  });

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
    // The result of the startup comparison, for the panel. A getter and not a
    // snapshot: the panel can open before the read has finished, and a copy taken
    // at definition time would be null forever.
    get staleness() {
      return staleness;
    },
    checkStaleness,
    restartToApply,
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
    dumpStrip: () => dumpStrip("manual"),
    checkForUpdate,
    applyUpdate,
    reinstallLatest,
    removeUpdatePill,
    isUpdateDismissed: () => updateDismissed(),
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
