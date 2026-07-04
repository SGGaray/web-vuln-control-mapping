"use client";

import type { ReactNode } from "react";

/**
 * A generic facet filter row.
 *
 * It knows nothing about context, tags, or any specific facet. It just renders
 * a labeled row of toggle chips, each showing a live count, and reports toggles
 * back through onToggle. Both the context and tag filters use this with no
 * special casing.
 */
export type FacetRowProps = {
  label: string; // the row heading, e.g. "Context" or "Tags"
  values: string[]; // every possible value for this facet
  selected: Set<string>; // which values are currently active
  counts: Map<string, number>; // value -> matching count, from the facet utility
  onToggle: (value: string) => void; // called when a chip is clicked
  icon?: ReactNode; // optional glyph shown beside the label
};

export default function FacetRow({
  label,
  values,
  selected,
  counts,
  onToggle,
  icon,
}: FacetRowProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* The icon is just an optional node. Nothing here is facet specific:
          when it is absent, only the label renders. */}
      <span className="eyebrow inline-flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {values.map((value) => {
          const active = selected.has(value);
          const count = counts.get(value) ?? 0;
          return (
            <button
              key={value}
              onClick={() => onToggle(value)}
              aria-pressed={active}
              className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-[11px] transition-colors ${
                active
                  ? "border-bright text-bright"
                  : "border-line text-muted hover:border-muted hover:text-fg"
              } ${count === 0 && !active ? "opacity-40" : ""}`}
            >
              {value}
              {/* Subtle count that never competes with the label. */}
              <span className="tabular-nums opacity-60">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
