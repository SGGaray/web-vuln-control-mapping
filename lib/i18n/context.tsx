"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createTranslator,
  type Locale,
  type TranslationKey,
  type TranslationParams,
} from "./index";
import {
  DEFAULT_LOCALE,
  applyLocaleSelection,
  readStoredLocale,
  updateDocumentLanguage,
} from "./storage";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
};

const defaultValue: LocaleContextValue = {
  locale: DEFAULT_LOCALE,
  setLocale: () => undefined,
  t: createTranslator(DEFAULT_LOCALE),
};

const LocaleContext = createContext<LocaleContextValue>(defaultValue);

export function LocaleProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    const stored = readStoredLocale(window.localStorage);
    // The exported HTML is rendered in DEFAULT_LOCALE; the stored choice is
    // only readable in the browser, after hydration. Applying it here costs one
    // re-render on mount and keeps the hydrated markup equal to the static file.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from localStorage after hydration (see above)
    setLocaleState(stored);
    updateDocumentLanguage(document, stored);
  }, []);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(applyLocaleSelection(window.localStorage, document, nextLocale));
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t: createTranslator(locale) }),
    [locale, setLocale]
  );

  useEffect(() => {
    document.title = value.t("document.title");
  }, [value]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}
