// Content-Security-Policy for the production build.
//
// Every page in this app is prerendered at build time, and Next.js writes its
// React Server Components payload into each HTML file as inline <script>
// elements (`self.__next_f.push(...)`). Those scripts are the only inline code
// the app ships: there are no inline styles, no event-handler attributes, no
// third-party origins, and the only network call is same-origin (/api/hash).
//
// The usual ways to allow those inline scripts both cost something here:
//   - 'unsafe-inline' allows any injected inline script, which is the main
//     thing a CSP is for.
//   - A per-request nonce needs every page rendered on demand. The pages are
//     static and served from Workers static assets; turning them dynamic just
//     to stamp a nonce trades a static site for per-request rendering.
// A hash allow-list keeps the pages static and allows exactly the inline
// scripts this build produced, and nothing else. The hashes change with every
// build, so they cannot live in next.config.mjs: `npm run build` runs
// `next build` and then scripts/apply-csp.mjs, which hashes the inline scripts
// of every prerendered HTML file and adds the policy to the routes manifest
// that `next start` and the OpenNext worker both read. OpenNext's build runs
// `npm run build`, so the deployed worker gets the same policy.
//
// If that step does not run (a bare `next build`, or `next dev`), no CSP is
// sent at all, which is how the app behaved before; it never ships a policy
// that blocks its own scripts. If the step runs and cannot cover every inline
// script, it fails the build.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const CSP_HEADER = "Content-Security-Policy";

// Each directive is listed explicitly, even where it repeats default-src, so
// the policy reads as a decision per resource type rather than an inheritance
// puzzle.
export const CSP_DIRECTIVES = Object.freeze({
  "default-src": ["'self'"],
  // Bundles from /_next/static, plus the build's own inline RSC scripts by hash.
  "script-src": ["'self'"],
  // One compiled Tailwind stylesheet; no <style> elements or style attributes.
  "style-src": ["'self'"],
  // Only the same-origin favicon. No data: images.
  "img-src": ["'self'"],
  // The app loads no web fonts (system font stacks only).
  "font-src": ["'self'"],
  // fetch("/api/hash") and the RSC payload Next fetches when the 404 page
  // links back home. Both same-origin.
  "connect-src": ["'self'"],
  "object-src": ["'none'"],
  // No <base> element is used.
  "base-uri": ["'none'"],
  // No <form> element is used.
  "form-action": ["'none'"],
  // Same intent as X-Frame-Options: DENY, which stays for older browsers.
  "frame-ancestors": ["'none'"],
});

const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;

/** SHA-256 CSP source for every inline <script> body in an HTML document. */
export function inlineScriptHashes(html) {
  const hashes = new Set();
  for (const [, body] of html.matchAll(INLINE_SCRIPT)) {
    if (!body) continue;
    hashes.add(`'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`);
  }
  return hashes;
}

export function buildContentSecurityPolicy(scriptHashes = []) {
  const hashes = [...scriptHashes].sort();
  return Object.entries(CSP_DIRECTIVES)
    .map(([name, sources]) => [name, ...sources, ...(name === "script-src" ? hashes : [])].join(" "))
    .join("; ");
}

function htmlFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.name.endsWith(".html") ? [path] : [];
  });
}

/** Adds (or replaces) the CSP on the catch-all header rule of a routes manifest. */
export function withContentSecurityPolicy(manifest, policy) {
  const rule = (manifest.headers ?? []).find((entry) => entry.source === "/:path*");
  if (!rule) throw new Error('routes manifest has no "/:path*" header rule to attach the CSP to');
  const headers = rule.headers.filter((header) => header.key.toLowerCase() !== CSP_HEADER.toLowerCase());
  return {
    ...manifest,
    headers: manifest.headers.map((entry) =>
      entry === rule ? { ...rule, headers: [...headers, { key: CSP_HEADER, value: policy }] } : entry
    ),
  };
}

/**
 * Hashes the inline scripts of every prerendered page in `distDir` and writes
 * the resulting policy into each routes manifest Next produced: the regular
 * one, and the standalone copy OpenNext bundles when it exists.
 */
export function applyContentSecurityPolicy(distDir = ".next") {
  const pages = htmlFiles(join(distDir, "server"));
  if (pages.length === 0) throw new Error(`no prerendered HTML under ${distDir}/server; run next build first`);

  const hashes = new Set();
  for (const page of pages) for (const hash of inlineScriptHashes(readFileSync(page, "utf8"))) hashes.add(hash);
  const policy = buildContentSecurityPolicy(hashes);

  const manifests = [join(distDir, "routes-manifest.json"), join(distDir, "standalone", distDir, "routes-manifest.json")]
    .filter((path) => existsSync(path));
  if (manifests.length === 0) throw new Error(`no routes-manifest.json under ${distDir}`);

  for (const path of manifests) {
    const patched = withContentSecurityPolicy(JSON.parse(readFileSync(path, "utf8")), policy);
    writeFileSync(path, JSON.stringify(patched));
  }
  return { policy, pages, hashes: [...hashes].sort(), manifests };
}

/** Inline scripts in the built pages that the policy in a manifest does not allow. */
export function uncoveredInlineScripts(distDir = ".next") {
  const manifest = JSON.parse(readFileSync(join(distDir, "routes-manifest.json"), "utf8"));
  const rule = manifest.headers.find((entry) => entry.source === "/:path*");
  const csp = rule?.headers.find((header) => header.key === CSP_HEADER)?.value ?? "";
  const scriptSrc = csp.split(";").map((directive) => directive.trim()).find((directive) => directive.startsWith("script-src ")) ?? "";
  const allowed = new Set(scriptSrc.split(/\s+/).slice(1));
  return htmlFiles(join(distDir, "server")).flatMap((page) =>
    [...inlineScriptHashes(readFileSync(page, "utf8"))].filter((hash) => !allowed.has(hash)).map((hash) => ({ page, hash }))
  );
}
