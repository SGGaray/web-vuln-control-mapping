"use client";

import { useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { ToolShell, Notice } from "@/components/ui/ToolShell";
import { Field, TextArea } from "@/components/ui/Field";
import CopyButton from "@/components/ui/CopyButton";
import { decodeUrlComponent, encodeUrlComponent } from "@/lib/url-component";
import { useLocale } from "@/lib/i18n/context";

type Mode = "encode" | "decode";

export default function UrlTool() {
  const { t } = useLocale();
  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");

  let output = "";
  let error = "";
  if (input) {
    try {
      output =
        mode === "encode"
          ? encodeUrlComponent(input)
          : decodeUrlComponent(input);
    } catch {
      error = t("url.errors.malformed");
    }
  }

  return (
    <ToolShell title={t("url.title")} blurb={t("url.description")}>
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

      <Field label={mode === "encode" ? t("url.raw") : t("url.encoded")}>
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
        <span className="eyebrow">{t("common.output")}</span>
      </div>

      {error ? (
        <Notice>{error}</Notice>
      ) : (
        <Field label={t("common.result")} action={<CopyButton value={output} />}>
          <div className="terminal min-h-[80px]">{output || "\u00a0"}</div>
        </Field>
      )}
    </ToolShell>
  );
}
