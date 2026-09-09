"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Menu, X } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { getTool, tools } from "@/lib/tools";
import { getDrawerKeyAction, restoreDrawerFocus } from "@/lib/drawer-keyboard";
import { navigateToTool, subscribeToToolHash } from "@/lib/navigation";
import MobileDrawer from "@/components/MobileDrawer";

export default function Home() {
  // The active tool id drives the whole view. We keep it in the URL hash so
  // a tool is bookmarkable and the back button works, all without a reload.
  const [activeId, setActiveId] = useState(tools[0].id);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  // Read the hash on load and whenever it changes (back/forward navigation).
  useEffect(() => {
    return subscribeToToolHash(window, setActiveId);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const frame = requestAnimationFrame(() => {
      drawerRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [drawerOpen]);

  function closeDrawer() {
    setDrawerOpen(false);
    restoreDrawerFocus(menuButtonRef.current);
  }

  function select(id: string) {
    setActiveId(id);
    navigateToTool(window, id);
    if (drawerOpen) closeDrawer();
  }

  function handleDrawerKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const focusable = Array.from(
      drawerRef.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") ?? []
    );
    const currentIndex = focusable.indexOf(document.activeElement as HTMLButtonElement);
    const action = getDrawerKeyAction(event.key, event.shiftKey, currentIndex, focusable.length);
    if (!action) return;

    event.preventDefault();
    if (action === "close") closeDrawer();
    if (action === "focus-first") focusable[0]?.focus();
    if (action === "focus-last") focusable.at(-1)?.focus();
  }

  const ActiveTool = getTool(activeId).component;

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar: fixed, always visible from md up. */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-surface/80 backdrop-blur md:block">
        <Sidebar activeId={activeId} onSelect={select} />
      </aside>

      {/* Mobile drawer: slides in over the content. */}
      {drawerOpen && (
        <MobileDrawer
          activeId={activeId}
          drawerRef={drawerRef}
          onClose={closeDrawer}
          onKeyDown={handleDrawerKeyDown}
          onSelect={select}
        />
      )}

      {/* Main column, offset for the fixed sidebar on desktop. */}
      <div className="flex min-h-screen flex-1 flex-col md:ml-64">
        {/* Mobile top bar with the drawer toggle. Hidden on desktop. */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-base/80 px-4 py-3 backdrop-blur md:hidden">
          <button
            ref={menuButtonRef}
            onClick={() => setDrawerOpen((v) => !v)}
            className="btn"
            aria-label={drawerOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={drawerOpen}
            aria-controls="mobile-tool-navigation"
          >
            {drawerOpen ? <X size={15} /> : <Menu size={15} />}
          </button>
          <span className="font-mono text-sm text-bright">payload / reference</span>
        </header>

        <main
          className="relative flex-1 px-5 py-8 sm:px-8 lg:px-12"
          inert={drawerOpen ? true : undefined}
          aria-hidden={drawerOpen ? true : undefined}
        >
          <ActiveTool />
        </main>
      </div>
    </div>
  );
}
