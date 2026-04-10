import type { ReactNode } from "react";

interface EmptyStateProps {
  action?: ReactNode;
  description: string;
  title: string;
}

export function EmptyState({ action, description, title }: EmptyStateProps) {
  return (
    <div className="rounded-3xl border border-dashed border-blue-200 bg-blue-50/70 px-6 py-12 text-center dark:border-blue-200 dark:bg-blue-50/70">
      <div className="mx-auto max-w-md space-y-3">
        <h3 className="text-xl font-black text-slate-900 dark:text-slate-900">
          {title}
        </h3>
        <p className="text-sm leading-7 text-slate-600 dark:text-slate-600">
          {description}
        </p>
        {action ? <div className="pt-3">{action}</div> : null}
      </div>
    </div>
  );
}
