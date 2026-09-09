"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useLocale } from "@/lib/i18n/context";

/**
 * Copy-to-clipboard button used by every tool.
 * Shows a brief "copied" confirmation, then resets itself.
 */
export default function CopyButton({
  value,
  label,
}: {
  value: string;
  label?: string;
}) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);
  const copyLabel = label ?? t("common.copy");
  const copiedLabel = t("common.copied");

  async function handleCopy() {
    // Nothing to copy? Bail quietly so we never show a false confirmation.
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      // Reset the label after a moment so the button is reusable.
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard can be blocked (insecure context, permissions). Fail silently.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!value}
      className="btn"
      aria-label={copied ? copiedLabel : copyLabel}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? copiedLabel : copyLabel}
    </button>
  );
}
