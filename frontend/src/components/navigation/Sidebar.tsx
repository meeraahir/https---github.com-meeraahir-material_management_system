import clsx from "clsx";
import { NavLink } from "react-router-dom";

import { icons } from "../../assets/icons";
import { navigationItems } from "../../utils/navigation";

interface SidebarProps {
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
  open: boolean;
}

export function Sidebar({
  collapsed,
  onClose,
  onToggleCollapse,
  open,
}: SidebarProps) {
  return (
    <>
      <div
        className={clsx(
          "fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-sm transition lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white/95 px-4 py-5 shadow-2xl shadow-slate-900/10 backdrop-blur transition dark:border-slate-800 dark:bg-slate-950/95 lg:static lg:translate-x-0 lg:shadow-none",
          collapsed ? "lg:w-24" : "lg:w-72",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-2">
          <div className={clsx("space-y-1", collapsed && "lg:hidden")}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
              ERP
            </p>
            <h1 className="text-xl font-semibold text-slate-950 dark:text-slate-50">
              Material System
            </h1>
          </div>
          <button
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            onClick={onToggleCollapse}
            type="button"
          >
            {collapsed
              ? icons.chevronRight({ className: "h-5 w-5" })
              : icons.chevronLeft({ className: "h-5 w-5" })}
          </button>
        </div>

        <nav className="mt-8 grid gap-2">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition",
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                  collapsed && "justify-center lg:px-0",
                )
              }
              end={item.to === "/dashboard"}
              onClick={onClose}
              to={item.to}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className={clsx(collapsed && "lg:hidden")}>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
