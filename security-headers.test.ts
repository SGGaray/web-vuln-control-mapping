import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import nextConfig from "./next.config.mjs";

function parseHeadersFile(source: string): Map<string, Record<string, string>> {
  const rules = new Map<string, Record<string, string>>();
  let current: Record<string, string> | undefined;
  for (const line of source.split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      current = {};
      rules.set(line.trim(), current);
      continue;
    }
    const separator = line.indexOf(":");
    if (!current || separator === -1) throw new Error(`Unexpected _headers line: ${line}`);
    current[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return rules;
}

describe("security headers", () => {
  it("applies the Next.js response headers to static assets as well", async () => {
    const [rule] = await nextConfig.headers!();
    const expected = Object.fromEntries(rule.headers.map(({ key, value }) => [key, value]));
    const staticRules = parseHeadersFile(
      readFileSync(new URL("./public/_headers", import.meta.url), "utf8")
    );

    expect(rule.source).toBe("/:path*");
    expect(staticRules.get("/*")).toEqual(expected);
    expect(staticRules.get("/_next/static/*")).toEqual({
      "Cache-Control": "public, max-age=31536000, immutable",
    });
  });
});
