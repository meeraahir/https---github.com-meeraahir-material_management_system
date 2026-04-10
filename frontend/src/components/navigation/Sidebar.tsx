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
    icon: "bg-amber-100 text-amber-700 dark:bg-amber-100 dark:text-amber-700",
    panel:
      "border-amber-200/80 bg-amber-50/80 hover:border-amber-300/80 dark:border-amber-200/80 dark:bg-amber-50/80",
    subtle: "text-amber-700/80 dark:text-amber-700/80",
  },
  emerald: {
    accent: "bg-emerald-500",
    icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-100 dark:text-emerald-700",
    panel:
      "border-emerald-200/80 bg-emerald-50/80 hover:border-emerald-300/80 dark:border-emerald-200/80 dark:bg-emerald-50/80",
    subtle: "text-emerald-700/80 dark:text-emerald-700/80",
  },
  rose: {
    accent: "bg-rose-500",
    icon: "bg-rose-100 text-rose-700 dark:bg-rose-100 dark:text-rose-700",
    panel:
      "border-rose-200/80 bg-rose-50/80 hover:border-rose-300/80 dark:border-rose-200/80 dark:bg-rose-50/80",
    subtle: "text-rose-700/80 dark:text-rose-700/80",
  },
  sky: {
    accent: "bg-sky-500",
    icon: "bg-sky-100 text-sky-700 dark:bg-sky-100 dark:text-sky-700",
    panel:
      "border-sky-200/80 bg-sky-50/80 hover:border-sky-300/80 dark:border-sky-200/80 dark:bg-sky-50/80",
    subtle: "text-sky-700/80 dark:text-sky-700/80",
  },
  slate: {
    accent: "bg-slate-500",
    icon: "bg-slate-200 text-slate-700 dark:bg-slate-200 dark:text-slate-700",
    panel:
      "border-slate-200/80 bg-slate-50/80 hover:border-slate-300 dark:border-slate-200/80 dark:bg-slate-50/80",
    subtle: "text-slate-600 dark:text-slate-600",
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
          "app-sidebar fixed inset-y-0 left-0 z-40 flex h-screen w-72 flex-col overflow-hidden border-r border-teal-900/25 bg-[linear-gradient(180deg,#102f3d_0%,#143847_48%,#0f2a36_100%)] px-3 py-4 shadow-2xl shadow-teal-950/20 backdrop-blur-xl transition dark:border-teal-900/25 dark:bg-[linear-gradient(180deg,#102f3d_0%,#143847_48%,#0f2a36_100%)] lg:translate-x-0 lg:shadow-none",
          collapsed ? "lg:w-[5.5rem]" : "lg:w-[17rem]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div
          className={clsx(
            "rounded-[1.75rem] border border-teal-200/15 bg-white/8 px-3 py-3 shadow-lg shadow-teal-950/20 backdrop-blur dark:border-teal-200/15 dark:bg-white/8",
            collapsed ? "lg:px-2.5" : "lg:px-3.5",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-600 to-sky-500 text-white shadow-lg shadow-blue-600/20">
                {icons.materials({ className: "h-5 w-5" })}
              </div>
              <div className={clsx("min-w-0", collapsed && "lg:hidden")}>
                <h1
                  className="app-sidebar-brand-title truncate bg-gradient-to-r from-white via-cyan-100 to-teal-200 bg-clip-text text-lg font-black tracking-tight text-transparent dark:from-white dark:via-cyan-100 dark:to-teal-200"
                  title="Material Management"
                >
                  Material Management
                </h1>
              </div>
            </div>
            <button
              className="rounded-xl p-2 text-cyan-100/80 transition hover:bg-white/12 hover:text-white dark:hover:bg-white/12 dark:hover:text-white"
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
                  "px-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-cyan-100/55",
                  "sidebar-section-label",
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
                        "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition duration-200",
                        "sidebar-link",
                        isActive
                          ? "sidebar-link-active bg-linear-to-r from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-950/25"
                          : "text-teal-50 hover:bg-white/10 hover:text-white dark:text-teal-50 dark:hover:bg-white/10",
                        collapsed && "justify-center lg:px-0",
                      )
                    }
                    end={item.to === "/dashboard"}
                    onClick={onClose}
                    to={item.to}
                  >
                    <span
                      className={clsx(
                        "absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-teal-300 opacity-0 transition",
                        location.pathname.startsWith(item.to) && "opacity-100 bg-teal-300",
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
                  "px-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-cyan-100/55",
                  "sidebar-section-label",
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
                        "sidebar-group-panel",
                        isActive
                          ? `sidebar-group-panel-active ${themeClasses.panel} shadow-sm shadow-blue-950/5`
                          : "border-white/8 bg-white/5 hover:border-cyan-200/20 hover:bg-white/9 dark:border-white/8 dark:bg-white/5 dark:hover:bg-white/9",
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
                          "sidebar-group-button",
                          isActive
                            ? "sidebar-group-active bg-[#d7e7ea] text-slate-950 shadow-sm dark:bg-[#d7e7ea] dark:text-slate-950"
                            : "text-teal-50 hover:bg-white/10 hover:text-white dark:text-teal-50 dark:hover:bg-white/10",
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
                            "sidebar-group-description mt-0.5 block truncate text-[11px] font-medium",
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
                                  "sidebar-child-link",
                                  isItemActive
                                    ? "sidebar-child-link-active bg-linear-to-r from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-950/25"
                                    : "text-teal-50 hover:bg-white/10 hover:text-white dark:text-teal-50 dark:hover:bg-white/10 dark:hover:text-white",
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
