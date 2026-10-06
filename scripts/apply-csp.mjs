// Runs after `next build` (see the "build" script and csp.mjs). Adds the
// Content-Security-Policy, with hashes of this build's inline scripts, to the
// routes manifest, then re-reads the built pages and fails the build if any
// inline script is not covered.
import { applyContentSecurityPolicy, uncoveredInlineScripts } from "../csp.mjs";

const { policy, pages, hashes, manifests } = applyContentSecurityPolicy(".next");
const uncovered = uncoveredInlineScripts(".next");
if (uncovered.length > 0) {
  for (const { page, hash } of uncovered) console.error(`CSP: ${page} has an inline script not in the policy: ${hash}`);
  process.exit(1);
}
console.log(`CSP: ${hashes.length} inline script hashes from ${pages.length} pages written to ${manifests.join(", ")}`);
console.log(`CSP: ${policy.replace(/'sha256-[^']+'( )?/g, "").trim()} (+ ${hashes.length} hashes in script-src)`);
