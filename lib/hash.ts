import { createHash } from "node:crypto";

export const ALLOWED_ALGORITHMS = ["md5", "sha1", "sha256"] as const;
export const MAX_TEXT_LENGTH = 100_000;
// Leaves room for JSON escaping while preserving the 100,000-code-unit text cap.
export const MAX_BODY_BYTES = 700_000;
export const MAX_REQUESTED_ALGORITHMS = 20;

export type AllowedAlgorithm = (typeof ALLOWED_ALGORITHMS)[number];
const ALLOWED = new Set<string>(ALLOWED_ALGORITHMS);

export function normalizeAlgorithms(value: unknown):
  | { ok: true; algorithms: AllowedAlgorithm[] }
  | { ok: false; error: { code: string; message: string } } {
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

type HashFactory = (algorithm: string) => {
  update(value: string): { digest(format: "hex"): string };
};

export function computeHashes(
  text: string,
  algorithms: readonly AllowedAlgorithm[],
  factory: HashFactory = createHash
): Record<string, string> {
  return Object.fromEntries(
    algorithms.map((algorithm) => [algorithm, factory(algorithm).update(text).digest("hex")])
  );
}
