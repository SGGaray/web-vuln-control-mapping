import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// out/ is exactly what Cloudflare publishes (wrangler.jsonc assets.directory),
// so anything in it is public. These checks run after `npm run build`.
const OUT = "out";

// Every file the static export is expected to contain. Anything else (a source
// map, a dotfile, a report, a config file) fails the test until it is reviewed
// and added here on purpose.
const ALLOWED = [
  // Next.js 16 exports the not-found page twice: 404.html (served by
  // not_found_handling) and _not-found.html (the internal /_not-found route).
  /^(index|404|_not-found)\.html$/,
  // RSC payloads: the full payload per route, plus Next.js 16's per-segment
  // prefetch files (__next.<segment>.txt).
  /^(index|_not-found)\.txt$/,
  /^(_not-found\/)?__next\.[\w.-]+\.txt$/,
  /^(icon\.svg|opengraph-image|robots\.txt|sitemap\.xml)$/,
  /^_headers$/,
  /^_redirects$/,
  // Turbopack emits CSS under chunks/ and the icon under media/; webpack
  // (`next build --webpack`) uses css/.
  /^_next\/static\/chunks\/[\w/.-]+\.(js|css)$/,
  /^_next\/static\/css\/[\w-]+\.css$/,
  /^_next\/static\/media\/[\w.-]+\.svg$/,
  /^_next\/static\/[\w-]+\/_(buildManifest|ssgManifest|clientMiddlewareManifest)\.js$/,
];

// Text that must never reach a published file.
const FORBIDDEN_CONTENT = [/sourceMappingURL=/, /\/home\/[^/\s"']+\//, /_AUDITS/, /PRIVATE KEY/, /CLOUDFLARE_API_TOKEN/];

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]
  );

/** Static rules of a _redirects file: [from, to, status]. */
function redirectRules(source: string): [string, string, number][] {
  return source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const [from, to, status = "302"] = line.split(/\s+/);
      return [from, to, Number(status)];
    });
}

describe("public/_redirects", () => {
  const rules = redirectRules(readFileSync("public/_redirects", "utf8"));

  it("only rewrites the 404 page's own names to a single unexported path", () => {
    expect(rules.map(([from]) => from)).toEqual(["/404", "/404.html", "/_not-found", "/_not-found.html"]);
    const targets = new Set(rules.map(([, to]) => to));
    expect(targets.size).toBe(1);
    for (const [, to, status] of rules) {
      expect(status).toBe(200);
      expect(to.startsWith("/")).toBe(true);
      expect(to).not.toMatch(/[*:]/);
    }
  });
});

describe.skipIf(!existsSync(join(OUT, "_headers")))("static export (out/)", () => {
  const files = existsSync(OUT) ? walk(OUT).map((path) => relative(OUT, path).split("\\").join("/")) : [];

  it("publishes only expected files: no source maps, dotfiles or private material", () => {
    expect(files.filter((file) => !ALLOWED.some((pattern) => pattern.test(file)))).toEqual([]);
    for (const required of ["index.html", "404.html", "index.txt", "_headers", "_redirects", "robots.txt", "sitemap.xml", "icon.svg", "opengraph-image"]) {
      expect(files).toContain(required);
    }
  });

  it("contains no source map references, local paths or credentials", () => {
    const textFiles = files.filter((file) => file !== "opengraph-image");
    const leaks = textFiles.flatMap((file) => {
      const text = readFileSync(join(OUT, file), "utf8");
      return FORBIDDEN_CONTENT.filter((pattern) => pattern.test(text)).map((pattern) => `${file}: ${pattern}`);
    });
    expect(leaks).toEqual([]);
  });

  it("never exports the 404 rewrite target, so /404 and /404.html stay 404", () => {
    const rules = redirectRules(readFileSync(join(OUT, "_redirects"), "utf8"));
    for (const [, to] of rules) {
      const path = to.replace(/^\//, "");
      expect(files).not.toContain(path);
      expect(files).not.toContain(`${path}.html`);
      expect(files).not.toContain(`${path}/index.html`);
    }
  });

  it("keeps the 404 page out of search results and the home page indexable", () => {
    const notFoundPages = ["404.html", "_not-found.html"].filter((file) => files.includes(file)).map((file) => readFileSync(join(OUT, file), "utf8"));
    const home = readFileSync(join(OUT, "index.html"), "utf8");
    for (const notFound of notFoundPages) expect(notFound).toMatch(/<meta name="robots" content="noindex"\/>/);
    expect(home).not.toMatch(/name="robots"/);
    for (const page of [...notFoundPages, home]) expect(page).toMatch(/^<!DOCTYPE html>(<!--[\w-]+-->)?<html lang="es-AR">/);
  });
});
