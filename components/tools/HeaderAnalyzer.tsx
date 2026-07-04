"use client";

import { useState } from "react";
import { ShieldCheck, ShieldAlert, ScanLine } from "lucide-react";
import { ToolShell, Notice } from "@/components/ui/ToolShell";
import { Field, TextArea } from "@/components/ui/Field";

// Shape of the response from /api/headers.
type Analysis = {
  headers: { name: string; value: string }[];
  security: { header: string; present: boolean; note: string }[];
};

const SAMPLE = `HTTP/1.1 200 OK
Server: nginx/1.25.3
Content-Type: text/html; charset=UTF-8
Set-Cookie: session=abc123; HttpOnly
X-Powered-By: PHP/8.2.0`;

export default function HeaderAnalyzer() {
  const [raw, setRaw] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function analyze() {
    if (!raw.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/headers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      });
      if (!res.ok) throw new Error("Request failed");
      setResult(await res.json());
    } catch {
      setError("Could not reach the analyzer service. Is the server running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ToolShell
      title="Header Analyzer"
      blurb="Paste a raw HTTP response. Get a clean table plus a security header check."
    >
      <Field
        label="Raw headers"
        action={
          <button className="btn" onClick={() => setRaw(SAMPLE)}>
            Load sample
          </button>
        }
      >
        <TextArea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={SAMPLE}
        />
      </Field>

      <div>
        <button className="btn" onClick={analyze} disabled={loading || !raw.trim()}>
          <ScanLine size={13} />
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {error && <Notice>{error}</Notice>}

      {result && (
        <div className="flex flex-col gap-5">
          {/* Parsed headers table */}
          <Field label={`Parsed headers (${result.headers.length})`}>
            <div className="rounded border border-line divide-y divide-line">
              {result.headers.map((h, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[minmax(0,180px)_1fr] gap-3 px-3 py-2 text-sm font-mono"
                >
                  <span className="text-muted break-all">{h.name}</span>
                  <span className="text-fg break-all">{h.value}</span>
                </div>
              ))}
            </div>
          </Field>

          {/* Security header checklist. Icons carry meaning, not color. */}
          <Field label="Security headers">
            <div className="rounded border border-line divide-y divide-line">
              {result.security.map((s) => (
                <div key={s.header} className="flex items-start gap-3 px-3 py-2.5">
                  {s.present ? (
                    <ShieldCheck size={15} className="mt-0.5 shrink-0 text-bright" />
                  ) : (
                    <ShieldAlert size={15} className="mt-0.5 shrink-0 text-muted" />
                  )}
                  <div className="flex flex-col">
                    <span className="font-mono text-sm text-fg">{s.header}</span>
                    <span className="text-xs text-muted">{s.note}</span>
                  </div>
                  <span className="ml-auto eyebrow">
                    {s.present ? "present" : "missing"}
                  </span>
                </div>
              ))}
            </div>
          </Field>
        </div>
      )}
    </ToolShell>
  );
}
