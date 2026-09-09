import { describe, expect, it, vi } from "vitest";
import { requestHashes } from "./hash-request";

const algorithms = ["md5", "sha1", "sha256"] as const;

describe("requestHashes", () => {
  it.each([400, 413, 500])("preserves API status %i and its validation message", async (status) => {
    const fetcher = vi.fn(async () =>
      Response.json({ error: { code: "TEST", message: `API ${status}` } }, { status })
    );
    await expect(requestHashes("input", algorithms, new AbortController().signal, fetcher)).rejects.toMatchObject({
      kind: "api",
      status,
      message: `HTTP ${status}: API ${status}`,
    });
  });

  it("distinguishes a network failure", async () => {
    const fetcher = vi.fn(async () => { throw new TypeError("offline"); });
    await expect(requestHashes("input", algorithms, new AbortController().signal, fetcher)).rejects.toMatchObject({
      kind: "network",
    });
  });

  it("classifies cancellation without showing it as a network failure", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      })
    );
    const pending = requestHashes("first", algorithms, controller.signal, fetcher);
    controller.abort();
    await expect(pending).rejects.toEqual(expect.objectContaining({ kind: "aborted" }));
  });

  it("returns a complete successful response after a prior caller can retry", async () => {
    const expected = { md5: "a", sha1: "b", sha256: "c" };
    const fetcher = vi.fn(async () => Response.json({ hashes: expected }));
    await expect(requestHashes("retry", algorithms, new AbortController().signal, fetcher)).resolves.toEqual(expected);
  });
});
