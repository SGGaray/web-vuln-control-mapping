import { describe, it, expect } from "vitest";
import { filterData, countValues, type Facet } from "./facets";

// A tiny, payload free dataset so the tests exercise the generic utility only.
type Item = { color: string; size: string };
const data: Item[] = [
  { color: "red", size: "s" },
  { color: "red", size: "m" },
  { color: "blue", size: "s" },
  { color: "green", size: "l" },
];

const colorValues = (i: Item) => [i.color];
const sizeValues = (i: Item) => [i.size];

describe("facets utility", () => {
  it("filterData applies a facet selection", () => {
    // Select color red. Only the two red items should remain.
    const colorFacet: Facet<Item> = {
      values: colorValues,
      selected: new Set(["red"]),
    };
    const result = filterData(data, [colorFacet], []);
    expect(result).toHaveLength(2);
    expect(result.every((i) => i.color === "red")).toBe(true);
  });

  it("countValues ignores the target facet's own selection (cross-exclusion)", () => {
    // Even though a color is 'selected', color counts pass no color facet as an
    // other facet, so every color is still counted. This is the key behavior.
    const counts = countValues(data, [], [], colorValues);
    expect(counts.get("red")).toBe(2);
    expect(counts.get("blue")).toBe(1);
    expect(counts.get("green")).toBe(1);
  });

  it("countValues respects the other facets", () => {
    // With size 's' selected as the other facet, color counts narrow to items
    // that are size s. green has no size s, so it drops out entirely.
    const sizeFacet: Facet<Item> = {
      values: sizeValues,
      selected: new Set(["s"]),
    };
    const counts = countValues(data, [sizeFacet], [], colorValues);
    expect(counts.get("red")).toBe(1);
    expect(counts.get("blue")).toBe(1);
    expect(counts.get("green")).toBeUndefined();
  });
});
