"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";

type LabelableProps = { id?: string };

function isLabelableElement(child: ReactNode): child is ReactElement<LabelableProps> {
  if (!isValidElement<LabelableProps>(child)) return false;
  return (
    child.type === "input" ||
    child.type === "textarea" ||
    child.type === "select" ||
    child.type === TextArea ||
    child.type === TextInput
  );
}

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
  const generatedId = useId();
  const child = Children.count(children) === 1 ? Children.only(children) : children;
  const labelable = isLabelableElement(child);
  const controlId = labelable ? child.props.id ?? generatedId : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between min-h-[24px]">
        {controlId ? (
          <label className="eyebrow" htmlFor={controlId}>
            {label}
          </label>
        ) : (
          <span className="eyebrow">{label}</span>
        )}
        {action}
      </div>
      {labelable ? cloneElement(child, { id: controlId }) : child}
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
