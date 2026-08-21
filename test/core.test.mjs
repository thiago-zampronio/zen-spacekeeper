import { describe, expect, it } from "vitest";
import {
  keyFromParts,
  makeTestETLD,
  runDerivationTests,
} from "../src/resources/zstg-core.mjs";
import { req } from "./helpers/requirements.mjs";

/**
 * The derivation cases live in `zstg-core.mjs` on purpose: `selfTest()` runs the
 * same table inside the browser against the real `Services.eTLD`, and this run
 * uses the test eTLD under node. Two judges over one table, and a case that
 * passes in only one of them is itself a finding — so the table is NOT moved
 * here, only executed here.
 *
 * What this adds over the run inside verify.mjs is granularity: there, 31 cases
 * collapse into one boolean, and a failure prints a list of names. Here each case
 * is its own test, so a regression names itself and points at the input.
 */

const noRules = {
  rules: [],
  excluded: [],
  groupBySubdomain: false,
  subdomainDomains: [],
  subdomainLabel: "host",
  systemGroup: false,
};

const etld = makeTestETLD();

function keyFromText(url, over) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const c = { ...noRules, ...over };
  const path = u.pathname.replace(/^\/*/, "") || u.hostname;
  return keyFromParts(u.protocol.replace(":", ""), u.hostname, c, etld, path);
}

const cases = runDerivationTests(keyFromText);

describe(req("tab-grouping/Key derivation by domain"), () => {
  it("the shared table is not empty — an empty table would pass every assertion", () => {
    expect(cases.length).toBeGreaterThan(20);
  });

  for (const c of cases) {
    it(c.name, () => {
      expect(c.actual).toEqual(c.expected);
    });
  }
});

// Spot checks written here rather than in the shared table, because they assert
// the harness itself resolves the way the requirement describes — if these drift,
// every case above is measuring the wrong thing.
describe(req("tab-grouping/Handling of compound suffixes"), () => {
  it("keeps the registrable domain for a compound suffix", () => {
    expect(keyFromText("https://www.example.co.uk/x")?.key).toBe("domain:example");
  });
});

describe(req("tab-grouping/Non-groupable URLs"), () => {
  it("refuses a URL that is not a site", () => {
    expect(keyFromText("not a url")).toBeNull();
  });
});

describe(req("tab-grouping/Optional subdomain grouping"), () => {
  it("splits by host only for a domain on the subdomain list", () => {
    const over = { subdomainDomains: ["example.com"], subdomainLabel: "host" };
    expect(keyFromText("https://mail.example.com/x", over)?.key).toBe("host:mail.example.com");
    expect(keyFromText("https://mail.other.com/x", over)?.key).toBe("domain:other");
  });
});
