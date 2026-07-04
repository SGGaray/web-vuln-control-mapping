"use client";

import { useEffect, useState } from "react";
import { ToolShell, Notice } from "@/components/ui/ToolShell";
import { Field, TextArea } from "@/components/ui/Field";
import CopyButton from "@/components/ui/CopyButton";

// Node's crypto (used by the API route) supports MD5, which the browser's
// Web Crypto does not. That is the main reason hashing lives on the server.
const ALGORITHMS = ["md5", "sha1", "sha256"] as const;
type Algo = (typeof ALGORITHMS)[number];

export default function HashTool() {
  const [input, setInput] = useState("");
  const [hashes, setHashes] = useState<Record<Algo, string> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Debounce the request so we are not hashing on every single keystroke.
  useEffect(() => {
    if (!input) {
      setHashes(null);
      setError("");
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/hash", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: input, algorithms: ALGORITHMS }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Request failed");
        const data = await res.json();
        setHashes(data.hashes);
      } catch (err) {
        // AbortError just means a newer keystroke superseded this call.
        if ((err as Error).name !== "AbortError") {
          setError("Could not reach the hashing service. Is the server running?");
        }
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [input]);

  return (
    <ToolShell
      title="Hash Generator"
      blurb="Compute MD5, SHA1, and SHA256 digests. Hashing runs on the API route."
    >
      <Field label="Input">
        <TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="admin:password"
        />
      </Field>

      {error && <Notice>{error}</Notice>}

      <div className="flex flex-col gap-3">
        {ALGORITHMS.map((algo) => {
          const value = hashes?.[algo] ?? "";
          return (
            <Field
              key={algo}
              label={algo.toUpperCase()}
              action={value ? <CopyButton value={value} /> : null}
            >
              <div className="terminal min-h-[44px]">
                {loading ? "computing..." : value || "\u00a0"}
              </div>
            </Field>
          );
        })}
      </div>
    </ToolShell>
  );
}
