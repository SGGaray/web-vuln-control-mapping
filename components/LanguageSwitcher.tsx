"use client";

import { useLocale } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n";

const OPTIONS: { locale: Locale; short: string; nameKey: "language.es" | "language.en" }[] = [
  { locale: "es-AR", short: "ES", nameKey: "language.es" },
  { locale: "en", short: "EN", nameKey: "language.en" },
];

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div role="group" aria-label={t("language.label")} className="flex items-center gap-1">
      {OPTIONS.map((option) => (
        <button
          key={option.locale}
          type="button"
          className={`btn px-2 py-1 ${locale === option.locale ? "border-muted text-bright" : "opacity-60"}`}
          aria-pressed={locale === option.locale}
          aria-label={t(option.nameKey)}
          title={t(option.nameKey)}
          onClick={() => setLocale(option.locale)}
        >
          {option.short}
        </button>
      ))}
    </div>
  );
}

