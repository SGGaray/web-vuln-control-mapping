"use client";

import { ReactNode } from "react";

/**
 * A labeled block. Wraps any control (textarea, input, select) with a
 * consistent eyebrow label and optional trailing action, e.g. a copy button.
 */
export function Field({
  label,
  action,
  children,
}: {
  label: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between min-h-[24px]">
        <span className="eyebrow">{label}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

/** A monospace textarea preset to the shared `.io` style. */
export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea spellCheck={false} className="io min-h-[160px] resize-y" {...props} />;
}

/** A monospace single line input preset to the shared `.io` style. */
export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input spellCheck={false} className="io" {...props} />;
}
