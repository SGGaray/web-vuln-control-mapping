import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import HeaderAnalyzer from "@/components/tools/HeaderAnalyzer";
import { buildCurlArgv } from "@/lib/commands";
import { computeHashes } from "@/lib/hash";
import { analyzeHeaderInput } from "@/lib/headers";
import { encodeUtf8Base64 } from "@/lib/base64-text";
import { formatJsonText } from "@/lib/json-text";
import { getMappingBundle } from "@/lib/mappings";
import { editResultInput, initialResultState, resolveResult } from "@/lib/result-state";
import { getTool } from "@/lib/tools";
import { createTranslator } from "../index";
import { LocaleProvider } from "../context";
import { getMappingContent, getPayloadContent, payloadContentIds } from ".";
import { payloadCategories, payloads } from "@/lib/payloads";

const ids = payloads.map(({ id }) => id);

describe("localized technical-content parity", () => {
  it("provides complete Spanish content for all 23 payloads", () => {
    expect(payloadContentIds("es-AR")).toHaveLength(23);
    for (const id of ids) {
      const content = getPayloadContent("es-AR", id);
      expect(content.description.length).toBeGreaterThan(20);
      expect(content.summary.length).toBeGreaterThan(20);
      expect(content.why.length).toBeGreaterThan(20);
      expect(content.when.length).toBeGreaterThan(20);
      expect(content.mitigation.length).toBeGreaterThan(20);
      expect(content.limitations.length).toBeGreaterThan(20);
    }
  });

  it("provides complete English content for all 23 payloads", () => {
    expect(payloadContentIds("en")).toHaveLength(23);
    for (const id of ids) {
      const content = getPayloadContent("en", id);
      expect(Object.values(content).every((value) => !value || value.length > 20)).toBe(true);
    }
  });

  it("keeps payload IDs identical across locales", () => {
    expect(payloadContentIds("es-AR").sort()).toEqual([...ids].sort());
    expect(payloadContentIds("en").sort()).toEqual([...ids].sort());
    for (const id of ids) {
      expect(Object.keys(getPayloadContent("es-AR", id)).sort()).toEqual(
        Object.keys(getPayloadContent("en", id)).sort()
      );
    }
  });

  it("keeps each technical payload value independent of locale", () => {
    const values = payloads.map(({ value }) => value);
    for (const id of ids) {
      getPayloadContent("es-AR", id);
      getPayloadContent("en", id);
    }
    expect(payloads.map(({ value }) => value)).toEqual(values);
  });

  it("keeps mapping metadata and relationships independent of locale", () => {
    const before = JSON.stringify(payloadCategories.map(getMappingBundle));
    for (const category of payloadCategories) {
      for (const mapping of getMappingBundle(category).mappings) {
        getMappingContent("es-AR", category, mapping.contentKey);
        getMappingContent("en", category, mapping.contentKey);
      }
    }
    expect(JSON.stringify(payloadCategories.map(getMappingBundle))).toBe(before);
  });

  it("keeps Header Analyzer results identical across locales", () => {
    const input = "HTTP/1.1 200 OK\nX-Content-Type-Options: nosniff";
    const before = analyzeHeaderInput(input);
    createTranslator("es-AR")("headers.states.observed");
    createTranslator("en")("headers.states.observed");
    expect(analyzeHeaderInput(input)).toEqual(before);
  });

  it("keeps hash results independent of locale", () => {
    const before = computeHashes("acción", ["sha256"]);
    createTranslator("en")("hash.title");
    expect(computeHashes("acción", ["sha256"])).toEqual(before);
  });

  it("keeps generated argv independent of locale", () => {
    const options = {
      url: "https://example.com",
      method: "POST" as const,
      header: "X-Test: value",
      body: "payload",
      follow: true,
      insecure: false,
      verbose: false,
    };
    const before = buildCurlArgv(options);
    createTranslator("es-AR")("commands.generated");
    expect(buildCurlArgv(options)).toEqual(before);
  });

  it("keeps lossless JSON output independent of locale", () => {
    const input = '{"n":9007199254740993,"n":1.2300}';
    const before = formatJsonText(input);
    createTranslator("en")("json.title");
    expect(formatJsonText(input)).toBe(before);
  });

  it("keeps Base64 output independent of locale", () => {
    const before = encodeUtf8Base64("acción 🚀");
    createTranslator("es-AR")("base64.title");
    expect(encodeUtf8Base64("acción 🚀")).toBe(before);
  });

  it("provides relationship labels in both languages", () => {
    const es = createTranslator("es-AR");
    const en = createTranslator("en");
    expect(es("mappings.relationship.direct")).toBe("Relación directa");
    expect(en("mappings.relationship.direct")).toBe("Direct relationship");
    expect(es("mappings.relationship.supporting")).toBe("Relación de apoyo");
    expect(en("mappings.relationship.supporting")).toBe("Supporting relationship");
  });

  it("states the mapping and compliance limitation in both languages", () => {
    expect(createTranslator("es-AR")("payloads.mappings.disclaimer")).toContain("no demuestra");
    expect(createTranslator("es-AR")("payloads.mappings.disclaimer")).toContain("compliance");
    expect(createTranslator("en")("payloads.mappings.disclaimer")).toContain("does not show");
    expect(createTranslator("en")("payloads.mappings.disclaimer")).toContain("does not determine compliance");
  });

  it("preserves entered input when presentation locale changes", () => {
    const state = editResultInput(initialResultState<string>(), "entrada técnica");
    createTranslator("es-AR")("common.input");
    createTranslator("en")("common.input");
    expect(state.input).toBe("entrada técnica");
  });

  it("preserves a completed result when presentation locale changes", () => {
    const edited = editResultInput(initialResultState<string>(), "input");
    const state = resolveResult(edited, edited.version, "stable-result");
    createTranslator("es-AR")("common.result");
    createTranslator("en")("common.result");
    expect(state).toMatchObject({ status: "success", result: "stable-result" });
  });

  it("preserves the active tool when presentation locale changes", () => {
    const active = getTool("commands");
    createTranslator("es-AR")("navigation.commands");
    createTranslator("en")("navigation.commands");
    expect(getTool(active.id)).toBe(active);
  });

  it("localizes accessible names with the visible language", () => {
    const es = renderToStaticMarkup(
      <LocaleProvider initialLocale="es-AR">
        <LanguageSwitcher />
        <HeaderAnalyzer />
      </LocaleProvider>
    );
    const en = renderToStaticMarkup(
      <LocaleProvider initialLocale="en">
        <LanguageSwitcher />
        <HeaderAnalyzer />
      </LocaleProvider>
    );
    expect(es).toContain('role="group" aria-label="Idioma"');
    expect(es).toContain("Headers sin procesar");
    expect(en).toContain('role="group" aria-label="Language"');
    expect(en).toContain("Raw headers");
  });
});
