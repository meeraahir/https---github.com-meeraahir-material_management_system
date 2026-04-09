import clsx from "clsx";

interface StatCardProps {
  className?: string;
  label: string;
  value: number | string;
}

export function StatCard({ className, label, value }: StatCardProps) {
  return (
    <article className={clsx("rounded-3xl", className)}>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-slate-50">
        {value}
      </p>
    </article>
  );
}
