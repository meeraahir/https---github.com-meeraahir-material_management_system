import { Link, useLocation } from "react-router-dom";

import { routeLabelMap } from "../../utils/navigation";

export function Breadcrumb() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
      <Link className="font-medium text-slate-600 dark:text-slate-300" to="/dashboard">
        Home
      </Link>
      {segments.map((segment, index) => {
        const path = `/${segments.slice(0, index + 1).join("/")}`;
        const label = routeLabelMap.get(segment) ?? segment;
        const isLast = index === segments.length - 1;

        return (
          <div className="flex items-center gap-2" key={path}>
            <span>/</span>
            {isLast ? (
              <span className="font-semibold capitalize text-slate-900 dark:text-slate-100">
                {label}
              </span>
            ) : (
              <Link className="capitalize" to={path}>
                {label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
