import { describe, expect, it } from "vitest";
import { explanations } from "./explain";
import { getMappingBundle } from "./mappings";
import { payloadCategories, payloads } from "./payloads";

const payloadIds = payloads.map(({ id }) => id);
const explanationIds = Object.keys(explanations);

describe("payload content integrity", () => {
  it("keeps the 23 stable payload records unique and fully explained", () => {
    expect(payloads).toHaveLength(23);
    expect(new Set(payloadIds).size).toBe(23);
    expect(explanationIds.sort()).toEqual([...payloadIds].sort());
  });

  it("keeps timing observations conditional and comparative", () => {
    for (const id of ["sqli-time-sleep", "cmd-sleep"]) {
      const explanation = explanations[id];
      expect(explanation.signal).toMatch(/baseline/i);
      expect(explanation.signal).toMatch(/control/i);
      expect(explanation.signal).toMatch(/repeated/i);
      expect(explanation.signal).toMatch(/corroboration/i);
      expect(explanation.limitations).toMatch(/does not confirm/i);
    }
  });

  it("treats an error as a signal rather than SQL injection confirmation", () => {
    const quoteProbe = explanations["sqli-single-quote"];
    expect(quoteProbe.signal).toMatch(/may indicate/i);
    expect(quoteProbe.limitations).toMatch(/not confirmation/i);
  });

  it("distinguishes encoded XSS transport, decoding, sink, and execution", () => {
    const encodedIds = [
      "xss-url-encoded",
      "xss-html-entity",
      "xss-unicode-escape",
    ];

    for (const id of encodedIds) {
      const content = Object.values(explanations[id]).join(" ");
      expect(content).toMatch(/decod/i);
      expect(content).toMatch(/sink|insert/i);
      expect(content).toMatch(/execut|active markup/i);
    }
  });

  it("states SQL dialect and query-shape requirements", () => {
    for (const id of [
      "sqli-or-1-1",
      "sqli-or-comment",
      "sqli-admin-comment",
      "sqli-double-quote",
      "sqli-union-null",
      "sqli-time-sleep",
    ]) {
      expect(explanations[id].preconditions).toMatch(
        /dialect|MySQL|query|SQL/
      );
    }
  });

  it("distinguishes shell, platform, and direct argument execution", () => {
    const commandPayloads = payloads.filter(
      ({ category }) => category === "Command Injection"
    );

    for (const { id } of commandPayloads) {
      const content = Object.values(explanations[id]).join(" ");
      expect(content).toMatch(/shell|cmd\.exe/i);
      expect(content).toMatch(/argument|argv/i);
    }
  });
});

describe("weakness-family control mappings", () => {
  it("resolves every payload without duplicate mappings", () => {
    for (const payload of payloads) {
      const bundle = getMappingBundle(payload.category);
      expect(bundle.weaknessFamily).toBe(payload.category);
      expect(bundle.implementationEvidence).toBe("Not evaluated");
      expect(bundle.effectivenessEvidence).toBe("Not evaluated");

      const keys = bundle.mappings.map(
        ({ framework, version, controlId }) =>
          `${framework}:${version}:${controlId}`
      );
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("uses the required versions, identifiers, and relationships", () => {
    const expected = [
      ["OWASP Top 10", "2021", "A03:2021", "classification"],
      ["NIST SP 800-53", "Rev. 5", "SI-10", "strong"],
      ["NIST SP 800-53", "Rev. 5", "SI-10(6)", "direct"],
      ["ISO/IEC 27001", "2022", "A.8.28", "supporting"],
    ];

    for (const category of payloadCategories) {
      const actual = getMappingBundle(category).mappings.map(
        ({ framework, version, controlId, relationship }) => [
          framework,
          version,
          controlId,
          relationship,
        ]
      );
      expect(actual).toEqual(expected);
    }
  });

  it("includes official provenance, rationale, and a mapping limitation", () => {
    for (const category of payloadCategories) {
      for (const mapping of getMappingBundle(category).mappings) {
        expect(mapping.source.provenance).toBe("Official publisher");
        expect(mapping.source.url).toMatch(
          /^https:\/\/(owasp\.org|csrc\.nist\.gov|www\.iso\.org)\//
        );
        expect(mapping.rationale.length).toBeGreaterThan(40);
        expect(mapping.limitation).toMatch(/not|does not/i);
      }
    }
  });
});
