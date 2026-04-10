import clsx from "clsx";

interface StatCardProps {
  className?: string;
  label: string;
  value: number | string;
}

export function StatCard({ className, label, value }: StatCardProps) {
  return (
    <article className={clsx("rounded-3xl", className)}>
      <p className="text-sm font-semibold text-slate-600 dark:text-slate-600">{label}</p>
      <p className="mt-3 text-3xl font-black text-slate-950 dark:text-slate-950">
        {value}
      </p>
    </article>
  );
}
