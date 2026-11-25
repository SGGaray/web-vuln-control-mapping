// Content-Security-Policy for the production build.
//
// Every page in this app is exported at build time, and Next.js writes its
// React Server Components payload into each HTML file as inline <script>
// elements (`self.__next_f.push(...)`), plus, with Turbopack (the default
// bundler since Next.js 16), one bootstrap script that lists the page's
// chunks (`globalThis.TURBOPACK.push(...)`). Those scripts are the only inline
// code the app ships: there are no inline styles, no event-handler attributes
// and no third-party origins. The only network calls are Next's same-origin RSC
// fetches; the Hash tool computes digests in the browser and sends nothing.
//
// The usual ways to allow those inline scripts both cost something here:
//   - 'unsafe-inline' allows any injected inline script, which is the main
//     thing a CSP is for.
//   - A per-request nonce needs every page rendered on demand. The pages are
//     static files served from Workers static assets; a nonce would need
//     server code on every request, which this site no longer has.
// A hash allow-list keeps the pages static and allows exactly the inline
// scripts this build produced, and nothing else. The hashes change with every
// build, so they cannot be written by hand: `npm run build` runs `next build`
// (static export to out/) and then scripts/apply-csp.mjs, which hashes the
// inline scripts of every exported HTML file and adds the policy to the /*
// rule of out/_headers. Cloudflare serves exactly those files with that
// header; no code renders pages at request time, so a served page cannot
// carry inline scripts the policy did not hash.
//
// public/_headers carries the same policy without hashes, so the file that
// reaches Cloudflare always has a CSP. If that step did not run (a bare
// `next build`), the deployed pages would keep the hash-less policy: inline
// scripts are blocked and the tools do not hydrate, but nothing is allowed
// that the full policy would block. `next dev` does not read _headers and
// sends no CSP. If the step runs and cannot cover every inline script, or the
// resulting _headers would break one of Cloudflare's limits, it fails the
// build.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

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
  // The RSC payload Next fetches when the 404 page links back home
  // (same-origin). The Hash tool makes no request.
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

