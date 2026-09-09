import { NextRequest, NextResponse } from "next/server";
import { readJsonObject } from "../../../lib/http-json";
import {
  computeHashes,
  MAX_BODY_BYTES,
  MAX_TEXT_LENGTH,
  normalizeAlgorithms,
} from "../../../lib/hash";

/**
 * POST /api/hash
 * Body: { text: string, algorithms?: string[] }
 * Returns: { hashes: { [algo]: hexDigest } }
 *
 * Hashing lives here rather than in the browser mainly because Node's crypto
 * supports MD5, which the Web Crypto API does not. We only allow a fixed set
 * of algorithms so a caller cannot request something unexpected.
 */
export async function POST(req: NextRequest) {
  const parsed = await readJsonObject(req, MAX_BODY_BYTES);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const { text, algorithms } = parsed.value;

  // Basic input validation. Text must be a string.
  if (typeof text !== "string") {
    return NextResponse.json(
      { error: { code: "INVALID_TEXT", message: "Field 'text' must be a string." } },
      { status: 400 }
    );
  }

  // Cap input size to prevent a caller from tying up CPU with a huge payload.
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      {
        error: {
          code: "TEXT_TOO_LONG",
          message: `Field 'text' exceeds the maximum length of ${MAX_TEXT_LENGTH} characters.`,
        },
      },
      { status: 413 }
    );
  }

  // Default to all algorithms; reject anything outside the explicit allowlist.
  const normalized = normalizeAlgorithms(algorithms);
  if (!normalized.ok) return NextResponse.json({ error: normalized.error }, { status: 400 });

  const hashes = computeHashes(text, normalized.algorithms);

  return NextResponse.json({ hashes });
}
