import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import {
  computeHashes,
  MAX_BODY_BYTES,
  MAX_REQUESTED_ALGORITHMS,
  MAX_TEXT_LENGTH,
  normalizeAlgorithms,
} from "../../../lib/hash";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/hash", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function makeRawRequest(body: string) {
  return new NextRequest("http://localhost/api/hash", { method: "POST", body });
}

describe("POST /api/hash", () => {
  it("rejects a non-string text field", async () => {
    const res = await POST(makeRequest({ text: 12345 }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatchObject({ code: "INVALID_TEXT" });
  });

  it("rejects algorithms outside the allowlist", async () => {
    const res = await POST(
      makeRequest({ text: "hello", algorithms: ["md6", "sha512"] })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatchObject({ code: "INVALID_ALGORITHM" });
  });

  it("rejects text over the maximum length", async () => {
    const res = await POST(makeRequest({ text: "a".repeat(100_001) }));
    expect(res.status).toBe(413);
  });

  it("accepts text exactly at the field limit", async () => {
    const res = await POST(
      makeRequest({ text: "a".repeat(MAX_TEXT_LENGTH), algorithms: ["sha256"] })
    );
    expect(res.status).toBe(200);
    expect((await res.json()).hashes.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it.each([null, [], "text", 12])("rejects non-object top-level JSON: %j", async (body) => {
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: "INVALID_BODY" } });
  });

  it("rejects invalid JSON with the common machine-readable error envelope", async () => {
    const res = await POST(makeRawRequest('{"text":'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: { code: "INVALID_JSON", message: "Request body must be valid UTF-8 JSON." },
    });
  });

  it.each([{}, { algorithms: ["sha256"] }, { text: true }, { text: "ok", algorithms: "sha256" }])(
    "rejects an invalid object shape: %j",
    async (body) => {
      const res = await POST(makeRequest(body));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatchObject({ code: expect.any(String), message: expect.any(String) });
    }
  );

  it("rejects an oversized unused JSON field before materializing the envelope", async () => {
    const request = new NextRequest("http://localhost/api/hash", {
      method: "POST",
      body: JSON.stringify({ text: "ok", unused: "x".repeat(MAX_BODY_BYTES + 1) }),
    });
    expect((await POST(request)).status).toBe(413);
  });

  it("rejects excessive algorithm cardinality", async () => {
    const res = await POST(makeRequest({
      text: "hello",
      algorithms: Array.from({ length: MAX_REQUESTED_ALGORITHMS + 1 }, () => "sha256"),
    }));
    expect(res.status).toBe(400);
  });

  it("deduplicates algorithms before hashing", () => {
    const digest = vi.fn(() => "digest");
    const update = vi.fn(() => ({ digest }));
    const factory = vi.fn(() => ({ update }));
    expect(computeHashes("hello", ["sha256"], factory)).toEqual({ sha256: "digest" });
    expect(factory).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledOnce();
    expect(digest).toHaveBeenCalledOnce();
  });

  it("normalizes duplicates before the instrumented work step", () => {
    const normalized = normalizeAlgorithms(["sha256", "sha256", "sha256"]);
    expect(normalized).toEqual({ ok: true, algorithms: ["sha256"] });
    if (!normalized.ok) throw new Error("unexpected normalization failure");
    const factory = vi.fn(() => ({ update: () => ({ digest: () => "digest" }) }));
    computeHashes("hello", normalized.algorithms, factory);
    expect(factory).toHaveBeenCalledOnce();
  });

  it("rejects a mixed list containing an algorithm outside the allowlist", () => {
    expect(normalizeAlgorithms(["sha256", "unknown"])).toMatchObject({
      ok: false,
      error: { code: "INVALID_ALGORITHM" },
    });
  });

  it("never performs more work than the three supported algorithms", () => {
    const normalized = normalizeAlgorithms(undefined);
    if (!normalized.ok) throw new Error("unexpected normalization failure");
    const factory = vi.fn(() => ({ update: () => ({ digest: () => "digest" }) }));
    computeHashes("hello", normalized.algorithms, factory);
    expect(factory).toHaveBeenCalledTimes(3);
  });
});
