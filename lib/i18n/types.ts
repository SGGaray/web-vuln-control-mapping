export const SUPPORTED_LOCALES = ["es-AR", "en"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export type TranslationParams = Record<string, string | number>;

