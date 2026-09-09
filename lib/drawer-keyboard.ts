export type DrawerKeyAction = "close" | "focus-first" | "focus-last" | null;

export function getDrawerKeyAction(
  key: string,
  shiftKey: boolean,
  currentIndex: number,
  itemCount: number
): DrawerKeyAction {
  if (key === "Escape") return "close";
  if (key !== "Tab" || itemCount === 0) return null;
  if (shiftKey && currentIndex <= 0) return "focus-last";
  if (!shiftKey && currentIndex >= itemCount - 1) return "focus-first";
  return null;
}

export function restoreDrawerFocus(
  target: { focus: () => void } | null,
  schedule: (callback: () => void) => unknown = requestAnimationFrame
): void {
  schedule(() => target?.focus());
}
