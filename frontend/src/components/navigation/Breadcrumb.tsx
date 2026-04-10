import { useLocation } from "react-router-dom";

import { routeLabelMap } from "../../utils/navigation";

export function Breadcrumb() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);
  const activeSegment = segments.at(-1) ?? "dashboard";
  const activeLabel = routeLabelMap.get(activeSegment) ?? activeSegment;

  return (
    <div className="group min-w-0">
      <div className="flex items-center gap-3">
        <div className="hidden h-10 w-1 rounded-full bg-gradient-to-b from-blue-500 via-cyan-400 to-emerald-400 shadow-lg shadow-blue-500/20 sm:block" />
        <div className="min-w-0">
          <p className="app-topbar-eyebrow text-[0.62rem] font-semibold uppercase tracking-[0.32em] text-blue-500/90 dark:text-blue-300">
            ERP Workspace
          </p>
          <h1
            className="app-topbar-title mt-1 truncate bg-gradient-to-r from-slate-950 via-blue-700 to-cyan-600 bg-clip-text text-2xl font-black tracking-tight text-transparent dark:from-slate-950 dark:via-blue-700 dark:to-cyan-600"
            title={activeLabel}
          >
            {activeLabel}
          </h1>
        </div>
      </div>
    </div>
  );
}
