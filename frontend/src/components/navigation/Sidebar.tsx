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

const groupThemeClasses = {
  amber: {
    accent: "bg-amber-500",
    icon: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
    panel:
      "border-amber-200/80 bg-amber-50/80 hover:border-amber-300/80 dark:border-amber-500/15 dark:bg-amber-500/8",
    subtle: "text-amber-700/80 dark:text-amber-200/80",
  },
  emerald: {
    accent: "bg-emerald-500",
    icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
    panel:
      "border-emerald-200/80 bg-emerald-50/80 hover:border-emerald-300/80 dark:border-emerald-500/15 dark:bg-emerald-500/8",
    subtle: "text-emerald-700/80 dark:text-emerald-200/80",
  },
  rose: {
    accent: "bg-rose-500",
    icon: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200",
    panel:
      "border-rose-200/80 bg-rose-50/80 hover:border-rose-300/80 dark:border-rose-500/15 dark:bg-rose-500/8",
    subtle: "text-rose-700/80 dark:text-rose-200/80",
  },
  sky: {
    accent: "bg-sky-500",
    icon: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200",
    panel:
      "border-sky-200/80 bg-sky-50/80 hover:border-sky-300/80 dark:border-sky-500/15 dark:bg-sky-500/8",
    subtle: "text-sky-700/80 dark:text-sky-200/80",
  },
  slate: {
    accent: "bg-slate-500",
    icon: "bg-slate-200 text-slate-700 dark:bg-slate-700/70 dark:text-slate-200",
    panel:
      "border-slate-200/80 bg-slate-50/80 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/60",
    subtle: "text-slate-600 dark:text-slate-300",
  },
} as const;

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
          collapsed ? "lg:w-[5.5rem]" : "lg:w-[17rem]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div
          className={clsx(
            "rounded-[1.75rem] border border-slate-200/80 bg-linear-to-br from-white via-slate-50 to-blue-50 px-3 py-3 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900",
            collapsed ? "lg:px-2.5" : "lg:px-3.5",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-600 to-sky-500 text-white shadow-lg shadow-blue-600/20">
                {icons.materials({ className: "h-5 w-5" })}
              </div>
              <div className={clsx("min-w-0", collapsed && "lg:hidden")}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-600">
                  ERP Workspace
                </p>
                <h1 className="truncate text-base font-semibold text-slate-950 dark:text-slate-50">
                  Material System
                </h1>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  Structured operations console
                </p>
              </div>
            </div>
            <button
              className="rounded-xl p-2 text-slate-500 transition hover:bg-white hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              onClick={onToggleCollapse}
              type="button"
            >
              {collapsed
                ? icons.chevronRight({ className: "h-5 w-5" })
                : icons.chevronLeft({ className: "h-5 w-5" })}
            </button>
          </div>
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
                        "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition duration-200",
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
                    <span
                      className={clsx(
                        "absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-blue-500 opacity-0 transition",
                        location.pathname.startsWith(item.to) && "opacity-100",
                        collapsed && "lg:left-1",
                      )}
                    />
                    <span className="shrink-0">{item.icon}</span>
                    <span className={clsx(collapsed && "lg:hidden")}>{item.label}</span>
                    {collapsed ? (
                      <span className="pointer-events-none absolute left-full top-1/2 z-20 ml-3 hidden -translate-y-1/2 rounded-xl bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition duration-200 group-hover:opacity-100 dark:bg-white dark:text-slate-950 lg:block">
                        {item.label}
                      </span>
                    ) : null}
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
                  const themeClasses = groupThemeClasses[group.theme];
                  const isActive = group.items.some((item) =>
                    location.pathname.startsWith(item.to),
                  );
                  const isExpanded =
                    !collapsed &&
                    (isActive || expandedGroupIds.includes(group.id));

                  return (
                    <div
                      className={clsx(
                        "group relative rounded-2xl border p-1.5 transition duration-200",
                        isActive
                          ? `${themeClasses.panel} shadow-sm shadow-slate-900/5`
                          : "border-slate-200/80 bg-slate-50/75 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60",
                      )}
                      key={group.id}
                    >
                      <span
                        className={clsx(
                          "absolute inset-y-2 left-0 w-1 rounded-r-full opacity-0 transition duration-200",
                          themeClasses.accent,
                          isActive && "opacity-100",
                        )}
                      />
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
                        <span
                          className={clsx(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                            themeClasses.icon,
                          )}
                        >
                          {group.icon}
                        </span>
                        <span className={clsx("min-w-0 flex-1", collapsed && "lg:hidden")}>
                          <span className="block truncate">{group.label}</span>
                          <span
                            className={clsx(
                              "mt-0.5 block truncate text-[11px] font-medium",
                              themeClasses.subtle,
                            )}
                          >
                            {group.description}
                          </span>
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
                      {collapsed ? (
                        <span className="pointer-events-none absolute left-full top-1/2 z-20 ml-3 hidden -translate-y-1/2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-lg transition duration-200 group-hover:opacity-100 dark:bg-white dark:text-slate-950 lg:block">
                          {group.label}
                        </span>
                      ) : null}

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
                                  "group/item flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition duration-200",
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
