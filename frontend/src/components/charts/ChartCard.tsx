import type { ReactNode } from "react";

import { EmptyState } from "../ui/EmptyState";
import { Skeleton } from "../common/Skeleton";

interface ChartCardProps {
  children?: ReactNode;
  description: string;
  emptyDescription?: string;
  isEmpty?: boolean;
  isLoading?: boolean;
  title: string;
}

export function ChartCard({
  children,
  description,
  emptyDescription = "No data available for this chart right now.",
  isEmpty = false,
  isLoading = false,
  title,
}: ChartCardProps) {
  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white/95 p-5 shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-950/75 dark:shadow-none">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">{title}</h2>
        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
      </div>

      <div className="mt-5 h-[320px]">
        {isLoading ? (
          <div className="grid h-full gap-3">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-full w-full" />
          </div>
        ) : isEmpty ? (
          <div className="flex h-full items-center">
            <EmptyState
              description={emptyDescription}
              title="No Data Found"
            />
          </div>
        ) : (
          children
        )}
      </div>
    </article>
  );
}
