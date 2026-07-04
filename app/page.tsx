"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { getTool, tools } from "@/lib/tools";

export default function Home() {
  // The active tool id drives the whole view. We keep it in the URL hash so
  // a tool is bookmarkable and the back button works, all without a reload.
  const [activeId, setActiveId] = useState(tools[0].id);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Read the hash on load and whenever it changes (back/forward navigation).
  useEffect(() => {
    const sync = () => {
      const id = window.location.hash.replace("#", "");
      if (id) setActiveId(getTool(id).id);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  function select(id: string) {
    setActiveId(id);
    window.location.hash = id; // updates the URL without a full navigation
    setDrawerOpen(false); // close the mobile drawer after choosing
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
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-line bg-surface">
            <Sidebar activeId={activeId} onSelect={select} />
          </aside>
        </div>
      )}

      {/* Main column, offset for the fixed sidebar on desktop. */}
      <div className="flex min-h-screen flex-1 flex-col md:ml-64">
        {/* Mobile top bar with the drawer toggle. Hidden on desktop. */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-base/80 px-4 py-3 backdrop-blur md:hidden">
          <button
            onClick={() => setDrawerOpen((v) => !v)}
            className="btn"
            aria-label="Toggle navigation"
          >
            {drawerOpen ? <X size={15} /> : <Menu size={15} />}
          </button>
          <span className="font-mono text-sm text-bright">payload / reference</span>
        </header>

        <main className="relative flex-1 px-5 py-8 sm:px-8 lg:px-12">
          <ActiveTool />
        </main>
      </div>
    </div>
  );
}
