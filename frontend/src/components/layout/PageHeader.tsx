import type { ReactNode } from "react";

interface PageHeaderProps {
  actions?: ReactNode;
  description: string;
  search?: ReactNode;
  title: string;
}

export function PageHeader({
  actions,
  description,
  search,
  title,
}: PageHeaderProps) {
  return (
    <div className="erp-shell-panel rounded-2xl border bg-gradient-to-r from-white via-blue-50/55 to-cyan-50/45 p-4 shadow-md dark:from-white dark:via-blue-50/55 dark:to-cyan-50/45">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-slate-950">
              {title}
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-600">
              {description}
            </p>
          </div>
          {actions ? (
            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              {actions}
            </div>
          ) : null}
        </div>
        {search ? <div className="max-w-xl">{search}</div> : null}
      </div>
    </div>
  );
}
