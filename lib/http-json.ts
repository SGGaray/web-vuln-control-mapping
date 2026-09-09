export type JsonObjectResult =
  | { ok: true; value: Record<string, unknown> }
  | {
      ok: false;
      status: 400 | 413;
      error: { code: "INVALID_JSON" | "INVALID_BODY" | "PAYLOAD_TOO_LARGE"; message: string };
    };

/** Read and bound request bytes before decoding or parsing the JSON envelope. */
export async function readJsonObject(
  request: Request,
  maxBytes: number
): Promise<JsonObjectResult> {
  const declared = request.headers.get("content-length");
  if (declared && /^\d+$/.test(declared) && Number(declared) > maxBytes) {
    return {
      ok: false,
      status: 413,
      error: { code: "PAYLOAD_TOO_LARGE", message: `Request body exceeds the maximum size of ${maxBytes} bytes.` },
    };
  }

  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = request.body?.getReader();
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return {
          ok: false,
          status: 413,
          error: { code: "PAYLOAD_TOO_LARGE", message: `Request body exceeds the maximum size of ${maxBytes} bytes.` },
        };
      }
      chunks.push(value);
    }
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let parsed: unknown;
  try {
    const json = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    parsed = JSON.parse(json);
  } catch {
    return {
      ok: false,
      status: 400,
      error: { code: "INVALID_JSON", message: "Request body must be valid UTF-8 JSON." },
    };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      ok: false,
      status: 400,
      error: { code: "INVALID_BODY", message: "JSON body must be an object." },
    };
  }
  return { ok: true, value: parsed as Record<string, unknown> };
}
