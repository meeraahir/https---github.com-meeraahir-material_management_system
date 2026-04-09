import clsx from "clsx";
import { useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { icons } from "../../assets/icons";
import {
  navigationGroups,
  navigationPrimaryItems,
} from "../../utils/navigation";

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
  const location = useLocation();
  const activeGroupIds = useMemo(
    () =>
      navigationGroups
        .filter((group) =>
          group.items.some((item) => location.pathname.startsWith(item.to)),
        )
        .map((group) => group.id),
    [location.pathname],
  );
  const [openGroups, setOpenGroups] = useState<string[]>(activeGroupIds);
  const expandedGroupIds = useMemo(
    () => [...new Set([...openGroups, ...activeGroupIds])],
    [activeGroupIds, openGroups],
  );

  function toggleGroup(groupId: string) {
    if (collapsed) {
      return;
    }

    setOpenGroups((currentValue) =>
      currentValue.includes(groupId)
        ? currentValue.filter((value) => value !== groupId)
        : [...currentValue, groupId],
    );
  }

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
          "fixed inset-y-0 left-0 z-40 flex h-screen w-72 flex-col overflow-hidden border-r border-slate-200/80 bg-white/92 px-3 py-4 shadow-2xl shadow-slate-900/10 backdrop-blur-xl transition dark:border-slate-800 dark:bg-slate-950/92 lg:translate-x-0 lg:shadow-none",
          collapsed ? "lg:w-22" : "lg:w-68",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-2">
          <div className={clsx("space-y-1", collapsed && "lg:hidden")}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-600">
              ERP
            </p>
            <h1 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
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

        <div className="hide-scrollbar mt-6 flex-1 overflow-y-auto pr-1">
          <nav className="space-y-5 pb-4">
            <div className="space-y-2">
              <p
                className={clsx(
                  "px-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400/90",
                  collapsed && "lg:hidden",
                )}
              >
                Workspace
              </p>
              <div className="grid gap-1.5">
                {navigationPrimaryItems.map((item) => (
                  <NavLink
                    key={item.to}
                    className={({ isActive }) =>
                      clsx(
                        "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition duration-200",
                        isActive
                          ? "bg-linear-to-r from-blue-600 to-sky-500 text-white shadow-lg shadow-blue-600/20"
                          : "text-slate-600 hover:bg-slate-100/90 dark:text-slate-300 dark:hover:bg-slate-800",
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
              </div>
            </div>

            <div className="space-y-2.5">
              <p
                className={clsx(
                  "px-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400/90",
                  collapsed && "lg:hidden",
                )}
              >
                Modules
              </p>
              <div className="space-y-1.5">
                {navigationGroups.map((group) => {
                  const isActive = group.items.some((item) =>
                    location.pathname.startsWith(item.to),
                  );
                  const isExpanded =
                    !collapsed &&
                    (isActive || expandedGroupIds.includes(group.id));

                  return (
                    <div
                      className={clsx(
                        "rounded-2xl border p-1.5 transition duration-200",
                        isActive
                          ? "border-blue-200/80 bg-blue-50/75 shadow-sm shadow-blue-500/10 dark:border-blue-500/20 dark:bg-blue-500/8"
                          : "border-slate-200/80 bg-slate-50/75 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60",
                      )}
                      key={group.id}
                    >
                      <button
                        className={clsx(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition duration-200",
                          isActive
                            ? "bg-white/95 text-slate-950 shadow-sm dark:bg-slate-950 dark:text-slate-50"
                            : "text-slate-600 hover:bg-white/90 dark:text-slate-300 dark:hover:bg-slate-950",
                          collapsed && "justify-center lg:px-0",
                        )}
                        onClick={() => toggleGroup(group.id)}
                        type="button"
                      >
                        <span className="shrink-0">{group.icon}</span>
                        <span className={clsx("flex-1", collapsed && "lg:hidden")}>
                          {group.label}
                        </span>
                        <span
                          className={clsx(
                            "text-slate-400 transition duration-300 ease-out",
                            isExpanded && "rotate-90",
                            collapsed && "lg:hidden",
                          )}
                        >
                          {icons.chevronRight({ className: "h-4 w-4" })}
                        </span>
                      </button>

                      <div
                        className={clsx(
                          "grid transition-all duration-300 ease-out",
                          isExpanded
                            ? "grid-rows-[1fr] opacity-100"
                            : "grid-rows-[0fr] opacity-0",
                          collapsed && "lg:hidden",
                        )}
                      >
                        <div className="overflow-hidden">
                          <div
                            className={clsx(
                              "space-y-1 pl-2 pt-1 transition-all duration-300 ease-out",
                              isExpanded
                                ? "translate-y-0"
                                : "-translate-y-1",
                            )}
                          >
                          {group.items.map((item) => (
                            <NavLink
                              key={item.to}
                              className={({ isActive: isItemActive }) =>
                                clsx(
                                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition duration-200",
                                  isItemActive
                                    ? "bg-linear-to-r from-blue-600 to-sky-500 text-white shadow-lg shadow-blue-600/20"
                                    : "text-slate-600 hover:bg-white/90 dark:text-slate-300 dark:hover:bg-slate-950",
                                )
                              }
                              onClick={onClose}
                              to={item.to}
                            >
                              <span className="shrink-0">{item.icon}</span>
                              <span>{item.label}</span>
                            </NavLink>
                          ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
}
