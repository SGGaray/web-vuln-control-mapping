"use client";

import { useEffect, useState } from "react";
import { ToolShell, Notice } from "@/components/ui/ToolShell";
import { Field, TextArea } from "@/components/ui/Field";
import CopyButton from "@/components/ui/CopyButton";
import { ALLOWED_ALGORITHMS, HashError, MAX_TEXT_LENGTH, computeHashes } from "@/lib/hash-local";
import {
  copyableResult,
  editResultInput,
  initialResultState,
  rejectResult,
  resolveResult,
  startResult,
  type ResultState,
} from "@/lib/result-state";
import { useLocale } from "@/lib/i18n/context";

// Digests are computed in this tab (lib/hash-local.ts): Web Crypto for SHA-1
// and SHA-256, lib/md5.ts for MD5. The text is never sent to a server.
const ALGORITHMS = ALLOWED_ALGORITHMS;
type Algo = (typeof ALGORITHMS)[number];

export default function HashTool() {
  const { t } = useLocale();
  const [state, setState] = useState<ResultState<Record<Algo, string>>>(initialResultState);
  const input = state.input;

  // Debounce so a long text is not re-hashed on every keystroke. A result
  // that settles after the input changed again is dropped by resolveResult
  // and rejectResult, which compare versions.
  useEffect(() => {
    if (!input) {
      return;
    }

    const version = state.version;
    const timer = setTimeout(() => {
      computeHashes(input, ALGORITHMS).then(
        (hashes) => setState((current) => resolveResult(current, version, hashes)),
        (err: unknown) =>
          setState((current) =>
            rejectResult(current, version, err instanceof HashError ? err.code : "DIGEST_FAILED")
          )
      );
    }, 250);

    return () => clearTimeout(timer);
  }, [input, state.version]);

  function updateInput(value: string) {
    setState((current) => {
      const edited = editResultInput(current, value);
      return value ? startResult(edited) : edited;
    });
  }

  return (
    <ToolShell title={t("hash.title")} blurb={t("hash.description")}>
      <Field label={t("common.input")}>
        <TextArea
          value={input}
          onChange={(e) => updateInput(e.target.value)}
          placeholder="hello world"
        />
      </Field>

      {state.status === "error" && (
        <Notice>
          {state.message === "TEXT_TOO_LONG"
            ? t("hash.errors.tooLong", { max: MAX_TEXT_LENGTH })
            : state.message === "WEB_CRYPTO_UNAVAILABLE"
              ? t("hash.errors.unavailable")
              : t("hash.errors.failed")}
        </Notice>
      )}

      <div className="flex flex-col gap-3">
        {ALGORITHMS.map((algo) => {
          const value = copyableResult(state)?.[algo] ?? "";
          return (
            <Field
              key={algo}
              label={algo.toUpperCase()}
              action={value ? <CopyButton value={value} /> : null}
            >
              <div className="terminal min-h-[44px]">
                {state.status === "loading" ? t("common.computing") : value || "\u00a0"}
              </div>
            </Field>
          );
        })}
      </div>
    </ToolShell>
  );
}
