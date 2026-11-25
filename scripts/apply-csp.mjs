// Runs after `next build` (see the "build" script and csp.mjs). Replaces the
// hash-less Content-Security-Policy in out/_headers with one that carries the
// hashes of this build's inline scripts, adds the immutable caching rules of
// the /_next/static files, then re-reads the exported pages and fails the
// build if any inline script is not covered.
import { readFileSync } from "node:fs";
import { HEADERS_LINE_LIMIT, HEADERS_RULE_LIMIT, CSP_HEADER, applyContentSecurityPolicy, parseHeadersFile, uncoveredInlineScripts } from "../csp.mjs";

const { policy, pages, hashes, headersPath, staticAssets } = applyContentSecurityPolicy("out");
const uncovered = uncoveredInlineScripts("out");
if (uncovered.length > 0) {
  for (const { page, hash } of uncovered) console.error(`CSP: ${page} has an inline script not in the policy: ${hash}`);
  process.exit(1);
}
const rules = parseHeadersFile(readFileSync(headersPath, "utf8")).length;
console.log(`CSP: ${hashes.length} inline script hashes from ${pages.length} pages written to ${headersPath}`);
console.log(`CSP: line ${`  ${CSP_HEADER}: ${policy}`.length}/${HEADERS_LINE_LIMIT} characters; ${rules}/${HEADERS_RULE_LIMIT} header rules (${staticAssets.length} immutable /_next/static files)`);
console.log(`CSP: ${policy.replace(/'sha256-[^']+'( )?/g, "").trim()} (+ ${hashes.length} hashes in script-src)`);
