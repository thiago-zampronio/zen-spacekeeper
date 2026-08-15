/**
 * Spacekeeper core — the pure logic, with no browser API in sight.
 *
 * Imported twice, and that duality is the whole point:
 *   - by the chrome script, via chrome://userchrome/content/zstg-core.mjs
 *   - by scripts/verify.ps1 under plain node, which runs the derivation tests on
 *     every commit without needing a running Zen
 *
 * Nothing here may touch `window`, `Services`, `document` or any Gecko global.
 * Effective-TLD knowledge is injected (`etld`), because the real source is
 * Firefox's Public Suffix List and node has no such thing — tests inject the
 * fixture from makeTestETLD().
 */

export const COLORS = [
  "blue", "purple", "cyan", "orange", "yellow", "pink", "green", "gray", "red",
];

export const GROUPABLE_SCHEMES = new Set(["http", "https"]);

// Browser-internal pages: these share no domain to group by, but they share an
// obvious home — the System group. file: stays out on purpose (user documents,
// not system pages), and about:blank is excluded by path in keyFromParts.
export const SYSTEM_SCHEMES = new Set(["about", "chrome"]);

/**
 * Turns the raw pref text into usable rules. Invalid text never takes grouping
 * down: it becomes an empty list.
 * @param {string} raw
 */
export function parseRules(raw) {
  let list;
  try {
    list = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(list)) {
    return [];
  }
  const rules = [];
  for (const r of list) {
    if (!r || typeof r.name !== "string" || !Array.isArray(r.domains)) {
      continue;
    }
    rules.push({
      name: r.name,
      domains: r.domains.filter(d => typeof d === "string").map(d => d.toLowerCase()),
    });
  }
  return rules;
}

/**
 * Stable FNV-1a hash of a key onto the native palette: same key => same color
 * across Spaces and across sessions. The constants and the COLORS order are
 * stored identity — see the never-rename list in CLAUDE.md.
 */
export function hashColor(key) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return COLORS[Math.abs(h) % COLORS.length];
}

export function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (!d) {
    return { h: 0, s: 0, l };
  }
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) {
    h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  } else if (max === g) {
    h = ((b - r) / d + 2) * 60;
  } else {
    h = ((r - g) / d + 4) * 60;
  }
  return { h, s, l };
}

/**
 * Classifies by hue, not by distance to fixed RGB values: the native colors resolve
 * to tokens that change between light and dark themes, so a fixed table would be
 * right in one theme and wrong in the other.
 */
export function colorName(h) {
  if (h < 15 || h >= 345) return "red";
  if (h < 45) return "orange";
  if (h < 70) return "yellow";
  if (h < 160) return "green";
  if (h < 200) return "cyan";
  if (h < 255) return "blue";
  if (h < 290) return "purple";
  return "pink";
}

/**
 * Derives the group key and label from an already-parsed address.
 *
 * @param {string} scheme
 * @param {string} host
 * @param {object} c resolved configuration: rules, excluded, groupBySubdomain,
 *   subdomainDomains, subdomainLabel, systemGroup
 * @param {{getBaseDomainFromHost: Function, getPublicSuffixFromHost: Function}} etld
 *   Public Suffix knowledge; both methods throw for a host with no known suffix.
 * @param {string} [path] the part after the scheme, used only to keep
 *   about:blank out of the System group.
 * @returns {{key: string, label: string}|null} null when not groupable.
 */
