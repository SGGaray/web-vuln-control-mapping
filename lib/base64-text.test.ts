import { describe, expect, it } from "vitest";
import {
  convertBase64Text,
  decodeUtf8Base64,
  encodeUtf8Base64,
} from "./base64-text";

describe("Base64 and UTF-8 text fidelity", () => {
  it.each(["", "plain ASCII", "acción española", "🛡️", "漢字", "café 漢字 🚀"])(
    "round-trips UTF-8 text: %j",
    (text) => expect(decodeUtf8Base64(encodeUtf8Base64(text))).toBe(text)
  );

  it("preserves a leading UTF-8 BOM as U+FEFF", () => {
    const text = "\uFEFFA";
    expect(decodeUtf8Base64(encodeUtf8Base64(text))).toBe(text);
    expect(encodeUtf8Base64(text)).toBe("77u/QQ==");
  });

  it("distinguishes valid Base64 containing invalid UTF-8", () => {
    expect(() => decodeUtf8Base64("/w==")).toThrowError(
      expect.objectContaining({ kind: "invalid-utf8" })
    );
  });

  it.each(["abc", "a===", "ab=c", "%%%%", "ZE=="])(
    "rejects malformed or non-canonical Base64: %s",
    (input) =>
      expect(() => decodeUtf8Base64(input)).toThrowError(
        expect.objectContaining({ kind: "invalid-base64" })
      )
  );

  it("ignores ASCII whitespace and emits canonical Base64", () => {
    expect(decodeUtf8Base64(" Y2Fmw6kg\n5ryi5a2XIA== \t")).toBe("café 漢字 ");
    expect(encodeUtf8Base64(decodeUtf8Base64(" YQ==\n"))).toBe("YQ==");
  });

  it("returns an error without retaining an earlier successful output", () => {
    expect(convertBase64Text("decode", "YQ==")).toEqual({ ok: true, value: "a" });
    expect(convertBase64Text("decode", "/w==")).toEqual({
      ok: false,
      error: "Base64 is valid, but its bytes are not valid UTF-8 text.",
    });
  });
});
