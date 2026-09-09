"use client";

import { useState } from "react";
import { CircleCheck, CircleHelp, CircleMinus, ScanLine, TriangleAlert } from "lucide-react";
import { ToolShell, Notice } from "@/components/ui/ToolShell";
import { Field, TextArea } from "@/components/ui/Field";
import {
  analyzeHeaderInput,
  type AssessmentStatus,
  type HeaderAnalysis,
} from "@/lib/headers";
import {
  copyableResult,
  editResultInput,
  initialResultState,
  rejectResult,
  resolveResult,
  type ResultState,
} from "@/lib/result-state";
import { useLocale } from "@/lib/i18n/context";
import type { TranslationKey } from "@/lib/i18n";
import { headerDiagnosticKey, headerSummaryKey } from "@/lib/i18n/presentation";

const SAMPLE = `HTTP/1.1 200 OK
Server: nginx/1.25.3
Content-Type: text/html; charset=UTF-8
Set-Cookie: session=abc123; HttpOnly
X-Powered-By: PHP/8.2.0`;

const MAX_LENGTH = 20_000;

const STATUS_LABEL: Record<AssessmentStatus, TranslationKey> = {
  observed: "headers.states.observed",
  "not-observed": "headers.states.notObserved",
  "invalid-or-ineffective": "headers.states.invalidOrIneffective",
  "not-evaluated": "headers.states.notEvaluated",
};

function StatusIcon({ status }: { status: AssessmentStatus }) {
  if (status === "observed") return <CircleCheck size={15} className="mt-0.5 shrink-0 text-bright" />;
  if (status === "not-observed") return <CircleMinus size={15} className="mt-0.5 shrink-0 text-muted" />;
  if (status === "invalid-or-ineffective") return <TriangleAlert size={15} className="mt-0.5 shrink-0 text-muted" />;
  return <CircleHelp size={15} className="mt-0.5 shrink-0 text-muted" />;
}

export default function HeaderAnalyzer() {
  const { t } = useLocale();
  const [state, setState] = useState<ResultState<HeaderAnalysis>>(initialResultState);
  const raw = state.input;
  const result = copyableResult(state);

  function analyze() {
    if (!raw.trim()) return;
    if (raw.length > MAX_LENGTH) {
      setState((current) =>
        rejectResult(current, current.version, "too-long")
      );
      return;
    }
    setState((current) => resolveResult(current, current.version, analyzeHeaderInput(raw)));
  }

  function updateRaw(value: string) {
    setState((current) => editResultInput(current, value));
  }

  return (
    <ToolShell title={t("headers.title")} blurb={t("headers.description")}>
      <Field
        label={t("headers.raw")}
        action={
          <button className="btn" onClick={() => updateRaw(SAMPLE)}>
            {t("headers.loadSample")}
          </button>
        }
      >
        <TextArea
          value={raw}
          onChange={(e) => updateRaw(e.target.value)}
          placeholder={SAMPLE}
        />
      </Field>

      <div>
        <button className="btn" onClick={analyze} disabled={!raw.trim()}>
          <ScanLine size={13} />
          {t("headers.analyze")}
        </button>
      </div>

      {state.status === "error" && (
        <Notice>
          {state.message === "too-long"
            ? t("headers.tooLong", { max: MAX_LENGTH })
            : state.message}
        </Notice>
      )}

      {result?.status === "undetermined" && (
        <Notice>{t("headers.undetermined")}</Notice>
      )}

      {result?.selectedResponse && (
        <div className="flex flex-col gap-5">
          <div className="rounded border border-line bg-raised px-3 py-2 font-mono text-xs text-muted">
            {t(
              result.responses.length === 1 ? "headers.detected.one" : "headers.detected.other",
              {
                count: result.responses.length,
                selected: Number(result.selectedResponseIndex) + 1,
                detail: result.selectedResponse.statusLine
                  ? t("headers.statusDetail", { status: result.selectedResponse.statusLine })
                  : t("headers.headerOnly"),
              }
            )}
          </div>

          <Field label={t("headers.parsed", { count: result.selectedResponse.headers.length })}>
            <div className="rounded border border-line divide-y divide-line">
              {result.selectedResponse.headers.map((h, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[minmax(0,180px)_1fr] gap-3 px-3 py-2 text-sm font-mono"
                >
                  <span className="text-muted break-all">{h.name}</span>
                  <span className="text-fg break-all">{h.value}</span>
                </div>
              ))}
            </div>
          </Field>

          <Field label={t("headers.assessment")}>
            <div className="rounded border border-line divide-y divide-line">
              {result.assessments.map((assessment) => (
                <div key={assessment.header} className="flex items-start gap-3 px-3 py-2.5">
                  <StatusIcon status={assessment.status} />
                  <div className="flex flex-col">
                    <span className="font-mono text-sm text-fg">{assessment.header}</span>
                    <span className="text-xs text-muted">
                      {headerSummaryKey(assessment.summary)
                        ? t(headerSummaryKey(assessment.summary)!)
                        : assessment.summary}
                    </span>
                  </div>
                  <span className="ml-auto max-w-28 text-right eyebrow">
                    {t(STATUS_LABEL[assessment.status])}
                  </span>
                </div>
              ))}
            </div>
          </Field>

          {result.diagnostics.length > 0 && (
            <Field label={t("headers.diagnostics", { count: result.diagnostics.length })}>
              <ul className="rounded border border-line px-4 py-3 font-mono text-xs text-muted">
                {result.diagnostics.map((diagnostic, index) => (
                  <li key={`${diagnostic.line ?? 0}-${index}`}>
                    {diagnostic.line ? `${t("common.line")} ${diagnostic.line}: ` : ""}
                    {headerDiagnosticKey(diagnostic.message)
                      ? t(headerDiagnosticKey(diagnostic.message)!)
                      : diagnostic.message}
                  </li>
                ))}
              </ul>
            </Field>
          )}
        </div>
      )}
    </ToolShell>
  );
}
