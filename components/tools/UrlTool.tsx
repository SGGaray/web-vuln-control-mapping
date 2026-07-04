"use client";

import { useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { ToolShell, Notice } from "@/components/ui/ToolShell";
import { Field, TextArea } from "@/components/ui/Field";
import CopyButton from "@/components/ui/CopyButton";

type Mode = "encode" | "decode";

export default function UrlTool() {
  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");

  let output = "";
  let error = "";
  if (input) {
    try {
      // encodeURIComponent escapes everything that is not URL safe, which is
      // the right default for query values. decodeURIComponent reverses it and
      // throws on malformed percent sequences, so we catch that below.
      output =
        mode === "encode"
          ? encodeURIComponent(input)
          : decodeURIComponent(input);
    } catch {
      error = "Malformed percent encoding. Look for a lone % or bad sequence.";
    }
  }

  return (
    <ToolShell
      title="URL Encode"
      blurb="Percent encode a string for safe use in URLs, or decode it back."
    >
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

      <Field label={mode === "encode" ? "Raw string" : "Encoded string"}>
        <TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            mode === "encode"
              ? "search?q=hello world&lang=en"
              : "search%3Fq%3Dhello%20world"
          }
        />
      </Field>

      <div className="flex items-center gap-2 text-muted">
        <ArrowRightLeft size={14} />
        <span className="eyebrow">Output</span>
      </div>

      {error ? (
        <Notice>{error}</Notice>
      ) : (
        <Field label="Result" action={<CopyButton value={output} />}>
          <div className="terminal min-h-[80px]">{output || "\u00a0"}</div>
        </Field>
      )}
    </ToolShell>
  );
}
