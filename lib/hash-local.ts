// Hash digests computed in the browser. The text never leaves the page:
// SHA-1 and SHA-256 come from Web Crypto, MD5 from lib/md5.ts.
//
// MD5 and SHA-1 are offered for reference and compatibility (comparing
// against digests other systems publish or store). Neither is safe for
// passwords, signatures, or new cryptographic designs.
import { md5 } from "./md5";

export const ALLOWED_ALGORITHMS = ["md5", "sha1", "sha256"] as const;
// Input cap in UTF-16 code units (String.length), the same limit the former
// /api/hash route enforced. Its worst case is 300,000 UTF-8 bytes (three per
// code unit), which MD5 hashes on the main thread in a few milliseconds.
export const MAX_TEXT_LENGTH = 100_000;
export const MAX_REQUESTED_ALGORITHMS = 20;

export type AllowedAlgorithm = (typeof ALLOWED_ALGORITHMS)[number];
const ALLOWED = new Set<string>(ALLOWED_ALGORITHMS);

export type HashErrorCode =
  | "INVALID_TEXT"
  | "TEXT_TOO_LONG"
  | "INVALID_ALGORITHMS"
  | "TOO_MANY_ALGORITHMS"
  | "INVALID_ALGORITHM"
  | "NO_VALID_ALGORITHMS"
  | "WEB_CRYPTO_UNAVAILABLE"
  | "DIGEST_FAILED";

export class HashError extends Error {
  constructor(
    readonly code: HashErrorCode,
    message: string
  ) {
    super(message);
    this.name = "HashError";
  }
}

export function normalizeAlgorithms(value: unknown):
  | { ok: true; algorithms: AllowedAlgorithm[] }
  | { ok: false; error: { code: HashErrorCode; message: string } } {
  if (value === undefined) return { ok: true, algorithms: [...ALLOWED_ALGORITHMS] };
  if (!Array.isArray(value)) {
    return { ok: false, error: { code: "INVALID_ALGORITHMS", message: "Field 'algorithms' must be an array." } };
  }
  if (value.length > MAX_REQUESTED_ALGORITHMS) {
    return {
      ok: false,
      error: {
        code: "TOO_MANY_ALGORITHMS",
        message: `Field 'algorithms' accepts at most ${MAX_REQUESTED_ALGORITHMS} entries.`,
      },
    };
  }
  if (value.some((algorithm) => typeof algorithm !== "string" || !ALLOWED.has(algorithm))) {
    return {
      ok: false,
      error: {
        code: "INVALID_ALGORITHM",
        message: "Every requested algorithm must be one of: md5, sha1, sha256.",
      },
    };
  }
  const algorithms = [...new Set(value.filter(
    (algorithm): algorithm is AllowedAlgorithm => typeof algorithm === "string" && ALLOWED.has(algorithm)
  ))];
  if (algorithms.length === 0) {
    return { ok: false, error: { code: "NO_VALID_ALGORITHMS", message: "No valid algorithms requested." } };
  }
  return { ok: true, algorithms };
}

const WEB_CRYPTO_NAMES = { sha1: "SHA-1", sha256: "SHA-256" } as const;

/** The one Web Crypto call this module makes; injectable for tests. */
export type Digest = (
  algorithm: (typeof WEB_CRYPTO_NAMES)[keyof typeof WEB_CRYPTO_NAMES],
  data: Uint8Array<ArrayBuffer>
) => Promise<ArrayBuffer>;

/** Web Crypto's digest, or null where it is missing (insecure contexts). */
export function webCryptoDigest(): Digest | null {
  const subtle = globalThis.crypto?.subtle;
  return subtle ? (algorithm, data) => subtle.digest(algorithm, data) : null;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Lowercase hex digests of `text`, encoded as UTF-8. Lone UTF-16 surrogates
 * become U+FFFD, exactly as node:crypto encoded them on the former server
 * route, so results match it for every string.
 */
export async function computeHashes<T extends AllowedAlgorithm>(
  text: string,
  algorithms: readonly T[],
  digest: Digest | null = webCryptoDigest()
): Promise<Record<T, string>> {
  if (typeof text !== "string") throw new HashError("INVALID_TEXT", "Text must be a string.");
  if (text.length > MAX_TEXT_LENGTH) {
    throw new HashError("TEXT_TOO_LONG", `Text exceeds the maximum length of ${MAX_TEXT_LENGTH} characters.`);
  }
  const normalized = normalizeAlgorithms(algorithms);
  if (!normalized.ok) throw new HashError(normalized.error.code, normalized.error.message);

  const bytes = new TextEncoder().encode(text);
  const entries = await Promise.all(
    normalized.algorithms.map(async (algorithm): Promise<[string, string]> => {
      if (algorithm === "md5") return [algorithm, md5(bytes)];
      if (!digest) throw new HashError("WEB_CRYPTO_UNAVAILABLE", "Web Crypto is not available in this context.");
      try {
        return [algorithm, toHex(await digest(WEB_CRYPTO_NAMES[algorithm], bytes))];
      } catch {
        // The message names the algorithm only, never the input.
        throw new HashError("DIGEST_FAILED", `Could not compute ${algorithm}.`);
      }
    })
  );
  return Object.fromEntries(entries) as Record<T, string>;
}
