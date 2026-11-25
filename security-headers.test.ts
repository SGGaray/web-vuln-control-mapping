import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, parseHeadersFile } from "./csp.mjs";

function rulesOf(path: string): Map<string, Record<string, string>> {
  return new Map(
    parseHeadersFile(readFileSync(new URL(path, import.meta.url), "utf8")).map(({ path: rule, headers }: { path: string; headers: [string, string][] }) => [
      rule,
      Object.fromEntries(headers),
    ])
  );
}

describe("security headers", () => {
  it("sends the security headers and the hash-less CSP on every static asset", () => {
    // With the static export, public/_headers is the only source of response
    // headers (formerly mirrored from next.config.mjs headers()).
    const staticRules = rulesOf("./public/_headers");

    // The immutable /_next/static rules are generated per file at build time
    // (csp.mjs); a /_next/static/* wildcard would also cache 404s for a year.
    expect([...staticRules.keys()]).toEqual(["/*", "/opengraph-image"]);
    expect(staticRules.get("/*")).toEqual({
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
      "Content-Security-Policy": buildContentSecurityPolicy([]),
    });
    expect(staticRules.get("/opengraph-image")).toEqual({ "Content-Type": "image/png" });
  });
});