function filesUnder(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

const htmlFiles = (dir) => filesUnder(dir).filter((path) => path.endsWith(".html"));

// Limits Cloudflare applies to a _headers file
// (https://developers.cloudflare.com/workers/static-assets/headers/). Wrangler
// does not fail on a line or rule past them: it warns and drops it, so an
// oversized CSP line would deploy pages with no policy at all.
export const HEADERS_LINE_LIMIT = 2000;
export const HEADERS_RULE_LIMIT = 100;

const isRuleLine = (line) => /^\S/.test(line) && !line.startsWith("#");
const isHeaderLine = (line) => /^\s+\S/.test(line) && !line.trim().startsWith("#");

/** The rules of a _headers file, in order: { path, headers: [[name, value]] }. */
export function parseHeadersFile(headersFile) {
  const rules = [];
  for (const line of headersFile.split("\n")) {
    if (isRuleLine(line)) rules.push({ path: line.trim(), headers: [] });
    else if (isHeaderLine(line)) {
      const separator = line.indexOf(":");
      if (rules.length === 0 || separator === -1) throw new Error(`unexpected _headers line: ${line.trim()}`);
      rules.at(-1).headers.push([line.slice(0, separator).trim(), line.slice(separator + 1).trim()]);
    }
  }
  return rules;
}

/**
 * Reasons Cloudflare would not apply a _headers file exactly as written, or
 * would send more than one CSP. Every rule matching a request adds its
 * headers, and a header set by two matching rules is sent twice, so the CSP
 * may appear in one rule only (/*) and once.
 */
export function headersFileProblems(headersFile) {
  const problems = [];
  headersFile.split("\n").forEach((line, index) => {
    if (line.length > HEADERS_LINE_LIMIT) problems.push(`line ${index + 1} is ${line.length} characters (limit ${HEADERS_LINE_LIMIT})`);
  });
  const rules = parseHeadersFile(headersFile);
  if (rules.length > HEADERS_RULE_LIMIT) problems.push(`${rules.length} rules (limit ${HEADERS_RULE_LIMIT})`);
  const paths = rules.map((rule) => rule.path);
  for (const path of new Set(paths)) if (paths.filter((other) => other === path).length > 1) problems.push(`rule ${path} appears more than once`);
  const csp = rules.flatMap((rule) => rule.headers.filter(([name]) => name.toLowerCase() === CSP_HEADER.toLowerCase()).map(() => rule.path));
  if (csp.length > 1) problems.push(`${CSP_HEADER} is set ${csp.length} times (${csp.join(", ")})`);
  if (csp.length === 1 && csp[0] !== "/*") problems.push(`${CSP_HEADER} is set on ${csp[0]} instead of /*`);
  for (const rule of rules) {
    const names = rule.headers.map(([name]) => name.toLowerCase());
    for (const name of new Set(names)) if (names.filter((other) => other === name).length > 1) problems.push(`${rule.path} sets ${name} more than once`);
  }
  return problems;
}

/** Sets (or replaces) the CSP in the /* rule of a _headers file. */
export function withContentSecurityPolicy(headersFile, policy) {
  const lines = headersFile.split("\n");
  const ruleIndex = lines.findIndex((line) => isRuleLine(line) && line.trim() === "/*");
  if (ruleIndex === -1) throw new Error('_headers has no "/*" rule to attach the CSP to');
  let end = ruleIndex + 1;
  while (end < lines.length && isHeaderLine(lines[end])) end++;
  const body = lines.slice(ruleIndex + 1, end).filter((line) => !line.trim().toLowerCase().startsWith(`${CSP_HEADER.toLowerCase()}:`));
  const cspLine = `  ${CSP_HEADER}: ${policy}`;
  if (cspLine.length > HEADERS_LINE_LIMIT) {
    throw new Error(`CSP line is ${cspLine.length} characters; Cloudflare's _headers limit is ${HEADERS_LINE_LIMIT}`);
  }
  const result = [...lines.slice(0, ruleIndex + 1), ...body, cspLine, ...lines.slice(end)].join("\n");
  const problems = headersFileProblems(result);
  if (problems.length > 0) throw new Error(`_headers would not apply as written: ${problems.join("; ")}`);
  return result;
}

/** The CSP value in the /* rule of a _headers file, or "" if there is none. */
export function contentSecurityPolicyOf(headersFile) {
  const rule = parseHeadersFile(headersFile).find((entry) => entry.path === "/*");
  return rule?.headers.find(([name]) => name.toLowerCase() === CSP_HEADER.toLowerCase())?.[1] ?? "";
}

// Build assets under /_next/static have content-hashed names, so browsers may
// cache them for a year without revalidating. The rule is written per file
// rather than as "/_next/static/*": a wildcard would also match URLs that do
// not exist, and Cloudflare would then send the 404 page with the same
// one-year immutable Cache-Control (with OpenNext those 404s were no-store).
// A browser that cached such a 404, for example while an older version was
// live after a rollback, would keep failing to load that chunk once it exists.
export const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";
const GENERATED_BEGIN = "# BEGIN generated by scripts/apply-csp.mjs: one rule per /_next/static file";
const GENERATED_END = "# END generated";

/** Adds (or regenerates) an immutable Cache-Control rule for each given URL path. */
export function withImmutableAssetRules(headersFile, paths) {
  const start = headersFile.indexOf(GENERATED_BEGIN);
  const end = headersFile.indexOf(GENERATED_END);
  if ((start === -1) !== (end === -1) || end < start) throw new Error("_headers has an incomplete generated block");
  const base = start === -1 ? headersFile : headersFile.slice(0, start) + headersFile.slice(end + GENERATED_END.length + 1);
  for (const path of paths) {
    // ":" starts a placeholder and "*" a splat in a _headers path.
    if (!/^\/[\w./-]+$/.test(path)) throw new Error(`cannot write a literal _headers rule for ${path}`);
  }
  const block = [GENERATED_BEGIN, ...[...paths].sort().flatMap((path) => [path, `  Cache-Control: ${IMMUTABLE_CACHE_CONTROL}`]), GENERATED_END, ""].join("\n");
  const result = `${base.replace(/\n*$/, "\n\n")}${block}`;
  const problems = headersFileProblems(result);
  if (problems.length > 0) throw new Error(`_headers would not apply as written: ${problems.join("; ")}`);
  return result;
}

/**
 * Hashes the inline scripts of every exported page in `outDir` and writes the
 * resulting policy into `outDir`/_headers (copied there from public/_headers),
 * together with the immutable caching rule of each /_next/static file.
 */
export function applyContentSecurityPolicy(outDir = "out") {
  const pages = htmlFiles(outDir);
  if (pages.length === 0) throw new Error(`no exported HTML under ${outDir}; run next build first`);
  const headersPath = join(outDir, "_headers");
  if (!existsSync(headersPath)) throw new Error(`${headersPath} is missing; public/_headers must exist`);

  const hashes = new Set();
  for (const page of pages) for (const hash of inlineScriptHashes(readFileSync(page, "utf8"))) hashes.add(hash);
  const policy = buildContentSecurityPolicy(hashes);
  const staticAssets = filesUnder(join(outDir, "_next", "static")).map((path) => `/${relative(outDir, path).split(sep).join("/")}`);
  const withPolicy = withContentSecurityPolicy(readFileSync(headersPath, "utf8"), policy);
  writeFileSync(headersPath, withImmutableAssetRules(withPolicy, staticAssets));
  return { policy, pages, hashes: [...hashes].sort(), headersPath, staticAssets };
}

/** Inline scripts in the exported pages that the policy in out/_headers does not allow. */
export function uncoveredInlineScripts(outDir = "out") {
  const csp = contentSecurityPolicyOf(readFileSync(join(outDir, "_headers"), "utf8"));
  const scriptSrc = csp.split(";").map((directive) => directive.trim()).find((directive) => directive.startsWith("script-src ")) ?? "";
  const allowed = new Set(scriptSrc.split(/\s+/).slice(1));
  return htmlFiles(outDir).flatMap((page) =>
    [...inlineScriptHashes(readFileSync(page, "utf8"))].filter((hash) => !allowed.has(hash)).map((hash) => ({ page, hash }))
  );
}
