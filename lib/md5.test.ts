import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { MD5_K, md5 } from "./md5";

const ascii = (text: string) => new TextEncoder().encode(text);
const nodeMd5 = (bytes: Uint8Array) => createHash("md5").update(bytes).digest("hex");

// Deterministic byte stream (xorshift32), so failures are reproducible.
function pseudoRandomBytes(length: number, seed: number): Uint8Array {
  const bytes = new Uint8Array(length);
  let state = seed >>> 0 || 1;
  for (let i = 0; i < length; i++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    bytes[i] = state & 0xff;
  }
  return bytes;
}

describe("md5", () => {
  // RFC 1321, appendix A.5 ("Test suite").
  it.each([
    ["", "d41d8cd98f00b204e9800998ecf8427e"],
    ["a", "0cc175b9c0f1b6a831c399e269772661"],
    ["abc", "900150983cd24fb0d6963f7d28e17f72"],
    ["message digest", "f96b697d7cb7938d525a2f31aaf161d0"],
    ["abcdefghijklmnopqrstuvwxyz", "c3fcd3d76192e4007dfb496cca67e13b"],
    ["ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", "d174ab98d277d9f5a5611c2c9f419d9f"],
    [
      "12345678901234567890123456789012345678901234567890123456789012345678901234567890",
      "57edf4a22be3c955ac49da2e2107b67a",
    ],
  ])("matches the RFC 1321 test suite for %j", (input, expected) => {
    expect(md5(ascii(input))).toBe(expected);
  });

  it("uses the RFC's K table, floor(abs(sin(i + 1)) * 2^32)", () => {
    const derived = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32));
    expect(MD5_K).toEqual(derived);
  });

  it("matches node:crypto for every length from 0 to 300 bytes (all padding boundaries)", () => {
    for (let length = 0; length <= 300; length++) {
      const bytes = pseudoRandomBytes(length, length + 1);
      expect(md5(bytes), `length ${length}`).toBe(nodeMd5(bytes));
    }
  });

  it("matches node:crypto for every byte value and for large inputs", () => {
    const allBytes = Uint8Array.from({ length: 256 }, (_, i) => i);
    expect(md5(allBytes)).toBe(nodeMd5(allBytes));
    for (const length of [4095, 4096, 65_537, 400_000, 1_048_576]) {
      const bytes = pseudoRandomBytes(length, length);
      expect(md5(bytes), `length ${length}`).toBe(nodeMd5(bytes));
    }
  });

  it("hashes one million 'a' bytes to the published digest", () => {
    expect(md5(new Uint8Array(1_000_000).fill(0x61))).toBe("7707d6ae4e027c70eea2a935c2296f21");
  });

  it("does not modify its input", () => {
    const bytes = pseudoRandomBytes(70, 7);
    const copy = bytes.slice();
    md5(bytes);
    expect(bytes).toEqual(copy);
  });
});
