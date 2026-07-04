"use client";

import { tools, categories } from "@/lib/tools";

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
  return (
    <nav className="flex h-full flex-col">
      {/* Wordmark */}
      <div className="flex items-center gap-2 border-b border-line px-5 py-4">
        <span className="font-mono text-sm text-bright">payload</span>
          <span className="font-mono text-sm text-muted">/</span>
              <span className="font-mono text-sm tracking-wide text-fg">reference</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {categories().map((cat) => (
          <div key={cat} className="mb-5">
            <p className="eyebrow px-2 pb-2">{cat}</p>
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
                        <span className="font-mono text-sm">{t.name}</span>
                      </button>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-line px-5 py-3">
        <p className="font-mono text-[10px] leading-relaxed text-muted">
          For labs and authorized targets only.
        </p>
      </div>
    </nav>
  );
}
