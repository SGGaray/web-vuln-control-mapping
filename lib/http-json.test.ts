import { describe, expect, it } from "vitest";
import { readJsonObject } from "./http-json";

function request(body: BodyInit, contentLength?: number) {
  return new Request("http://localhost/test", {
    method: "POST",
    body,
    headers: contentLength === undefined ? undefined : { "Content-Length": String(contentLength) },
  });
}

describe("readJsonObject", () => {
  it("accepts a body exactly at the byte limit", async () => {
    const body = '{"x":"é"}';
    const bytes = new TextEncoder().encode(body).byteLength;
    expect(await readJsonObject(request(body), bytes)).toEqual({ ok: true, value: { x: "é" } });
  });

  it("rejects one byte over the limit before JSON parsing", async () => {
    const body = '{"unused":"large"}';
    const bytes = new TextEncoder().encode(body).byteLength;
    const result = await readJsonObject(request(body), bytes - 1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(413);
  });

  it("honors an oversized declared content length", async () => {
    const result = await readJsonObject(request("{}", 101), 100);
    expect(result).toMatchObject({ ok: false, status: 413 });
  });

  it.each(["null", "[]", "1", '"text"'])("rejects a non-object top-level JSON value: %s", async (body) => {
    const result = await readJsonObject(request(body), 100);
    expect(result).toMatchObject({
      ok: false,
      status: 400,
      error: { code: "INVALID_BODY", message: "JSON body must be an object." },
    });
  });
});
