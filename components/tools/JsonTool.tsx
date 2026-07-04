"use client";

import { useState } from "react";
import { CheckCircle2, Minimize2 } from "lucide-react";
import { ToolShell, Notice } from "@/components/ui/ToolShell";
import { Field, TextArea } from "@/components/ui/Field";
import CopyButton from "@/components/ui/CopyButton";

export default function JsonTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [valid, setValid] = useState(false);

  /**
   * Parse once, then re-serialize. `indent` of 2 pretty prints, 0 minifies.
   * On failure we show the parser's own message, which usually points at the
   * offending position, and clear any stale output.
   */
  function run(indent: number) {
    if (!input.trim()) {
      setError("");
      setOutput("");
      setValid(false);
      return;
    }
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, indent));
      setError("");
      setValid(true);
    } catch (err) {
      setError((err as Error).message);
      setOutput("");
      setValid(false);
    }
  }

  return (
    <ToolShell
      title="JSON Formatter"
      blurb="Validate JSON and pretty print or minify it."
    >
      <Field label="Input">
        <TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='{"user":"root","roles":["admin","dev"],"active":true}'
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <button className="btn" onClick={() => run(2)}>
          <CheckCircle2 size={13} />
          Format
        </button>
        <button className="btn" onClick={() => run(0)}>
          <Minimize2 size={13} />
          Minify
        </button>
      </div>

      {error && <Notice>{error}</Notice>}

      {valid && !error && (
        <Field
          label="Output"
          action={<CopyButton value={output} />}
        >
          <div className="terminal min-h-[120px] whitespace-pre">{output}</div>
        </Field>
      )}
    </ToolShell>
  );
}
