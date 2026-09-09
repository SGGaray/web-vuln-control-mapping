"use client";

import {
  Fragment,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { ShieldAlert, Search, X, Crosshair, ChevronDown } from "lucide-react";
import { ToolShell } from "@/components/ui/ToolShell";
import CopyButton from "@/components/ui/CopyButton";
import {
  payloads,
  payloadCategories,
  payloadContexts,
  allTags,
  type PayloadRecord,
} from "@/lib/payloads";
import {
  getMappingBundle,
  type MappingRelationship,
} from "@/lib/mappings";
import { filterData, countValues } from "@/lib/facets";
import {
  buildPayloadPredicates,
  getPayloadContextValues,
  getPayloadTagValues,
  type PayloadCategoryFilter,
} from "@/lib/payload-filter";
import FacetRow from "@/components/ui/FacetRow";
import { useLocale } from "@/lib/i18n/context";
import { payloadContextKey, relationshipKey } from "@/lib/i18n/presentation";
import type { PayloadContext } from "@/lib/payloads";
import { getMappingContent, getPayloadContent } from "@/lib/i18n/content";

// Returns a toggler that adds or removes a value in a Set backed filter,
// producing a fresh Set so React sees a new reference. Shared by every facet.
function makeToggle(setter: Dispatch<SetStateAction<Set<string>>>) {
  return (value: string) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
}

function relationshipStyle(relationship: MappingRelationship): string {
  switch (relationship) {
    case "direct":
      return "border-bright bg-bright text-base";
    case "strong":
      return "border-muted bg-raised text-bright";
    case "classification":
      return "border-muted text-fg";
    case "supporting":
      return "border-line text-muted";
  }
}

function ExplainDetails({ payload }: { payload: PayloadRecord }) {
  const { locale, t } = useLocale();
  const explanation = getPayloadContent(locale, payload.id);
  const bundle = getMappingBundle(payload.category);

  return (
    <div className="flex flex-col gap-3 rounded border border-line bg-base/40 p-3">
      {(
        [
          ["payloads.details.summary", explanation.summary],
          ["payloads.details.why", explanation.why],
          ["payloads.details.when", explanation.when],
          ["payloads.details.preconditions", explanation.preconditions],
          ["payloads.details.signal", explanation.signal],
          ["payloads.details.limitations", explanation.limitations],
        ] as const
      ).map(([labelKey, value]) =>
        value ? (
          <div key={labelKey} className="flex flex-col gap-1">
            <span className="eyebrow">{t(labelKey)}</span>
            <p className="text-sm text-fg">{value}</p>
          </div>
        ) : null
      )}

      <div className="flex flex-col gap-1 border-t border-line pt-3">
        <span className="eyebrow text-bright">{t("payloads.details.mitigation")}</span>
        <p className="text-sm text-fg">{explanation.mitigation}</p>
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-3">
        <div className="flex flex-col gap-1">
          <span className="eyebrow text-bright">{t("payloads.mappings.title")}</span>
          <p className="text-xs leading-relaxed text-muted">
            {t("payloads.mappings.disclaimer")}
          </p>
          <div className="flex flex-wrap gap-2 font-mono text-[10px] text-muted">
            <span>{t("common.implementationEvidence")}: {t("common.notEvaluated")}</span>
            <span aria-hidden="true">·</span>
            <span>{t("common.effectivenessEvidence")}: {t("common.notEvaluated")}</span>
          </div>
        </div>

        {bundle.mappings.map((mapping) => {
          const content = getMappingContent(locale, payload.category, mapping.contentKey);
          return (
            <section
              key={`${mapping.framework}:${mapping.controlId}`}
              className="flex flex-col gap-2 rounded border border-line bg-surface p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-bright">
                  {mapping.framework} {mapping.version} · {mapping.controlId}
                </span>
                <span
                  className={`rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${relationshipStyle(
                    mapping.relationship
                  )}`}
                >
                  {t(relationshipKey(mapping.relationship))}
                </span>
              </div>
              <p className="text-xs font-medium text-fg">{mapping.title}</p>
              <p className="text-xs leading-relaxed text-fg">{content.rationale}</p>
              <p className="text-xs leading-relaxed text-muted">
                {t("common.limitation")}: {content.limitation}
              </p>
              <a
                href={mapping.source.url}
                target="_blank"
                rel="noreferrer"
                className="w-fit font-mono text-[10px] text-muted underline decoration-line underline-offset-4 hover:text-bright"
              >
                {t("common.source")}: {mapping.source.label} ·{" "}
                {t("mappings.provenance.official")}
              </a>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Wrap every occurrence of `query` in `text` with a highlight mark.
 * Uses case insensitive indexOf splitting rather than a regex, so payloads
 * full of special characters like $(id) or ' OR '1'='1 never break the match.
 */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;

  const haystack = text.toLowerCase();
  const needle = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let match = haystack.indexOf(needle);
  let key = 0;

  while (match !== -1) {
    // Plain text before the match.
    if (match > cursor) parts.push(text.slice(cursor, match));
    // The matched slice, kept in its original casing.
    parts.push(
      <mark
        key={key++}
        className="rounded-[2px] bg-bright px-[1px] text-base"
      >
        {text.slice(match, match + needle.length)}
      </mark>
    );
    cursor = match + needle.length;
    match = haystack.indexOf(needle, cursor);
  }
  // Whatever is left after the last match.
  parts.push(text.slice(cursor));

  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>{part}</Fragment>
      ))}
    </>
  );
}

export default function PayloadGenerator() {
  const { locale, t } = useLocale();
  const [category, setCategory] = useState<PayloadCategoryFilter>("All");
  // A set of active tag filters. Empty means "no tag filter".
  const [tags, setTags] = useState<Set<string>>(new Set());
  // A set of active context filters, same OR behavior as tags.
  const [contexts, setContexts] = useState<Set<string>>(new Set());
  // Free text search. Filtering runs on every keystroke, no debounce needed
  // since the dataset is small and the work is a few string includes.
  const [query, setQuery] = useState("");

  const tagList = useMemo(() => allTags(), []);

  // Normalized search term, computed once per render.
  const q = query.trim().toLowerCase();

  // One toggle helper for any Set backed filter. Both facets use it, so the
  // add/remove logic lives in a single place.
  const toggleTag = makeToggle(setTags);
  const toggleContext = makeToggle(setContexts);

  // Which cards have their Explain panel open. Reuses the same Set toggle.
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const toggleExplain = makeToggle(setOpenIds);

  function reset() {
    setCategory("All");
    setTags(new Set());
    setContexts(new Set());
    setQuery("");
  }

  const filtersActive =
    category !== "All" || tags.size > 0 || contexts.size > 0 || q !== "";

  // Context counts: everything except the context facet. Recomputes only when
  // category, search, or the tag selection changes.
  const contextCounts = useMemo(
    () =>
      countValues(
        payloads,
        [{ values: getPayloadTagValues, selected: tags }],
        buildPayloadPredicates(category, q, locale),
        getPayloadContextValues
      ),
    [category, locale, q, tags]
  );

  // Tag counts: everything except the tag facet. Recomputes only when
  // category, search, or the context selection changes.
  const tagCounts = useMemo(
    () =>
      countValues(
        payloads,
        [{ values: getPayloadContextValues, selected: contexts }],
        buildPayloadPredicates(category, q, locale),
        getPayloadTagValues
      ),
    [category, locale, q, contexts]
  );

  // The visible list applies both facets plus the predicates.
  const filtered = useMemo(
    () =>
      filterData(
        payloads,
        [
          { values: getPayloadContextValues, selected: contexts },
          { values: getPayloadTagValues, selected: tags },
        ],
        buildPayloadPredicates(category, q, locale)
      ),
    [category, locale, q, contexts, tags]
  );

  return (
    <ToolShell title={t("payloads.title")} blurb={t("payloads.description")}>
      {/* Scope reminder. This module is a study aid, nothing here runs. */}
      <div className="flex items-start gap-2 rounded border border-line bg-raised px-3 py-2.5 text-sm">
        <ShieldAlert size={15} className="mt-0.5 shrink-0 text-muted" />
        <p className="font-mono text-xs leading-relaxed text-muted">
          {t("payloads.scope")}
        </p>
      </div>

      {/* Real time search across payload, description, and tags. */}
      <div className="relative">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("payloads.searchPlaceholder")}
          aria-label={t("payloads.searchLabel")}
          className="io pl-9 pr-9"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label={t("payloads.clearSearch")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-bright"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1">
        {(["All", ...payloadCategories] as PayloadCategoryFilter[]).map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`btn ${
              category === c ? "border-muted text-bright bg-raised" : "opacity-60"
            }`}
          >
            {c === "All" ? t("payloads.all") : c}
          </button>
        ))}
      </div>

      {/* Both facets render through the same generic component. */}
      <FacetRow
        label={t("payloads.context")}
        icon={<Crosshair size={11} />}
        values={payloadContexts}
        selected={contexts}
        counts={contextCounts}
        onToggle={toggleContext}
        valueLabel={(value) => t(payloadContextKey(value as PayloadContext))}
      />

      <FacetRow
        label={t("payloads.tags")}
        values={tagList}
        selected={tags}
        counts={tagCounts}
        onToggle={toggleTag}
      />

      {/* Result count and reset */}
      <div className="flex items-center justify-between">
        <span className="eyebrow">
          {t(filtered.length === 1 ? "payloads.count.one" : "payloads.count.other", {
            count: filtered.length,
          })}
        </span>
        {filtersActive && (
          <button onClick={reset} className="btn">
            {t("payloads.reset")}
          </button>
        )}
      </div>

      {/* Payload cards */}
      <div className="flex flex-col gap-3">
        {filtered.map((p) => {
          const content = getPayloadContent(locale, p.id);
          return (
            <article
              key={p.id}
              className="flex flex-col gap-3 rounded border border-line bg-surface p-3"
            >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="eyebrow">{p.category}</span>
                {/* Context badge. Filled to set it apart from the outline
                    tag chips, and clickable to filter by that context. */}
                <button
                  onClick={() => toggleContext(p.context)}
                  className="inline-flex items-center gap-1 rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-[10px] text-fg hover:border-muted hover:text-bright"
                  title={t("payloads.filterBy", {
                    value: t(payloadContextKey(p.context)),
                  })}
                >
                  <Crosshair size={10} className="text-muted" />
                  {t(payloadContextKey(p.context))}
                </button>
              </div>
              <CopyButton value={p.value} />
            </div>

            {/* The payload itself, rendered as terminal output. */}
            <div className="terminal">
              <Highlight text={p.value} query={q} />
            </div>

            <p className="text-sm text-fg">
              <Highlight text={content.description} query={q} />
            </p>

            {/* Localized teaching content joins the technical record by payload id. */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => toggleExplain(p.id)}
                aria-expanded={openIds.has(p.id)}
                className="inline-flex w-fit items-center gap-1.5 font-mono text-xs text-muted transition-colors hover:text-fg"
              >
                <ChevronDown
                  size={13}
                  className={`transition-transform ${
                    openIds.has(p.id) ? "rotate-180" : ""
                  }`}
                />
                {t("payloads.explain")}
              </button>

              {openIds.has(p.id) && <ExplainDetails payload={p} />}
            </div>

            {/* Tags for this payload. Clicking one adds it to the filter. */}
            <div className="flex flex-wrap gap-1.5">
              {p.tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted hover:border-muted hover:text-fg"
                >
                  #<Highlight text={tag} query={q} />
                </button>
              ))}
            </div>
            </article>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded border border-line bg-surface px-3 py-8 text-center">
            <p className="font-mono text-sm text-muted">
              {q
                ? t("payloads.noSearchResults", { query: query.trim() })
                : t("payloads.noFilterResults")}
            </p>
            {filtersActive && (
              <button onClick={reset} className="btn">
                {t("payloads.reset")}
              </button>
            )}
          </div>
        )}
      </div>
    </ToolShell>
  );
}
