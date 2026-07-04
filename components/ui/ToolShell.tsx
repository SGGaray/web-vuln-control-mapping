import { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Every tool renders inside this shell so the header, spacing, and max width
 * are identical across the app. Keeps tool components focused on their logic.
 */
export function ToolShell({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb: string;
  children: ReactNode;
}) {
  return (
    <section className="relative z-10 mx-auto w-full max-w-3xl">
      <header className="mb-6 border-b border-line pb-4">
        <h1 className="font-mono text-lg text-bright">{title}</h1>
        <p className="mt-1 text-sm text-muted">{blurb}</p>
      </header>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  );
}

/**
 * Inline message row. Used for validation errors and status hints.
 * Monochrome, so severity is shown by an icon and border, never by color.
 */
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded border border-line bg-raised px-3 py-2 text-sm text-fg">
      <AlertTriangle size={15} className="mt-0.5 shrink-0 text-muted" />
      <span className="font-mono">{children}</span>
    </div>
  );
}
