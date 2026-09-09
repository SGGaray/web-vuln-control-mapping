import type { Locale } from "./types";

export const DEFAULT_LOCALE: Locale = "es-AR";
export const LOCALE_STORAGE_KEY = "wvcm-locale";

export type LocaleStorage = Pick<Storage, "getItem" | "setItem">;

export function normalizeLocale(value: unknown): Locale {
  return value === "en" || value === "es-AR" ? value : DEFAULT_LOCALE;
}

export function readStoredLocale(storage: LocaleStorage): Locale {
  try {
    return normalizeLocale(storage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function persistLocale(storage: LocaleStorage, locale: Locale): void {
  try {
    storage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage can be unavailable or full; the in-memory selection still works.
  }
}

export function updateDocumentLanguage(
  documentLike: Pick<Document, "documentElement">,
  locale: Locale
): void {
  documentLike.documentElement.lang = locale;
}

export function applyLocaleSelection(
  storage: LocaleStorage,
  documentLike: Pick<Document, "documentElement">,
  locale: Locale
): Locale {
  persistLocale(storage, locale);
  updateDocumentLanguage(documentLike, locale);
  return locale;
}
