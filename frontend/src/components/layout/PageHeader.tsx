import type { ReactNode } from "react";

interface PageHeaderProps {
  actions?: ReactNode;
  description: string;
  search?: ReactNode;
  title: string;
}

export function PageHeader({ actions, description, search }: PageHeaderProps) {
  return (
    <div className="erp-shell-panel rounded-2xl border bg-gradient-to-r from-white via-blue-50/55 to-cyan-50/45 p-3.5 shadow-md dark:from-white dark:via-blue-50/55 dark:to-cyan-50/45">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          {search ? (
            <div className="max-w-xl">{search}</div>
          ) : description ? (
            <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-600">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
