"use client";

import { useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { ToolShell, Notice } from "@/components/ui/ToolShell";
import { Field, TextArea } from "@/components/ui/Field";
import CopyButton from "@/components/ui/CopyButton";
import {
  convertBase64Text,
} from "@/lib/base64-text";
import { useLocale } from "@/lib/i18n/context";

type Mode = "encode" | "decode";

export default function Base64Tool() {
  const { t } = useLocale();
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
    <ToolShell title={t("base64.title")} blurb={t("base64.description")}>
      {/* Mode switch */}
      <div className="flex gap-1">
        {(["encode", "decode"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
            className={`btn ${
              mode === m ? "border-muted text-bright bg-raised" : "opacity-60"
            }`}
          >
            {t(m === "encode" ? "common.encode" : "common.decode")}
          </button>
        ))}
      </div>

      <Field label={mode === "encode" ? t("base64.plainText") : t("base64.input")}>
        <TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === "encode" ? "hello world" : "aGVsbG8gd29ybGQ="}
        />
      </Field>

      <div className="flex items-center gap-2 text-muted">
        <ArrowRightLeft size={14} />
        <span className="eyebrow">{t("common.output")}</span>
      </div>

      {error ? (
        <Notice>
          {t(
            error.startsWith("Base64 is valid")
              ? "base64.errors.invalidUtf8"
              : error.startsWith("Could not")
                ? "base64.errors.conversion"
                : "base64.errors.invalid"
          )}
        </Notice>
      ) : (
        <Field
          label={mode === "encode" ? "Base64" : t("base64.plainText")}
          action={<CopyButton value={output} />}
        >
          <div className="terminal min-h-[80px]">{output || "\u00a0"}</div>
        </Field>
      )}
    </ToolShell>
  );
}
