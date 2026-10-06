import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CSP_DIRECTIVES,
  CSP_HEADER,
  buildContentSecurityPolicy,
  inlineScriptHashes,
  uncoveredInlineScripts,
  withContentSecurityPolicy,
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

  it("is attached to the catch-all rule without dropping the existing headers, and replaces itself on a rerun", () => {
    const manifest = {
      version: 3,
      headers: [{ source: "/:path*", regex: "^.*$", headers: EXISTING_HEADERS.map((key) => ({ key, value: "x" })) }],
    };
    const once = withContentSecurityPolicy(manifest, "default-src 'self'");
    const twice = withContentSecurityPolicy(once, "default-src 'none'");
    const keys = twice.headers[0].headers.map((header: { key: string }) => header.key);
    expect(keys).toEqual([...EXISTING_HEADERS, CSP_HEADER]);
    expect(twice.headers[0].headers.at(-1)).toEqual({ key: CSP_HEADER, value: "default-src 'none'" });
    expect(twice.headers[0].regex).toBe("^.*$");
    expect(() => withContentSecurityPolicy({ headers: [] }, "default-src 'self'")).toThrow();
  });

  it("keeps the CSP out of next.config.mjs and the existing headers in it", async () => {
    const [rule] = await nextConfig.headers!();
    const keys = rule.headers.map(({ key }) => key);
    expect(keys).toEqual(EXISTING_HEADERS);
    expect(Object.keys(CSP_DIRECTIVES)).not.toContain("report-uri");
  });

  // Runs against the output of `npm run build` when it is present.
  it.skipIf(!existsSync(".next/routes-manifest.json"))("covers every inline script of the production build", () => {
    const manifest = JSON.parse(readFileSync(".next/routes-manifest.json", "utf8"));
    const rule = manifest.headers.find((entry: { source: string }) => entry.source === "/:path*");
    const keys = rule.headers.map((header: { key: string }) => header.key);
    expect(keys).toEqual([...EXISTING_HEADERS, CSP_HEADER]);
    expect(uncoveredInlineScripts(".next")).toEqual([]);
  });
});
