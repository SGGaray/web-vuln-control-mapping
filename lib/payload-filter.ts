import { filterData, type Predicate } from "./facets";
import { payloads, type Payload, type PayloadCategory } from "./payloads";

export type PayloadCategoryFilter = "All" | PayloadCategory;

export const getPayloadContextValues = (payload: Payload): readonly string[] => [payload.context];
export const getPayloadTagValues = (payload: Payload): readonly string[] => payload.tags;

export function buildPayloadPredicates(
  category: PayloadCategoryFilter,
  query: string
): Predicate<Payload>[] {
  const normalized = query.trim().toLowerCase();
  return [
    (payload) => category === "All" || payload.category === category,
    (payload) =>
      normalized === "" ||
      payload.value.toLowerCase().includes(normalized) ||
      payload.explanation.toLowerCase().includes(normalized) ||
      payload.tags.some((tag) => tag.toLowerCase().includes(normalized)),
  ];
}

export function filterPayloads({
  category = "All",
  query = "",
  contexts = new Set<string>(),
  tags = new Set<string>(),
}: {
  category?: PayloadCategoryFilter;
  query?: string;
  contexts?: ReadonlySet<string>;
  tags?: ReadonlySet<string>;
} = {}): Payload[] {
  return filterData(
    payloads,
    [
      { values: getPayloadContextValues, selected: contexts },
      { values: getPayloadTagValues, selected: tags },
    ],
    buildPayloadPredicates(category, query)
  );
}
