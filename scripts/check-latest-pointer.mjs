/**
 * Audits GitHub's latest-release pointer against our own rule.
 *
 * The installers no longer compare versions: they follow the redirect at
 * /releases/latest and install whatever it names. That removes a rule from two
 * languages, and it moves the correctness somewhere else — into the act of
 * publishing. A hotfix for an older line published with `--latest` by mistake
 * would point every fresh install at the LOWER version, and nothing at install
 * time would notice, because nothing at install time compares any more.
 *
 * This is what notices. It asks GitHub which release it calls latest, asks
 * `latestRelease()` — the one implementation of the rule, in zstg-core.mjs,
 * covered by test/release.test.mjs — which release is highest, and fails when
 * the two disagree.
 *
 * It lives here and NOT in verify.mjs on purpose. verify.mjs runs in the
 * pre-commit hook, offline, on every commit and every platform; that property
 * was bought when verify.ps1 was retired, and a network call would sell it back.
 * This belongs to the release step, where the network is already in use and a
 * human is present.
 *
 *   node scripts/check-latest-pointer.mjs
 */

import { latestRelease } from "../src/resources/zstg-core.mjs";

const REPO = "thiago-zampronio/zen-spacekeeper";
const API = `https://api.github.com/repos/${REPO}/releases`;

function fail(message) {
  console.error(`\n[!!] ${message}\n`);
  process.exit(1);
}

const headers = { Accept: "application/vnd.github+json" };

const [listRes, latestRes] = await Promise.all([
  fetch(`${API}?per_page=100`, { headers }),
  fetch(`${API}/latest`, { headers }),
]);

if (!listRes.ok) {
  fail(`could not list releases (HTTP ${listRes.status})`);
}
if (!latestRes.ok) {
  fail(`could not read the latest-release pointer (HTTP ${latestRes.status})`);
}

const all = await listRes.json();
const pointer = (await latestRes.json()).tag_name;
const highest = latestRelease(all)?.tag_name;

if (!highest) {
  fail("no published, non-draft, non-prerelease release exists");
}

if (pointer !== highest) {
  fail(
    `the latest-release pointer names ${pointer}, but the highest version published is ${highest}.\n` +
      `     Every fresh install follows that pointer, so it would install ${pointer}.\n` +
      `     If ${pointer} is a hotfix for an older line, republish it without --latest:\n` +
      `       gh release edit ${pointer} --latest=false\n` +
      `       gh release edit ${highest} --latest`
  );
}

console.log(`[ok] the latest-release pointer names ${pointer}, the highest version published`);
