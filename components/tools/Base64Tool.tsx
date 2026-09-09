"use client";

import { useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { ToolShell, Notice } from "@/components/ui/ToolShell";
import { Field, TextArea } from "@/components/ui/Field";
import CopyButton from "@/components/ui/CopyButton";
import {
  convertBase64Text,
} from "@/lib/base64-text";

type Mode = "encode" | "decode";

export default function Base64Tool() {
  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");

  // Derive output on every render. If decoding fails, we surface the error
  // instead of throwing, so the UI never goes blank.
  let output = "";
  let error = "";
  if (input) {
    const result = convertBase64Text(mode, input);
    if (result.ok) output = result.value;
    else error = result.error;
  }

  return (
    <ToolShell
      title="Base64"
      blurb="Convert Base64 to or from UTF-8 text. Base64 whitespace is ignored; invalid UTF-8 is rejected."
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
