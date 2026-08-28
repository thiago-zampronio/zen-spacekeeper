import { describe, expect, it } from "vitest";
import { isNewerVersion, latestRelease } from "../src/resources/zstg-core.mjs";
import { req } from "./helpers/requirements.mjs";

/**
 * These cases exist because of a defect found by reading, not by running.
 *
 * `checkForUpdate` used to pick its head as `newer[0] ?? releases[0]` — the
 * version-sorted first of the releases newer than the running one, falling back
 * to the API's chronological first. The update path never exercised that
 * fallback: it only acts when something newer exists. The repair does the
 * opposite, running precisely when nothing is newer, and there the fallback
 * hands back whatever was published most recently — which, after a hotfix on an
 * older line, is a lower version than the one installed.
 *
 * The table below is the shape of that mistake, so it cannot come back quietly.
 */

const rel = (tag, extra = {}) => ({ tag_name: tag, ...extra });

describe(req("self-update/Updates come from a release, not a branch"), () => {
  it("takes the highest version, not the most recently published", () => {
    // Chronological order, newest first, as the GitHub API returns it: the
    // hotfix for the old line went out after the bigger release.
    const releases = [rel("v0.59.2"), rel("v0.60.0"), rel("v0.59.1")];
    // Asserted, not assumed: the chronological head really is the wrong answer
    // here, so this case would fail against the old fallback rather than pass
    // for the same reason under both.
    expect(releases[0].tag_name).toBe("v0.59.2");
    expect(latestRelease(releases)?.tag_name).toBe("v0.60.0");
  });

  it("agrees with the chronological head when the two coincide", () => {
    const releases = [rel("v0.60.0"), rel("v0.59.1")];
    expect(latestRelease(releases)?.tag_name).toBe("v0.60.0");
  });

  it("ignores drafts and prereleases", () => {
    const releases = [
      rel("v0.61.0", { draft: true }),
      rel("v0.61.0-rc1", { prerelease: true }),
      rel("v0.60.0"),
    ];
    expect(latestRelease(releases)?.tag_name).toBe("v0.60.0");
  });

  it("tolerates a tag with no v, and an entry with no tag at all", () => {
    const releases = [rel("0.60.0"), rel(""), { draft: false }];
    expect(latestRelease(releases)?.tag_name).toBe("0.60.0");
  });

  it("has no head when there is nothing publishable", () => {
    expect(latestRelease([])).toBeNull();
    expect(latestRelease(undefined)).toBeNull();
    expect(latestRelease([rel("v1.0.0", { draft: true })])).toBeNull();
  });

  it("orders by number and not by string — 0.10.0 is newer than 0.9.0", () => {
    // The case a lexicographic comparison gets wrong, and the one a table of
    // single-digit versions would never catch.
    expect(isNewerVersion("0.10.0", "0.9.0")).toBe(true);
    expect(isNewerVersion("0.9.0", "0.10.0")).toBe(false);
    expect(latestRelease([rel("v0.9.0"), rel("v0.10.0")])?.tag_name).toBe("v0.10.0");
  });

  it("treats a missing segment as zero, so 0.60 and 0.60.0 are the same version", () => {
    expect(isNewerVersion("0.60", "0.60.0")).toBe(false);
    expect(isNewerVersion("0.60.0", "0.60")).toBe(false);
  });

  it("is false for equal versions, so a repair never reads as an update", () => {
    expect(isNewerVersion("0.59.1", "0.59.1")).toBe(false);
  });
});
