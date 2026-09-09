import { describe, expect, it } from "vitest";
import { filterPayloads } from "./payload-filter";

describe("Payload Reference filtering", () => {
  it("returns all 23 records for the reset state", () => {
    expect(filterPayloads()).toHaveLength(23);
  });

  it("searches payload text, descriptions, and tags", () => {
    expect(filterPayloads({ query: "$(id)" }).map(({ id }) => id)).toEqual(["cmd-subshell"]);
    expect(filterPayloads({ query: "percent-encoded" }).map(({ id }) => id)).toContain(
      "xss-url-encoded"
    );
    expect(filterPayloads({ query: "MYSQL" }).map(({ id }) => id)).toEqual([
      "sqli-time-sleep",
    ]);
    expect(
      filterPayloads({ query: "decodificación de transporte", locale: "es-AR" }).map(
        ({ id }) => id
      )
    ).toEqual(["xss-url-encoded"]);
  });

  it("applies OR within a facet", () => {
    const selected = new Set(["union", "windows"]);
    const result = filterPayloads({ tags: selected });
    expect(result.map(({ id }) => id)).toEqual(["sqli-union-null", "cmd-win-amp"]);
  });

  it("applies AND across facets, category, and search", () => {
    const result = filterPayloads({
      category: "Command Injection",
      contexts: new Set(["URL parameter"]),
      tags: new Set(["blind", "windows"]),
      query: "whoami",
    });
    expect(result.map(({ id }) => id)).toEqual(["cmd-win-amp"]);
  });

  it("returns an empty list when no record matches", () => {
    expect(filterPayloads({ query: "no-such-payload-value" })).toEqual([]);
  });

  it("keeps hostile-looking payloads as exact data", () => {
    expect(filterPayloads({ query: "<script>alert(1)</script>" })[0]?.value).toBe(
      "<script>alert(1)</script>"
    );
  });
});