export function keyFromParts(scheme, host, c, etld, path = "") {
  // Internal pages first: they have no host, so the host gate below would drop
  // them. The English label is the pure default; the chrome-side caller swaps it
  // for the catalog's translation. about:blank is a placeholder tabs pass
  // through — grouping it would flicker groups into existence mid-navigation.
  if (c.systemGroup && SYSTEM_SCHEMES.has(scheme)) {
    if (scheme === "about" && (path === "" || path === "blank")) {
      return null;
    }
    return { key: "system:", label: "System" };
  }
  if (!GROUPABLE_SCHEMES.has(scheme) || !host) {
    return null;
  }
  host = host.toLowerCase();

  const withoutWww = host.startsWith("www.") ? host.slice(4) : host;

  // Exclusion: matches the host or any parent domain
  for (const excluded of c.excluded) {
    if (withoutWww === excluded || withoutWww.endsWith("." + excluded)) {
      return null;
    }
  }

  // Custom rules take precedence over the domain
  for (const rule of c.rules) {
    for (const d of rule.domains) {
      if (withoutWww === d || withoutWww.endsWith("." + d)) {
        return { key: `rule:${rule.name}`, label: rule.name };
      }
    }
  }

  // The injected etld carries the real Public Suffix List in the browser — it
  // covers .com.br, .co.uk and the like without a list of our own.
  let base = withoutWww;
  let suffix = "";
  try {
    base = etld.getBaseDomainFromHost(withoutWww);
    suffix = etld.getPublicSuffixFromHost(withoutWww);
  } catch {
    // Host with no known suffix (IP, intranet): use the whole host
    return { key: `host:${withoutWww}`, label: withoutWww };
  }

  const withoutSuffix = t =>
    suffix && t.endsWith("." + suffix) ? t.slice(0, -(suffix.length + 1)) : t;

  const domain = withoutSuffix(base) || base;

  // Host granularity: from the global switch, or because the site is in the list
  const inList = c.subdomainDomains.some(
    d => withoutWww === d || withoutWww.endsWith("." + d)
  );

  if (c.groupBySubdomain || inList) {
    // The label is presentation only; the key is always the host, so switching
    // styles never regroups anything.
    let label;
    if (c.subdomainLabel === "sub") {
      const sub = withoutWww.endsWith("." + base)
        ? withoutWww.slice(0, -(base.length + 1))
        : "";
      // A host with no subdomain would yield an empty label; fall back to the domain.
      label = sub || domain;
    } else {
      label = withoutSuffix(withoutWww) || withoutWww;
    }
    return { key: `host:${withoutWww}`, label };
  }

  return { key: `domain:${domain}`, label: domain };
}

/**
 * A Public Suffix fixture for the derivation tests, NOT for production: the real
 * list lives in Firefox. Longest-match over a handful of suffixes, throwing for an
 * unknown one — the same contract Services.eTLD exposes.
 */
export function makeTestETLD(suffixes = ["com.br", "co.uk", "com", "org", "net"]) {
  const suffixOf = host => {
    let best = null;
    for (const s of suffixes) {
      if (host === s || host.endsWith("." + s)) {
        if (!best || s.length > best.length) {
          best = s;
        }
      }
    }
    if (!best || host === best) {
      throw new Error(`no known suffix for ${host}`);
    }
    return best;
  };
  return {
    getPublicSuffixFromHost: suffixOf,
    getBaseDomainFromHost(host) {
      const suffix = suffixOf(host);
      const rest = host.slice(0, -(suffix.length + 1));
      const lastLabel = rest.split(".").pop();
      return `${lastLabel}.${suffix}`;
    },
  };
}

/**
 * The deterministic derivation cases, shared by ZSTG.selfTest() (real Services.eTLD)
 * and by verify.ps1 under node (makeTestETLD fixture). One list, two judges: a case
 * that only passes in one of them is itself a finding.
 *
 * @param {(url: string, over?: object) => {key,label}|null} keyFromText an
 *   implementation that resolves a URL string with the given config overrides
 *   applied on top of a no-rules baseline.
 * @returns {{name: string, ok: boolean, actual: *, expected: *}[]}
 */
