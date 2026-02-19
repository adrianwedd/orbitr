import React, { useId, useState } from 'react';

interface CollapsiblePanelProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsiblePanel({ title, defaultOpen = true, children }: CollapsiblePanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const contentId = `panel-content-${panelId}`;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/50 shadow-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-900/70 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
        aria-expanded={open}
        aria-controls={contentId}
      >
        <span className="text-sm font-semibold text-zinc-200">{title}</span>
        <span className={`text-zinc-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      <div
        id={contentId}
        aria-hidden={!open}
        className={`grid transition-all duration-200 ease-out border-t border-zinc-800 ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-3">{children}</div>
        </div>
      </div>
    </section>
  );
}
