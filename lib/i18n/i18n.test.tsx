import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { analyzeHeaderInput } from "@/lib/headers";
import { getTool } from "@/lib/tools";
import { LocaleProvider } from "./context";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  applyLocaleSelection,
  normalizeLocale,
  persistLocale,
  readStoredLocale,
  updateDocumentLanguage,
} from "./storage";
import { createTranslator, translationKeys } from "./index";

function memoryStorage(initial: string | null = null) {
  let value = initial;
  return {
    getItem: (key: string) => (key === LOCALE_STORAGE_KEY ? value : null),
    setItem: (key: string, next: string) => {
      if (key === LOCALE_STORAGE_KEY) value = next;
    },
    value: () => value,
  };
}

function documentStub(initial = "") {
  return { documentElement: { lang: initial } } as Pick<Document, "documentElement">;
}

describe("locale contract", () => {
  it("uses es-AR as the deterministic default locale", () => {
    expect(DEFAULT_LOCALE).toBe("es-AR");
    expect(normalizeLocale(null)).toBe("es-AR");
    expect(createTranslator(DEFAULT_LOCALE)("headers.states.observed")).toBe("Observado");
  });

  it("supports English as a selectable locale", () => {
    expect(normalizeLocale("en")).toBe("en");
    expect(createTranslator("en")("headers.states.observed")).toBe("Observed");
  });

  it("falls back to es-AR for an invalid stored locale", () => {
    expect(readStoredLocale(memoryStorage("fr"))).toBe("es-AR");
    expect(readStoredLocale(memoryStorage("garbage"))).toBe("es-AR");
  });

  it("persists a valid selection under the stable localStorage key", () => {
    const storage = memoryStorage();
    persistLocale(storage, "en");
    expect(storage.value()).toBe("en");
    expect(readStoredLocale(storage)).toBe("en");
  });

  it("switches from ES to EN without altering unrelated state", () => {
    const storage = memoryStorage("es-AR");
    const documentLike = documentStub("es-AR");
    expect(applyLocaleSelection(storage, documentLike, "en")).toBe("en");
    expect(storage.value()).toBe("en");
  });

  it("switches from EN to ES without altering unrelated state", () => {
    const storage = memoryStorage("en");
    const documentLike = documentStub("en");
    expect(applyLocaleSelection(storage, documentLike, "es-AR")).toBe("es-AR");
    expect(storage.value()).toBe("es-AR");
  });

  it("does not change the active tool when presentation locale changes", () => {
    const activeTool = getTool("headers");
    createTranslator("es-AR")("navigation.headers");
    createTranslator("en")("navigation.headers");
    expect(getTool(activeTool.id)).toBe(activeTool);
    expect(activeTool.id).toBe("headers");
  });

  it("does not translate or change technical assessment state", () => {
    const analysis = analyzeHeaderInput(
      "HTTP/1.1 200 OK\nStrict-Transport-Security: max-age=31536000"
    );
    const state = analysis.assessments[0].status;
    expect(state).toBe("observed");
    expect(createTranslator("es-AR")("headers.states.observed")).toBe("Observado");
    expect(createTranslator("en")("headers.states.observed")).toBe("Observed");
    expect(analysis.assessments[0].status).toBe(state);
  });

  it("updates the document language to match the visible locale", () => {
    const documentLike = documentStub("es-AR");
    updateDocumentLanguage(documentLike, "en");
    expect(documentLike.documentElement.lang).toBe("en");
    updateDocumentLanguage(documentLike, "es-AR");
    expect(documentLike.documentElement.lang).toBe("es-AR");
  });

  it("gives the language selector a localized accessible name", () => {
    const markup = renderToStaticMarkup(createElement(LanguageSwitcher));
    expect(markup).toContain('role="group"');
    expect(markup).toContain('aria-label="Idioma"');
    expect(markup).toContain('aria-label="Español"');
    expect(markup).toContain('aria-label="English"');
  });

  it("uses native buttons with pressed state for keyboard operation", () => {
    const markup = renderToStaticMarkup(
      <LocaleProvider initialLocale="en">
        <LanguageSwitcher />
      </LocaleProvider>
    );
    expect(markup.match(/<button/g)).toHaveLength(2);
    expect(markup).toContain('type="button"');
    expect(markup).toContain('aria-pressed="true" aria-label="English"');
    expect(markup).toContain('role="group" aria-label="Language"');
  });

  it("defines the same global translation keys in both languages", () => {
    const esKeys = translationKeys("es-AR").sort();
    const enKeys = translationKeys("en").sort();
    expect(enKeys).toEqual(esKeys);
    expect(esKeys).toEqual(expect.arrayContaining([
      "app.title",
      "common.copy",
      "navigation.payloads",
      "headers.states.observed",
      "commands.method",
      "mappings.relationship.direct",
    ]));
  });
});
