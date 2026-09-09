"use client";

import { useState } from "react";
import { CheckCircle2, Minimize2 } from "lucide-react";
import { ToolShell, Notice } from "@/components/ui/ToolShell";
import { Field, TextArea } from "@/components/ui/Field";
import CopyButton from "@/components/ui/CopyButton";
import {
  copyableResult,
  editResultInput,
  initialResultState,
  rejectResult,
  resolveResult,
  type ResultState,
} from "@/lib/result-state";
import { transformJsonText, type JsonTextMode } from "@/lib/json-text";

export default function JsonTool() {
  const [state, setState] = useState<ResultState<string>>(initialResultState);
  const input = state.input;
  const output = copyableResult(state) ?? "";

  function run(mode: JsonTextMode) {
    try {
      const output = transformJsonText(input, mode);
      setState((current) => resolveResult(current, current.version, output));
    } catch (err) {
      setState((current) => rejectResult(current, current.version, (err as Error).message));
    }
  }

  function updateInput(value: string) {
    setState((current) => editResultInput(current, value));
  }

  return (
    <ToolShell
      title="JSON Formatter"
      blurb="Format or minify valid JSON while preserving number, string, and duplicate-key lexemes."
    >
      <Field label="Input">
        <TextArea
          value={input}
          onChange={(e) => updateInput(e.target.value)}
          placeholder='{"user":"root","roles":["admin","dev"],"active":true}'
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <button className="btn" onClick={() => run("format")}>
          <CheckCircle2 size={13} />
          Format
        </button>
        <button className="btn" onClick={() => run("minify")}>
          <Minimize2 size={13} />
          Minify
        </button>
      </div>

      {state.status === "error" && <Notice>{state.message}</Notice>}

      {state.status === "success" && (
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
