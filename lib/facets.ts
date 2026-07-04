/**
 * Generic faceted filtering and counting.
 *
 * A "facet" is one filterable dimension backed by a set of selected values,
 * for example context or tags. A "predicate" is any other filter that is not a
 * facet, for example a category match or a free text search.
 *
 * The same matching rule is defined once here and reused by both the filtered
 * list and the counts, so there is no duplicated filter logic anywhere else.
 */

// One filterable dimension. `values` returns the item's value(s) for this
// facet, and `selected` is the set the user has toggled on.
export type Facet<T> = {
  values: (item: T) => readonly string[];
  selected: ReadonlySet<string>;
};

// Any non facet filter, such as search or category.
export type Predicate<T> = (item: T) => boolean;

// An item satisfies a facet when nothing is selected (no constraint) or it
// carries at least one selected value. This OR within a facet is the single
// source of truth for facet matching.
function facetMatches<T>(facet: Facet<T>, item: T): boolean {
  if (facet.selected.size === 0) return true;
  return facet.values(item).some((v) => facet.selected.has(v));
}

/**
 * Items passing every predicate and every facet. AND across all filters.
 */
export function filterData<T>(
  data: readonly T[],
  facets: readonly Facet<T>[],
  predicates: readonly Predicate<T>[]
): T[] {
  return data.filter(
    (item) =>
      predicates.every((p) => p(item)) &&
      facets.every((f) => facetMatches(f, item))
  );
}

/**
 * Counts per value for a target facet.
 *
 * The counts are computed against the data filtered by the OTHER facets and all
 * predicates, but not by the target facet itself. That is what makes each count
 * answer "how many results would this value show, given the other active
 * filters", so unselected values never collapse to zero just because a sibling
 * value is selected.
 *
 * Pass only the other facets in `otherFacets`. The target is represented by its
 * value extractor, `getValues`, which keeps the target out of the base filter
 * by construction.
 */
export function countValues<T>(
  data: readonly T[],
  otherFacets: readonly Facet<T>[],
  predicates: readonly Predicate<T>[],
  getValues: (item: T) => readonly string[]
): Map<string, number> {
  const base = filterData(data, otherFacets, predicates);
  const counts = new Map<string, number>();
  for (const item of base) {
    for (const value of getValues(item)) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return counts;
}
