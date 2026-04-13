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
    <article className="overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(17,24,39,0.06)]">
      <div className="h-1 bg-gradient-to-r from-[#FF6B4A] via-[#FF8F75] to-[#FFD1C5]" />
      <div className="p-5 sm:p-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-[#111111]">{title}</h2>
        <p className="text-sm leading-6 text-[#6B7280]">{description}</p>
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
