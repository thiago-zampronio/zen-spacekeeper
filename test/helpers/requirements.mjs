/**
 * Requirement tags, validated against the specification.
 *
 * Every test names the requirement it covers, as `capability/Requirement header`
 * taken verbatim from `openspec/specs/<capability>/spec.md`. `req()` resolves the
 * tag and THROWS when it does not exist, so a renamed or deleted requirement
 * breaks the suite instead of leaving a test quietly pointing at nothing.
 *
 * The point is not bookkeeping for its own sake. Line coverage here would measure
 * the pure layer — a tenth of the code — and call it the number; the metric that
 * matches the real problem is how many of the specification's requirements have an
 * automated check at all, and how many still need a person. These tags are what
 * makes that countable.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const specsDir = join(root, "openspec/specs");

function loadRequirements() {
  const map = new Map();
  for (const entry of readdirSync(specsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const text = readFileSync(join(specsDir, entry.name, "spec.md"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = /^### Requirement:\s*(.+?)\s*$/.exec(line);
      if (m) {
        map.set(`${entry.name}/${m[1]}`, { capability: entry.name, requirement: m[1] });
      }
    }
  }
  return map;
}

export const REQUIREMENTS = loadRequirements();

/** The tag, validated. Returns it unchanged so it reads inline in a describe(). */
export function req(tag) {
  if (!REQUIREMENTS.has(tag)) {
    const [capability] = tag.split("/");
    const near = [...REQUIREMENTS.keys()].filter(k => k.startsWith(`${capability}/`));
    throw new Error(
      `Unknown requirement tag: ${JSON.stringify(tag)}\n` +
        (near.length
          ? `Requirements in "${capability}":\n${near.map(k => `  ${k}`).join("\n")}`
          : `No capability "${capability}" under openspec/specs/`)
    );
  }
  return tag;
}

/** Every requirement in the specification, for the coverage inventory. */
export function allRequirements() {
  return [...REQUIREMENTS.keys()].sort();
}
