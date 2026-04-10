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
    <article className="overflow-hidden rounded-[2rem] border border-blue-100/90 bg-white/95 shadow-lg shadow-blue-950/5 dark:border-blue-100/90 dark:bg-white/95 dark:shadow-blue-950/5">
      <div className="h-1 bg-gradient-to-r from-blue-500/80 via-cyan-400/80 to-emerald-400/80" />
      <div className="p-5">
      <div className="space-y-1">
        <h2 className="text-xl font-black text-slate-950 dark:text-slate-950">{title}</h2>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-600">{description}</p>
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
      </div>
    </article>
  );
}
