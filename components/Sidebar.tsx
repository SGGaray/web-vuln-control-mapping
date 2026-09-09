"use client";

import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLocale } from "@/lib/i18n/context";
import { tools, categories, categoryTranslationKeys } from "@/lib/tools";

/**
 * Left hand navigation. Reads straight from the tool registry and groups
 * entries by category. Purely presentational: it reports the selected id
 * upward and highlights the active one.
 */
export default function Sidebar({
  activeId,
  onSelect,
}: {
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const { t: translate } = useLocale();

  return (
    <nav aria-label={translate("navigation.label")} className="flex h-full flex-col">
      {/* Wordmark */}
      <div className="flex items-center gap-2 border-b border-line px-5 py-4">
        <span className="font-mono text-sm text-bright">{translate("app.title")}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {categories().map((cat) => (
          <div key={cat} className="mb-5">
            <p className="eyebrow px-2 pb-2">{translate(categoryTranslationKeys[cat])}</p>
            <ul className="flex flex-col gap-0.5">
              {tools
                .filter((t) => t.category === cat)
                .map((t) => {
                  const Icon = t.icon;
                  const active = t.id === activeId;
                  return (
                    <li key={t.id}>
                      <button
                        onClick={() => onSelect(t.id)}
                        aria-current={active ? "page" : undefined}
                        className={`group flex w-full items-center gap-3 rounded px-2 py-2 text-left transition-colors ${
                          active
                            ? "bg-raised text-bright"
                            : "text-muted hover:bg-surface hover:text-fg"
                        }`}
                      >
                        {/* Active row gets a bright leading bar, monochrome cue. */}
                        <span
                          className={`h-4 w-px ${active ? "bg-bright" : "bg-transparent"}`}
                        />
                        <Icon size={15} className="shrink-0" />
                        <span className="font-mono text-sm">{translate(t.nameKey)}</span>
                      </button>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t border-line px-5 py-3">
        <LanguageSwitcher />
        <p className="font-mono text-[10px] leading-relaxed text-muted">
          {translate("navigation.authorizedOnly")}
        </p>
      </div>
    </nav>
  );
}
