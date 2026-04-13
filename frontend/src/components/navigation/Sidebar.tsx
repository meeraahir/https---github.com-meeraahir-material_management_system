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
    accent: "bg-[#FF6B4A]",
    icon: "bg-[#FFF1EC] text-[#FF6B4A] dark:bg-[#FFF1EC] dark:text-[#FF6B4A]",
    panel:
      "border-[#E5E7EB] bg-[#FAFAFA] hover:border-[#D1D5DB] dark:border-[#E5E7EB] dark:bg-[#FAFAFA]",
    subtle: "text-[#6B7280] dark:text-[#6B7280]",
  },
  emerald: {
    accent: "bg-[#FF6B4A]",
    icon: "bg-[#FFF1EC] text-[#FF6B4A] dark:bg-[#FFF1EC] dark:text-[#FF6B4A]",
    panel:
      "border-[#E5E7EB] bg-[#FAFAFA] hover:border-[#D1D5DB] dark:border-[#E5E7EB] dark:bg-[#FAFAFA]",
    subtle: "text-[#6B7280] dark:text-[#6B7280]",
  },
  rose: {
    accent: "bg-[#FF6B4A]",
    icon: "bg-[#FFF1EC] text-[#FF6B4A] dark:bg-[#FFF1EC] dark:text-[#FF6B4A]",
    panel:
      "border-[#E5E7EB] bg-[#FAFAFA] hover:border-[#D1D5DB] dark:border-[#E5E7EB] dark:bg-[#FAFAFA]",
    subtle: "text-[#6B7280] dark:text-[#6B7280]",
  },
  sky: {
    accent: "bg-[#FF6B4A]",
    icon: "bg-[#FFF1EC] text-[#FF6B4A] dark:bg-[#FFF1EC] dark:text-[#FF6B4A]",
    panel:
      "border-[#E5E7EB] bg-[#FAFAFA] hover:border-[#D1D5DB] dark:border-[#E5E7EB] dark:bg-[#FAFAFA]",
    subtle: "text-[#6B7280] dark:text-[#6B7280]",
  },
  slate: {
    accent: "bg-[#FF6B4A]",
    icon: "bg-[#FFF1EC] text-[#FF6B4A] dark:bg-[#FFF1EC] dark:text-[#FF6B4A]",
    panel:
      "border-[#E5E7EB] bg-[#FAFAFA] hover:border-[#D1D5DB] dark:border-[#E5E7EB] dark:bg-[#FAFAFA]",
    subtle: "text-[#6B7280] dark:text-[#6B7280]",
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
          "app-sidebar fixed inset-y-0 left-0 z-40 flex h-screen w-72 flex-col overflow-hidden border-r border-[#E5E7EB] bg-white px-3 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition duration-300 lg:translate-x-0",
          collapsed ? "lg:w-[5.5rem]" : "lg:w-[17rem]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div
          className={clsx(
            "rounded-2xl border border-[#E5E7EB] bg-white px-3 py-3 shadow-sm",
            collapsed ? "lg:px-2.5" : "lg:px-3.5",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#111111] text-white shadow-sm">
                {icons.materials({ className: "h-5 w-5" })}
              </div>
              <div className={clsx("min-w-0", collapsed && "lg:hidden")}>
                <h1
                  className="app-sidebar-brand-title truncate text-lg font-semibold tracking-tight text-[#111111]"
                  title="Material Management"
                >
                  Material Management
                </h1>
              </div>
            </div>
            <button
              className="rounded-xl p-2 text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#111111]"
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
                  "px-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#9CA3AF]",
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
                        "group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition duration-200",
                        "sidebar-link",
                        isActive
                          ? "sidebar-link-active bg-[#111111] text-white shadow-sm"
                          : "text-[#374151] hover:bg-[#F3F4F6] hover:text-[#111111]",
                        collapsed && "justify-center lg:px-0",
                      )
                    }
                    end={item.to === "/dashboard"}
                    onClick={onClose}
                    to={item.to}
                  >
                    <span
                      className={clsx(
                        "absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-[#FF6B4A] opacity-0 transition",
                        location.pathname.startsWith(item.to) && "opacity-100 bg-[#FF6B4A]",
                        collapsed && "lg:left-1",
                      )}
                    />
                    <span className="shrink-0">{item.icon}</span>
                    <span className={clsx(collapsed && "lg:hidden")}>{item.label}</span>
                    {collapsed ? (
                      <span className="pointer-events-none absolute left-full top-1/2 z-20 ml-3 hidden -translate-y-1/2 rounded-xl bg-[#111111] px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition duration-200 group-hover:opacity-100 lg:block">
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
                  "px-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#9CA3AF]",
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
                          ? `sidebar-group-panel-active ${themeClasses.panel} shadow-sm`
                          : "border-transparent bg-white hover:border-[#E5E7EB] hover:bg-[#FAFAFA]",
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
                          "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-semibold transition duration-200",
                          "sidebar-group-button",
                          isActive
                            ? "sidebar-group-active bg-[#F3F4F6] text-[#111111] shadow-sm"
                            : "text-[#374151] hover:bg-[#F3F4F6] hover:text-[#111111]",
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
                            "text-[#9CA3AF] transition duration-300 ease-out",
                            isExpanded && "rotate-90",
                            collapsed && "lg:hidden",
                          )}
                        >
                          {icons.chevronRight({ className: "h-4 w-4" })}
                        </span>
                      </button>
                      {collapsed ? (
                        <span className="pointer-events-none absolute left-full top-1/2 z-20 ml-3 hidden -translate-y-1/2 rounded-xl bg-[#111111] px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-lg transition duration-200 group-hover:opacity-100 lg:block">
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
                                  "group/item flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition duration-200",
                                  "sidebar-child-link",
                                  isItemActive
                                    ? "sidebar-child-link-active bg-[#111111] text-white shadow-sm"
                                    : "text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111111]",
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
