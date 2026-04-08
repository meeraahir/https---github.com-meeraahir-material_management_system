import type { ReactNode } from "react";

interface EmptyStateProps {
  action?: ReactNode;
  description: string;
  title: string;
}

export function EmptyState({ action, description, title }: EmptyStateProps) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/60">
      <div className="mx-auto max-w-md space-y-3">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h3>
        <p className="text-sm leading-7 text-slate-500 dark:text-slate-400">
          {description}
        </p>
        {action ? <div className="pt-3">{action}</div> : null}
      </div>
    </div>
  );
}
