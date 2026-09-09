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
import { JsonTextError, transformJsonText, type JsonTextMode } from "@/lib/json-text";
import { useLocale } from "@/lib/i18n/context";

export default function JsonTool() {
  const { t } = useLocale();
  const [state, setState] = useState<ResultState<string>>(initialResultState);
  const input = state.input;
  const output = copyableResult(state) ?? "";

  function run(mode: JsonTextMode) {
    try {
      const output = transformJsonText(input, mode);
      setState((current) => resolveResult(current, current.version, output));
    } catch (err) {
      const position = err instanceof JsonTextError ? err.position : 0;
      setState((current) =>
        rejectResult(current, current.version, String(position))
      );
    }
  }

  function updateInput(value: string) {
    setState((current) => editResultInput(current, value));
  }

  return (
    <ToolShell title={t("json.title")} blurb={t("json.description")}>
      <Field label={t("common.input")}>
        <TextArea
          value={input}
          onChange={(e) => updateInput(e.target.value)}
          placeholder='{"user":"root","roles":["admin","dev"],"active":true}'
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <button className="btn" onClick={() => run("format")}>
          <CheckCircle2 size={13} />
          {t("common.format")}
        </button>
        <button className="btn" onClick={() => run("minify")}>
          <Minimize2 size={13} />
          {t("common.minify")}
        </button>
      </div>

      {state.status === "error" && (
        <Notice>{t("json.errors.invalid", { position: state.message })}</Notice>
      )}

      {state.status === "success" && (
        <Field
          label={t("common.output")}
          action={<CopyButton value={output} />}
        >
          <div className="terminal min-h-[120px] whitespace-pre">{output}</div>
        </Field>
      )}
    </ToolShell>
  );
}
