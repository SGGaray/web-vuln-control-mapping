import { describe, expect, it } from "vitest";
import {
  defaultToolId,
  navigateToTool,
  resolveToolIdFromHash,
  subscribeToToolHash,
  toolHash,
} from "./navigation";

describe("tool hash navigation", () => {
  it.each(["", "#"])("resolves an empty hash to the default tool", (hash) => {
    expect(resolveToolIdFromHash(hash)).toBe(defaultToolId);
  });

  it("resolves a valid direct hash", () => {
    expect(resolveToolIdFromHash("#headers")).toBe("headers");
  });

  it("uses the documented default fallback for an unknown hash", () => {
    expect(resolveToolIdFromHash("#not-a-tool")).toBe(defaultToolId);
  });

  it("keeps the payload route identifier independent of its display label", () => {
    expect(defaultToolId).toBe("payloads");
    expect(toolHash("payloads")).toBe("#payloads");
  });

  it("tracks Payload to Headers and browser Back", () => {
    const history = ["#payloads", "#headers"];
    expect(resolveToolIdFromHash(history[1])).toBe("headers");
    expect(resolveToolIdFromHash(history[0])).toBe("payloads");
  });

  it("tracks Back followed by Forward", () => {
    const history = ["", "#headers", "#json"];
    let index = 2;
    index -= 1;
    expect(resolveToolIdFromHash(history[index])).toBe("headers");
    index += 1;
    expect(resolveToolIdFromHash(history[index])).toBe("json");
  });

  it("resolves a longer navigation history consistently", () => {
    expect(["", "#base64", "#commands", "#headers"].map(resolveToolIdFromHash)).toEqual([
      "payloads",
      "base64",
      "commands",
      "headers",
    ]);
  });

  it("synchronizes initial, Back, and Forward hashchange events", () => {
    let listener: EventListener | undefined;
    const location = { hash: "#headers" } as Location;
    const source = {
      location,
      addEventListener: (_type: string, callback: EventListener) => {
        listener = callback;
      },
      removeEventListener: (_type: string, callback: EventListener) => {
        if (listener === callback) listener = undefined;
      },
    } as Pick<Window, "location" | "addEventListener" | "removeEventListener">;
    const observed: string[] = [];
    const unsubscribe = subscribeToToolHash(source, (id) => observed.push(id));

    location.hash = "";
    listener?.(new Event("hashchange"));
    location.hash = "#headers";
    listener?.(new Event("hashchange"));
    navigateToTool(source, "json");
    listener?.(new Event("hashchange"));

    expect(observed).toEqual(["headers", "payloads", "headers", "json"]);
    unsubscribe();
    expect(listener).toBeUndefined();
  });
});
