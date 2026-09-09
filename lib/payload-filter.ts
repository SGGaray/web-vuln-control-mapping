import { filterData, type Predicate } from "./facets";
import { getPayloadContent } from "./i18n/content";
import type { Locale } from "./i18n/types";
import { payloads, type PayloadCategory, type PayloadRecord } from "./payloads";

export type PayloadCategoryFilter = "All" | PayloadCategory;

export const getPayloadContextValues = (payload: PayloadRecord): readonly string[] => [payload.context];
export const getPayloadTagValues = (payload: PayloadRecord): readonly string[] => payload.tags;

export function buildPayloadPredicates(
  category: PayloadCategoryFilter,
  query: string,
  locale: Locale = "en"
): Predicate<PayloadRecord>[] {
  const normalized = query.trim().toLowerCase();
  return [
    (payload) => category === "All" || payload.category === category,
    (payload) =>
      normalized === "" ||
      payload.value.toLowerCase().includes(normalized) ||
      Object.values(getPayloadContent(locale, payload.id)).some((text) =>
        text?.toLowerCase().includes(normalized)
      ) ||
      payload.tags.some((tag) => tag.toLowerCase().includes(normalized)),
  ];
}

export function filterPayloads({
  category = "All",
  query = "",
  contexts = new Set<string>(),
  tags = new Set<string>(),
  locale = "en",
}: {
  category?: PayloadCategoryFilter;
  query?: string;
  contexts?: ReadonlySet<string>;
  tags?: ReadonlySet<string>;
  locale?: Locale;
} = {}): PayloadRecord[] {
  return filterData(
    payloads,
    [
      { values: getPayloadContextValues, selected: contexts },
      { values: getPayloadTagValues, selected: tags },
    ],
    buildPayloadPredicates(category, query, locale)
  );
}
