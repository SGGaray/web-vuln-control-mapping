"use client";

import { useEffect, useRef, useState } from "react";
import { ToolShell, Notice } from "@/components/ui/ToolShell";
import { Field, TextArea } from "@/components/ui/Field";
import CopyButton from "@/components/ui/CopyButton";
import { HashRequestError, requestHashes } from "@/lib/hash-request";
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

// Node's crypto (used by the API route) supports MD5, which the browser's
// Web Crypto does not. That is the main reason hashing lives on the server.
const ALGORITHMS = ["md5", "sha1", "sha256"] as const;
type Algo = (typeof ALGORITHMS)[number];

export default function HashTool() {
  const { t } = useLocale();
  const [state, setState] = useState<ResultState<Record<Algo, string>>>(initialResultState);
  const activeController = useRef<AbortController | null>(null);
  const input = state.input;

  // Debounce the request so we are not hashing on every single keystroke.
  useEffect(() => {
    if (!input) {
      return;
    }

    const requestVersion = state.version;
    const controller = new AbortController();
    activeController.current = controller;
    const timer = setTimeout(async () => {
      try {
        const hashes = await requestHashes(input, ALGORITHMS, controller.signal);
        setState((current) => resolveResult(current, requestVersion, hashes));
      } catch (err) {
        if (!(err instanceof HashRequestError && err.kind === "aborted")) {
          const message = err instanceof HashRequestError
            ? `${err.kind}:${err.status ?? ""}`
            : "network:";
          setState((current) => rejectResult(
            current,
            requestVersion,
            message
          ));
        }
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [input, state.version]);

  function updateInput(value: string) {
    activeController.current?.abort();
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
          placeholder="admin:password"
        />
      </Field>

      {state.status === "error" && (
        <Notice>
          {state.message.startsWith("network:")
            ? t("hash.errors.network")
            : state.message.startsWith("api:")
              ? t("hash.errors.api", {
                  status: state.message.split(":")[1]
                    ? ` (HTTP ${state.message.split(":")[1]})`
                    : "",
                })
              : t("hash.errors.invalidResponse")}
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
