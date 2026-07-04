import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/headers
 * Body: { raw: string }   raw HTTP response headers, one per line
 * Returns: { headers: {name,value}[], security: {header,present,note}[] }
 *
 * Parsing is intentionally forgiving: we skip the status line, ignore blank
 * lines, and split each remaining line on the first colon only, since header
 * values themselves often contain colons (think timestamps or URLs).
 */

// The security headers we check for, with a short reason each matters.
const SECURITY_HEADERS: { name: string; note: string }[] = [
  {
    name: "Strict-Transport-Security",
    note: "Forces HTTPS and blocks protocol downgrade attacks.",
  },
  {
    name: "Content-Security-Policy",
    note: "Restricts sources for scripts and styles, limiting XSS.",
  },
  {
    name: "X-Frame-Options",
    note: "Prevents the page being framed, mitigating clickjacking.",
  },
  {
    name: "X-Content-Type-Options",
    note: "Stops MIME sniffing when set to nosniff.",
  },
  {
    name: "Referrer-Policy",
    note: "Controls how much referrer information is leaked.",
  },
  {
    name: "Permissions-Policy",
    note: "Limits access to browser features like camera or geolocation.",
  },
];

export async function POST(req: NextRequest) {
  let body: { raw?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.raw !== "string" || !body.raw.trim()) {
    return NextResponse.json(
      { error: "Field 'raw' must be a non-empty string." },
      { status: 400 }
    );
  }

  const headers: { name: string; value: string }[] = [];

  for (const line of body.raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue; // skip blanks
    if (/^HTTP\//i.test(trimmed)) continue; // skip the status line
    const idx = trimmed.indexOf(":");
    if (idx === -1) continue; // not a header line
    const name = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (name) headers.push({ name, value });
  }

  // Case insensitive lookup set of header names that were present.
  const present = new Set(headers.map((h) => h.name.toLowerCase()));

  const security = SECURITY_HEADERS.map((h) => ({
    header: h.name,
    present: present.has(h.name.toLowerCase()),
    note: h.note,
  }));

  return NextResponse.json({ headers, security });
}
