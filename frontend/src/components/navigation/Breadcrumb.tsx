import { useLocation } from "react-router-dom";

import { routeLabelMap } from "../../utils/navigation";

export function Breadcrumb() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);
  const isSiteDashboardRoute =
    segments.length === 3 &&
    segments[0] === "sites" &&
    segments[2] === "dashboard";
  const isSiteDashboardDetailRoute =
    segments.length === 5 &&
    segments[0] === "sites" &&
    segments[2] === "dashboard";
  const siteDetailLabelMap = new Map([
    ["materials", "Material Detail"],
    ["vendors", "Vendor Detail"],
    ["parties", "Party Detail"],
    ["labours", "Labour Detail"],
  ]);
  const activeSegment = segments.at(-1) ?? "dashboard";
  const activeLabel = isSiteDashboardRoute
    ? "Site Dashboard"
    : isSiteDashboardDetailRoute
      ? siteDetailLabelMap.get(segments[3]) ?? "Site Detail"
      : routeLabelMap.get(activeSegment) ?? activeSegment;

  return (
    <div className="group min-w-0">
      <div className="flex items-center gap-3">
        <div className="hidden h-10 w-0.5 rounded-full bg-[#FF6B4A]/80 sm:block" />
        <div className="min-w-0">
          <p className="app-topbar-eyebrow text-[0.62rem] font-semibold uppercase tracking-[0.34em] text-[#6B7280]">
            ERP Workspace
          </p>
          <h1
            className="app-topbar-title mt-1 truncate text-2xl font-bold tracking-tight text-[#111111]"
            title={activeLabel}
          >
            {activeLabel}
          </h1>
        </div>
      </div>
    </div>
  );
}
