import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { icons } from "../../assets/icons";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatCard } from "../../components/layout/StatCard";
import { Button } from "../../components/ui/Button";

export function SiteDashboardDetailHeader({
  description,
  siteId,
  siteName,
  title,
}: {
  description: string;
  siteId: number;
  siteName: string;
  title: string;
}) {
  return (
    <PageHeader
      actions={
        <Link to={`/sites/${siteId}/dashboard`}>
          <Button type="button" variant="secondary">
            {icons.chevronLeft({ className: "h-4 w-4" })}
            Back to Site Dashboard
          </Button>
        </Link>
      }
      description={`${description} Site: ${siteName}.`}
      title={title}
    />
  );
}

export function DetailMetricGrid({ children }: { children: ReactNode }) {
  return <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{children}</section>;
}

export function DetailMetricCard({
  accentClassName,
  label,
  value,
}: {
  accentClassName: string;
  label: string;
  value: number | string;
}) {
  return (
    <div className={`rounded-[1.75rem] border p-4 shadow-sm ${accentClassName}`}>
      <StatCard className="rounded-none" label={label} value={value} />
    </div>
  );
}

export function DetailSection({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <section className="rounded-[2rem] border border-blue-100 bg-white/95 p-5 shadow-md shadow-blue-950/5">
      <div className="mb-4">
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function DetailInfoGrid({
  items,
}: {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <div
          className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3"
          key={item.label}
        >
          <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {item.label}
          </dt>
          <dd className="mt-2 text-sm font-semibold text-slate-900">
            {item.value || "-"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function DetailEmptyState({
  message,
}: {
  message: string;
}) {
  return (
    <section className="rounded-[2rem] border border-blue-100 bg-white/95 p-6 text-sm font-medium text-slate-600 shadow-md shadow-blue-950/5">
      {message}
    </section>
  );
}
