interface StatCardProps {
  label: string;
  value: number | string;
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-slate-50">
        {value}
      </p>
    </article>
  );
}
