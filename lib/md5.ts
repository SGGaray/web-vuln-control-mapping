// MD5 (RFC 1321) over raw bytes, for the Hash tool only.
//
// MD5 is broken: collisions are cheap to produce. It is here so people can
// compare against digests that existing systems still publish or store, not
// to protect anything. Do not use it for passwords, signatures, integrity
// against an attacker, or any new cryptographic design.
//
// Web Crypto has no MD5, so the browser needs its own implementation. This
// one is a direct transcription of RFC 1321 section 3: no unrolled rounds and
// no floating-point constants (the K table is the RFC's literal values, not
// Math.sin, whose precision engines do not guarantee). It is checked against
// the RFC test suite and against node:crypto in lib/md5.test.ts.

// Per-round shift amounts (RFC 1321 section 3.4), four per round.
const SHIFTS = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21] as const;

// K[i] = floor(abs(sin(i + 1)) * 2^32), as listed in RFC 1321 section 3.4.
const K = new Uint32Array([
  0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
  0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
  0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
  0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
  0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
  0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
  0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
  0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
]);

/** Exposed for the test that re-derives the table from its RFC definition. */
export const MD5_K: readonly number[] = Array.from(K);

function rotateLeft(value: number, bits: number): number {
  return (value << bits) | (value >>> (32 - bits));
}

/** Lowercase hex MD5 digest of `bytes`. */
export function md5(bytes: Uint8Array): string {
  // Padding (section 3.1): a 0x80 byte, zeros, then the bit length as a
  // 64-bit little-endian integer, to a multiple of 64 bytes.
  const paddedLength = (Math.floor((bytes.length + 8) / 64) + 1) * 64;
  const block = new Uint8Array(paddedLength);
  block.set(bytes);
  block[bytes.length] = 0x80;
  const view = new DataView(block.buffer);
  view.setUint32(paddedLength - 8, (bytes.length * 8) >>> 0, true);
  view.setUint32(paddedLength - 4, Math.floor(bytes.length / 0x20000000), true);

  // Buffer initialization (section 3.3).
  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  // Processing in 16-word blocks (section 3.4).
  for (let offset = 0; offset < paddedLength; offset += 64) {
    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;
    for (let i = 0; i < 64; i++) {
      let f: number;
      let g: number;
      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) & 15;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) & 15;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) & 15;
      }
      const word = view.getUint32(offset + g * 4, true);
      const sum = (a + f + K[i] + word) | 0;
      a = d;
      d = c;
      c = b;
      b = (b + rotateLeft(sum, SHIFTS[(i >> 4) * 4 + (i & 3)])) | 0;
    }
    a0 = (a0 + a) | 0;
    b0 = (b0 + b) | 0;
    c0 = (c0 + c) | 0;
    d0 = (d0 + d) | 0;
  }

  // Output (section 3.5): A, B, C, D, each little-endian.
  let hex = "";
  for (const word of [a0, b0, c0, d0]) {
    for (let byte = 0; byte < 4; byte++) {
      hex += ((word >>> (byte * 8)) & 0xff).toString(16).padStart(2, "0");
    }
  }
  return hex;
}
