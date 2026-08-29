"use client";

import { Home, LayoutGrid, ClipboardList, FileText, FolderOpen, Settings, Search, Sparkles } from "lucide-react";
import clsx from "clsx";

const NAV_ITEMS = [
  { icon: Home, label: "Home" },
  { icon: LayoutGrid, label: "My Classroom" },
  { icon: ClipboardList, label: "Assessments", active: true },
  { icon: FileText, label: "Exams" },
  { icon: FolderOpen, label: "My Files" },
];

export default function Sidebar() {
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-surface h-screen sticky top-0">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center shrink-0">
          <Sparkles size={15} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="font-semibold text-ink text-[15px]">VedaAI</span>
      </div>

      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-canvas border border-border text-muted">
          <Search size={15} />
          <span className="text-sm">Search</span>
        </div>
      </div>

      <nav className="flex-1 px-3 pt-4 space-y-0.5">
        {NAV_ITEMS.map(({ icon: Icon, label, active }) => (
          <div
            key={label}
            className={clsx(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-default",
              active ? "bg-brand-light text-brand-dark font-medium" : "text-muted hover:bg-canvas"
            )}
          >
            <Icon size={17} strokeWidth={active ? 2.4 : 2} />
            {label}
          </div>
        ))}
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted hover:bg-canvas cursor-default">
          <Settings size={17} />
          Settings
        </div>
      </nav>

      <div className="m-4 rounded-xl bg-canvas border border-border p-4">
        <p className="text-xs font-medium text-ink mb-1">Invite your school</p>
        <p className="text-[11px] text-muted leading-snug mb-3">
          Bring your colleagues onto VedaAI to grade together.
        </p>
        <button className="w-full text-xs font-medium bg-ink text-white rounded-lg py-1.5 hover:bg-ink/90">
          Invite
        </button>
      </div>
    </aside>
  );
}
