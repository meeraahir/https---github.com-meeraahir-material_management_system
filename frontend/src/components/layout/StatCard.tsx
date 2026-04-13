import clsx from "clsx";

interface StatCardProps {
  className?: string;
  label: string;
  value: number | string;
}

export function StatCard({ className, label, value }: StatCardProps) {
  return (
    <article className={clsx("rounded-2xl", className)}>
      <p className="text-[0.83rem] font-medium text-[#6B7280]">{label}</p>
      <p className="mt-2 text-[1.7rem] font-semibold leading-none text-[#111111]">
        {value}
      </p>
    </article>
  );
}
