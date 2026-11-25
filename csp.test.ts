import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CSP_DIRECTIVES,
  CSP_HEADER,
  HEADERS_LINE_LIMIT,
  HEADERS_RULE_LIMIT,
  IMMUTABLE_CACHE_CONTROL,
  buildContentSecurityPolicy,
  contentSecurityPolicyOf,
  headersFileProblems,
  inlineScriptHashes,
  parseHeadersFile,
  uncoveredInlineScripts,
  withContentSecurityPolicy,
  withImmutableAssetRules,
} from "./csp.mjs";
import nextConfig from "./next.config.mjs";
import { analyzeHeaderInput } from "./lib/headers";

const EXISTING_HEADERS = [
  "X-Frame-Options",
  "X-Content-Type-Options",
  "Referrer-Policy",
  "Permissions-Policy",
  "Strict-Transport-Security",
];

const sha256 = (text: string) => `'sha256-${createHash("sha256").update(text, "utf8").digest("base64")}'`;

function directives(policy: string): Map<string, string[]> {
  return new Map(
    policy
      .split(";")
      .map((directive) => directive.trim().split(/\s+/))
      .filter((parts) => parts[0])
      .map(([name, ...sources]) => [name, sources])
  );
}

describe("Content-Security-Policy", () => {
  const policy = buildContentSecurityPolicy([sha256("a()"), sha256("b()")]);
  const parsed = directives(policy);

  it("sets every directive the app relies on, once each", () => {
    expect(policy.trim()).not.toBe("");
    const names = policy.split(";").map((directive) => directive.trim().split(/\s+/)[0]);
    expect(new Set(names).size).toBe(names.length);
    expect(parsed.get("default-src")).toEqual(["'self'"]);
    expect(parsed.get("script-src")?.[0]).toBe("'self'");
    expect(parsed.get("style-src")).toEqual(["'self'"]);
    expect(parsed.get("img-src")).toEqual(["'self'"]);
    expect(parsed.get("font-src")).toEqual(["'self'"]);
    expect(parsed.get("connect-src")).toEqual(["'self'"]);
    expect(parsed.get("object-src")).toEqual(["'none'"]);
    expect(parsed.get("base-uri")).toEqual(["'none'"]);
    expect(parsed.get("form-action")).toEqual(["'none'"]);
    expect(parsed.get("frame-ancestors")).toEqual(["'none'"]);
  });

  it("allows inline scripts only by hash, and nothing broad", () => {
    const sources = [...parsed.values()].flat();
    for (const forbidden of ["'unsafe-eval'", "'unsafe-inline'", "'unsafe-hashes'", "'strict-dynamic'", "*", "data:", "blob:", "http:", "https:"]) {
      expect(sources).not.toContain(forbidden);
    }
    expect(sources.filter((source) => source.includes("*"))).toEqual([]);
    expect(parsed.get("script-src")?.slice(1)).toEqual([sha256("a()"), sha256("b()")].sort());
    for (const [name, values] of parsed) {
      if (name !== "script-src") expect(values.some((value) => value.startsWith("'sha256-"))).toBe(false);
    }
  });

  it("is rated as an enforced, non-permissive policy by the app's own Header Analyzer", () => {
    const analysis = analyzeHeaderInput(`HTTP/1.1 200 OK\n${CSP_HEADER}: ${policy}\n`);
    expect(analysis.assessments.find((item) => item.header === "Content-Security-Policy")?.status).toBe("observed");
  });

  it("hashes exactly the inline scripts of a page", () => {
    const html = [
      "<script src=\"/_next/static/chunks/main.js\" async=\"\"></script>",
      "<script>(self.__next_f=self.__next_f||[]).push([0])</script>",
      "<script>self.__next_f.push([1,\"é\"])</script>",
      "<script></script>",
    ].join("");
    expect([...inlineScriptHashes(html)].sort()).toEqual(
      [sha256("(self.__next_f=self.__next_f||[]).push([0])"), sha256("self.__next_f.push([1,\"é\"])")].sort()
    );
  });

  it("is attached to the /* rule of _headers without dropping the existing headers, and replaces itself on a rerun", () => {
    const source = [
      "# comment",
      "/*",
      ...EXISTING_HEADERS.map((key) => `  ${key}: x`),
      "",
      "/_next/static/*",
      "  Cache-Control: public, max-age=31536000, immutable",
      "",
    ].join("\n");
    const once = withContentSecurityPolicy(source, "default-src 'self'");
    const twice = withContentSecurityPolicy(once, "default-src 'none'");
    const rule = twice.split("\n/_next/static/*")[0].split("\n").filter((line) => /^\s+\S/.test(line));
    expect(rule.map((line) => line.trim().split(":")[0])).toEqual([...EXISTING_HEADERS, CSP_HEADER]);
    expect(contentSecurityPolicyOf(twice)).toBe("default-src 'none'");
    expect(twice.split("\n/_next/static/*")[1]).toBe(source.split("\n/_next/static/*")[1]);
    expect(() => withContentSecurityPolicy("/_next/static/*\n  X: y\n", "default-src 'self'")).toThrow();
  });

  it("refuses a policy line longer than Cloudflare's _headers limit", () => {
    const tooMany = Array.from({ length: 40 }, (_, i) => sha256(`s(${i})`));
    expect(() => withContentSecurityPolicy("/*\n  X: y\n", buildContentSecurityPolicy(tooMany))).toThrow(/2000/);
    expect(HEADERS_LINE_LIMIT).toBe(2000);
  });

  it("rejects _headers files Cloudflare would apply differently or that would send two policies", () => {
    expect(HEADERS_RULE_LIMIT).toBe(100);
    expect(headersFileProblems("/*\n  X: y\n")).toEqual([]);
    expect(headersFileProblems(`/*\n  X: ${"a".repeat(HEADERS_LINE_LIMIT)}\n`)).toEqual([expect.stringMatching(/line 2 is \d+ characters/)]);
    const many = Array.from({ length: HEADERS_RULE_LIMIT + 1 }, (_, i) => `/p${i}\n  X: y`).join("\n");
    expect(headersFileProblems(many)).toEqual([`${HEADERS_RULE_LIMIT + 1} rules (limit ${HEADERS_RULE_LIMIT})`]);
    expect(headersFileProblems(`/*\n  ${CSP_HEADER}: a\n/x\n  ${CSP_HEADER}: b\n`)).toContain(`${CSP_HEADER} is set 2 times (/*, /x)`);
    expect(headersFileProblems(`/x\n  ${CSP_HEADER}: a\n`)).toContain(`${CSP_HEADER} is set on /x instead of /*`);
    expect(headersFileProblems("/*\n  X: a\n  x: b\n")).toContain("/* sets x more than once");
    expect(headersFileProblems("/*\n  X: a\n/*\n  Y: b\n")).toContain("rule /* appears more than once");
    expect(() => withContentSecurityPolicy(`/*\n  X: y\n/x\n  ${CSP_HEADER}: b\n`, "default-src 'self'")).toThrow(/set 2 times/);
  });

  it("caches each existing build asset immutably, regenerating the rules on a rerun, and never by wildcard", () => {
    const source = "/*\n  X-Frame-Options: DENY\n";
    const once = withImmutableAssetRules(source, ["/_next/static/b.js", "/_next/static/chunks/a.js"]);
    const twice = withImmutableAssetRules(once, ["/_next/static/c.css"]);
    expect(parseHeadersFile(once).map((rule: { path: string }) => rule.path)).toEqual(["/*", "/_next/static/b.js", "/_next/static/chunks/a.js"]);
    expect(parseHeadersFile(twice)).toEqual([
      { path: "/*", headers: [["X-Frame-Options", "DENY"]] },
      { path: "/_next/static/c.css", headers: [["Cache-Control", IMMUTABLE_CACHE_CONTROL]] },
    ]);
    expect(() => withImmutableAssetRules(`${source}# BEGIN generated by scripts/apply-csp.mjs: one rule per /_next/static file\n`, [])).toThrow(/incomplete/);
    expect(() => withImmutableAssetRules(source, ["/_next/static/:id.js"])).toThrow();
    expect(() => withImmutableAssetRules(source, ["/_next/static/*"])).toThrow();
    const tooMany = Array.from({ length: HEADERS_RULE_LIMIT }, (_, i) => `/_next/static/${i}.js`);
    expect(() => withImmutableAssetRules(source, tooMany)).toThrow(/rules \(limit 100\)/);
  });

  it("keeps the CSP out of next.config.mjs, and public/_headers fails closed with the hash-less policy", () => {
    expect(nextConfig.output).toBe("export");
    expect("headers" in nextConfig).toBe(false);
    const source = readFileSync("public/_headers", "utf8");
    // Without scripts/apply-csp.mjs, out/_headers keeps this policy: the same
    // directives, and no inline script allowed.
    expect(contentSecurityPolicyOf(source)).toBe(buildContentSecurityPolicy([]));
    expect(headersFileProblems(source)).toEqual([]);
    for (const key of EXISTING_HEADERS) expect(source).toContain(`  ${key}: `);
    expect(Object.keys(CSP_DIRECTIVES)).not.toContain("report-uri");
  });

  // Runs against the output of `npm run build` when it is present.
  it.skipIf(!existsSync("out/_headers"))("covers every inline script of the production build", () => {
    const built = readFileSync("out/_headers", "utf8");
    for (const key of EXISTING_HEADERS) expect(built).toContain(`  ${key}: `);
    expect(contentSecurityPolicyOf(built)).toMatch(/^default-src 'self'; script-src 'self' 'sha256-/);
    expect(contentSecurityPolicyOf(built).replace(/ 'sha256-[^']+'/g, "")).toBe(buildContentSecurityPolicy([]));
    expect(headersFileProblems(built)).toEqual([]);
    expect(uncoveredInlineScripts("out")).toEqual([]);
    const immutable = parseHeadersFile(built)
      .filter((rule: { path: string; headers: [string, string][] }) => rule.headers.some(([name, value]) => name === "Cache-Control" && value === IMMUTABLE_CACHE_CONTROL))
      .map((rule: { path: string }) => rule.path);
    expect(immutable.length).toBeGreaterThan(0);
    for (const path of immutable) {
      expect(path).toMatch(/^\/_next\/static\/[\w./-]+$/);
      expect(existsSync(`out${path}`)).toBe(true);
    }
  });
});
