export type Base64TextErrorKind = "invalid-base64" | "invalid-utf8";

export class Base64TextError extends Error {
  constructor(message: string, readonly kind: Base64TextErrorKind) {
    super(message);
    this.name = "Base64TextError";
  }
}

function bytesToBinary(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return binary;
}

export function encodeUtf8Base64(input: string): string {
  return btoa(bytesToBinary(new TextEncoder().encode(input)));
}

/** Decode canonical Base64 as UTF-8 text. ASCII whitespace is ignored. */
export function decodeUtf8Base64(input: string): string {
  const normalized = input.replace(/[\t\n\f\r ]/g, "");
  const canonical = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  if (!canonical.test(normalized)) {
    throw new Base64TextError("Input is not valid Base64 encoding.", "invalid-base64");
  }

  let binary: string;
  try {
    binary = atob(normalized);
  } catch {
    throw new Base64TextError("Input is not valid Base64 encoding.", "invalid-base64");
  }

  if (btoa(binary) !== normalized) {
    throw new Base64TextError("Input is not canonical Base64 encoding.", "invalid-base64");
  }

  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  try {
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    throw new Base64TextError(
      "Base64 is valid, but its bytes are not valid UTF-8 text.",
      "invalid-utf8"
    );
  }
}

export function convertBase64Text(
  mode: "encode" | "decode",
  input: string
): { ok: true; value: string } | { ok: false; error: string } {
  try {
    return {
      ok: true,
      value: mode === "encode" ? encodeUtf8Base64(input) : decodeUtf8Base64(input),
    };
  } catch (caught) {
    return {
      ok: false,
      error:
        caught instanceof Base64TextError
          ? caught.message
          : "Could not convert the UTF-8 text.",
    };
  }
}
