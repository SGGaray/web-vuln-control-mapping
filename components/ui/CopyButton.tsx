"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Copy } from "lucide-react";
import { copyText, type CopyOutcome } from "@/lib/clipboard";
import { useLocale } from "@/lib/i18n/context";

const RESET_AFTER_MS: Record<CopyOutcome, number> = { copied: 1200, failed: 4000 };

/**
 * Copy-to-clipboard button used by every tool.
 * Shows a brief "copied" confirmation, or a "could not copy" warning when the
 * Clipboard API is missing (insecure context) or the browser refuses the
 * write, then resets itself. The outcome is also announced to screen readers.
 */
export default function CopyButton({
  value,
  label,
}: {
  value: string;
  label?: string;
}) {
  const { t } = useLocale();
  const [outcome, setOutcome] = useState<CopyOutcome | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const copyLabel = label ?? t("common.copy");

  useEffect(() => () => clearTimeout(timer.current), []);

  async function handleCopy() {
    // Nothing to copy? Bail quietly so we never show a false confirmation.
    if (!value) return;
    const result = await copyText(value);
    clearTimeout(timer.current);
    setOutcome(result);
    // Reset the label after a moment so the button is reusable.
    timer.current = setTimeout(() => setOutcome(null), RESET_AFTER_MS[result]);
  }

  const shown =
    outcome === "copied"
      ? { icon: <Check size={13} />, text: t("common.copied") }
      : outcome === "failed"
        ? { icon: <AlertTriangle size={13} />, text: t("common.copyFailed") }
        : { icon: <Copy size={13} />, text: copyLabel };

  return (
    <>
      <button
        type="button"
        onClick={handleCopy}
        disabled={!value}
        className="btn"
        aria-label={shown.text}
        title={outcome === "failed" ? t("common.copyFailedHint") : undefined}
      >
        {shown.icon}
        {shown.text}
      </button>
      <span aria-live="polite" className="sr-only">
        {outcome === "copied" ? t("common.copied") : outcome === "failed" ? t("common.copyFailedHint") : ""}
      </span>
    </>
  );
}
