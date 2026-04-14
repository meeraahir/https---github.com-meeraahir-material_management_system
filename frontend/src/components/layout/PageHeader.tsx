import type { ReactNode } from "react";

interface PageHeaderProps {
  actions?: ReactNode;
  description: string;
  search?: ReactNode;
  title?: string;
}

export function PageHeader({
  actions,
  description,
  search,
  title,
}: PageHeaderProps) {
  const hasHeadingContent = Boolean(title || description);

  return (
    <div className="erp-shell-panel rounded-3xl border bg-white p-5 sm:p-6">
      {hasHeadingContent ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              {title ? (
                <h1 className="text-2xl font-semibold tracking-tight text-[#111111] sm:text-[1.9rem]">
                  {title}
                </h1>
              ) : null}
              {description ? (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6B7280]">
                  {description}
                </p>
              ) : null}
            </div>
            {actions ? (
              <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                {actions}
              </div>
            ) : null}
          </div>
          {search ? <div className="max-w-xl">{search}</div> : null}
        </div>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {search ? <div className="w-full max-w-xl flex-1">{search}</div> : <div className="flex-1" />}
          {actions ? (
            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              {actions}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
