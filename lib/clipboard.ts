/** Minimal slice of the Clipboard API that copying needs. */
export type ClipboardWriter = { writeText(text: string): Promise<void> };

export type CopyOutcome = "copied" | "failed";

function defaultClipboard(): ClipboardWriter | undefined {
  return typeof navigator === "undefined" ? undefined : navigator.clipboard;
}

/**
 * Writes `text` to the clipboard and reports whether it worked.
 *
 * The async Clipboard API exists only in secure contexts (HTTPS or
 * localhost), and the browser may still reject a write (permissions policy,
 * no user activation, document not focused). Both cases are reported as
 * "failed" so the caller can tell the user; nothing falls back to the
 * deprecated document.execCommand("copy") or asks for extra permissions.
 */
export async function copyText(text: string, clipboard: ClipboardWriter | undefined = defaultClipboard()): Promise<CopyOutcome> {
  if (!clipboard || typeof clipboard.writeText !== "function") return "failed";
  try {
    await clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