export function runDerivationTests(keyFromText) {
  const cases = [];
  const check = (name, actual, expected) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    cases.push({ name, ok, actual, expected });
  };

  const k = (url, over) => keyFromText(url, over)?.key ?? null;
  const lbl = (url, over) => keyFromText(url, over)?.label ?? null;

  // Domain derivation
  check("strips www", k("https://www.github.com/x"), "domain:github");
  check("ignores path", k("https://github.com/org/repo?tab=issues"), "domain:github");
  check("label without suffix", lbl("https://www.youtube.com/watch?v=1"), "youtube");

  // Compound suffix via the injected Public Suffix source
  check("compound suffix", k("https://shop.example.com.br/p"), "domain:example");
  check(
    "same name under different TLDs matches",
    k("https://youtube.com") === k("https://youtube.com.br"),
    true
  );

  // Non-groupable schemes (the baseline config has systemGroup off)
  check("ignores about: when the system group is off", k("about:config"), null);
  check("ignores file:", k("file:///C:/temp/nota.html"), null);

  // The System group
  const sys = { systemGroup: true };
  check("system group: about page joins", k("about:config", sys), "system:");
  check("system group: chrome page joins", k("chrome://browser/content/browser.xhtml", sys), "system:");
  check("system group: one shared key", k("about:config", sys) === k("about:preferences", sys), true);
  check("system group: English label by default", lbl("about:config", sys), "System");
  check("system group: about:blank stays out", k("about:blank", sys), null);
  check("system group: files stay out", k("file:///C:/temp/nota.html", sys), null);

  // Subdomain
  check(
    "subdomain splits",
    k("https://mail.google.com", { groupBySubdomain: true }) !==
      k("https://drive.google.com", { groupBySubdomain: true }),
    true
  );
  check(
    "no subdomain joins",
    k("https://mail.google.com") === k("https://drive.google.com"),
    true
  );

  // Subdomain for a specific site
  const googleOnly = { subdomainDomains: ["google.com"] };
  check(
    "listed site splits subdomains",
    k("https://mail.google.com", googleOnly) !== k("https://drive.google.com", googleOnly),
    true
  );
  check(
    "unlisted site stays grouped by site",
    k("https://a.example.com", googleOnly) === k("https://b.example.com", googleOnly),
    true
  );
  check("host label style", lbl("https://mail.google.com", googleOnly), "mail.google");
  check(
    "subdomain label style",
    lbl("https://mail.google.com", { ...googleOnly, subdomainLabel: "sub" }),
    "mail"
  );
  check(
    "host without subdomain uses short label",
    lbl("https://google.com", { ...googleOnly, subdomainLabel: "sub" }),
    "google"
  );
  check(
    "label style does not change the key",
    k("https://mail.google.com", googleOnly) ===
      k("https://mail.google.com", { ...googleOnly, subdomainLabel: "sub" }),
    true
  );

  // Custom rules
  const devRule = [{ name: "Dev", domains: ["github.com", "stackoverflow.com"] }];
  check(
    "rule groups different sites",
    k("https://github.com/x", { rules: devRule }) ===
      k("https://stackoverflow.com/q", { rules: devRule }),
    true
  );
  check(
    "rule takes precedence",
    k("https://github.com/x", { rules: devRule }),
    "rule:Dev"
  );

  // Exclusions
  check(
    "excluded site",
    k("https://bank.com.br/account", { excluded: ["bank.com.br"] }),
    null
  );
  check(
    "subdomain of excluded site",
    k("https://app.bank.com.br/x", { excluded: ["bank.com.br"] }),
    null
  );

  // Invalid configuration
  check("broken customRules becomes empty list", parseRules("{this is not json"), []);
  check("non-array customRules becomes empty list", parseRules('{"a":1}'), []);
  check(
    "malformed rule is discarded",
    parseRules('[{"name":"ok","domains":["a.com"]},{"name":123}]'),
    [{ name: "ok", domains: ["a.com"] }]
  );

  // Hash color: deterministic and always on the native palette
  check("hash color is on the palette", COLORS.includes(hashColor("domain:zzz-test")), true);
  check("hash color is stable", hashColor("domain:github") === hashColor("domain:github"), true);

  return cases;
}
