import { describe, expect, it } from "vitest";
import { decodeUrlComponent, encodeUrlComponent } from "./url-component";

describe("URL component encoding", () => {
  it("encodes component delimiters and spaces", () => {
    expect(encodeUrlComponent("search?q=hello world&lang=en")).toBe(
      "search%3Fq%3Dhello%20world%26lang%3Den"
    );
  });

  it("decodes an encoded component", () => {
    expect(decodeUrlComponent("a%2Fb%3Fc%3Dd")).toBe("a/b?c=d");
  });

  it("round-trips Unicode", () => {
    const value = "acción/漢字/🚀";
    expect(decodeUrlComponent(encodeUrlComponent(value))).toBe(value);
  });

  it.each(["%", "%2", "%GG", "%E0%A4%A"])(
    "rejects malformed percent encoding: %s",
    (value) => expect(() => decodeUrlComponent(value)).toThrow(URIError)
  );
});
