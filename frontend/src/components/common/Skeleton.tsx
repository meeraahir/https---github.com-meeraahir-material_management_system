import clsx from "clsx";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={clsx("animate-pulse rounded-2xl bg-slate-200/80 dark:bg-slate-800/80", className)}
    />
  );
}
