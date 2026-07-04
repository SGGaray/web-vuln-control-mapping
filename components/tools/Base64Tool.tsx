"use client";

import { useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { ToolShell, Notice } from "@/components/ui/ToolShell";
import { Field, TextArea } from "@/components/ui/Field";
import CopyButton from "@/components/ui/CopyButton";

type Mode = "encode" | "decode";

/**
 * Base64 works on bytes, but JS strings are UTF-16. btoa/atob only handle
 * Latin1, so anything with emoji or accents breaks. We bridge through
 * TextEncoder/TextDecoder so Unicode round trips correctly.
 */
function encodeBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function decodeBase64(input: string): string {
  const binary = atob(input.trim());
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export default function Base64Tool() {
  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");

  // Derive output on every render. If decoding fails, we surface the error
  // instead of throwing, so the UI never goes blank.
  let output = "";
  let error = "";
  if (input) {
    try {
      output = mode === "encode" ? encodeBase64(input) : decodeBase64(input);
    } catch {
      error = "Input is not valid Base64. Check for stray characters or padding.";
    }
  }

  return (
    <ToolShell
      title="Base64"
      blurb="Encode text to Base64 or decode it back. Unicode safe."
    >
      {/* Mode switch */}
      <div className="flex gap-1">
        {(["encode", "decode"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`btn ${
              mode === m ? "border-muted text-bright bg-raised" : "opacity-60"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <Field label={mode === "encode" ? "Plain text" : "Base64 input"}>
        <TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === "encode" ? "hello world" : "aGVsbG8gd29ybGQ="}
        />
      </Field>

      <div className="flex items-center gap-2 text-muted">
        <ArrowRightLeft size={14} />
        <span className="eyebrow">Output</span>
      </div>

      {error ? (
        <Notice>{error}</Notice>
      ) : (
        <Field
          label={mode === "encode" ? "Base64" : "Plain text"}
          action={<CopyButton value={output} />}
        >
          <div className="terminal min-h-[80px]">{output || "\u00a0"}</div>
        </Field>
      )}
    </ToolShell>
  );
}
