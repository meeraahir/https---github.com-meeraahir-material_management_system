import type { ReactNode } from "react";

interface PageHeaderProps {
  actions?: ReactNode;
  description: string;
  title: string;
}

export function PageHeader({ actions, description, title }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">
          {title}
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
