import type { ReactNode } from "react";

interface PageHeaderProps {
  actions?: ReactNode;
  description: string;
  search?: ReactNode;
  title?: string;
}

export function PageHeader({
  actions,
  search,
}: PageHeaderProps) {
  const hasVisibleContent = Boolean(search || actions);

  if (!hasVisibleContent) {
    return null;
  }

  return (
    <div className="erp-shell-panel rounded-3xl border bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {search ? <div className="w-full max-w-xl flex-1">{search}</div> : <div className="flex-1" />}
        {actions ? (
          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
