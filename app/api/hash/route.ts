import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";

/**
 * POST /api/hash
 * Body: { text: string, algorithms?: string[] }
 * Returns: { hashes: { [algo]: hexDigest } }
 *
 * Hashing lives here rather than in the browser mainly because Node's crypto
 * supports MD5, which the Web Crypto API does not. We only allow a fixed set
 * of algorithms so a caller cannot request something unexpected.
 */
const ALLOWED = new Set(["md5", "sha1", "sha256"]);

export async function POST(req: NextRequest) {
  let body: { text?: unknown; algorithms?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { text, algorithms } = body;

  // Basic input validation. Text must be a string.
  if (typeof text !== "string") {
    return NextResponse.json(
      { error: "Field 'text' must be a string." },
      { status: 400 }
    );
  }

  // Default to all algorithms, but keep only ones we explicitly allow.
  const requested = Array.isArray(algorithms) ? algorithms : [...ALLOWED];
  const algos = requested.filter(
    (a): a is string => typeof a === "string" && ALLOWED.has(a)
  );

  if (algos.length === 0) {
    return NextResponse.json(
      { error: "No valid algorithms requested." },
      { status: 400 }
    );
  }

  const hashes: Record<string, string> = {};
  for (const algo of algos) {
    hashes[algo] = createHash(algo).update(text).digest("hex");
  }

  return NextResponse.json({ hashes });
}
