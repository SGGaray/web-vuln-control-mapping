"use client";

import type { KeyboardEventHandler, RefObject } from "react";
import Sidebar from "@/components/Sidebar";
import { useLocale } from "@/lib/i18n/context";

export default function MobileDrawer({
  activeId,
  drawerRef,
  onClose,
  onKeyDown,
  onSelect,
}: {
  activeId: string;
  drawerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onKeyDown: KeyboardEventHandler<HTMLDivElement>;
  onSelect: (id: string) => void;
}) {
  const { t } = useLocale();

  return (
    <div className="fixed inset-0 z-40 md:hidden" onKeyDown={onKeyDown}>
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={drawerRef}
        id="mobile-tool-navigation"
        role="dialog"
        aria-modal="true"
        aria-label={t("navigation.drawerLabel")}
        className="absolute inset-y-0 left-0 w-64 border-r border-line bg-surface"
      >
        <Sidebar activeId={activeId} onSelect={onSelect} />
      </aside>
    </div>
  );
}
