import { en } from "./en";
import { esAR, type TranslationKey } from "./es-AR";
import { SUPPORTED_LOCALES, type Locale, type TranslationParams } from "./types";

export { DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from "./storage";
export { SUPPORTED_LOCALES, type Locale, type TranslationParams } from "./types";
export type { TranslationKey } from "./es-AR";

const dictionaries: Record<Locale, Record<TranslationKey, string>> = {
  "es-AR": esAR,
  en,
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function translate(
  locale: Locale,
  key: TranslationKey,
  params: TranslationParams = {}
): string {
  return dictionaries[locale][key].replace(/\{(\w+)\}/g, (token, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : token
  );
}

export function createTranslator(locale: Locale) {
  return (key: TranslationKey, params?: TranslationParams) => translate(locale, key, params);
}

export function translationKeys(locale: Locale): string[] {
  return Object.keys(dictionaries[locale]);
}
