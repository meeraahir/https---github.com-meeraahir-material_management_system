import { useEffect, useState } from "react";

import { PageHeader } from "../../components/layout/PageHeader";
import { StatCard } from "../../components/layout/StatCard";
import { Loader } from "../../components/ui/Loader";
import { dashboardService } from "../../services/dashboardService";
import type { DashboardStats } from "../../types/erp.types";

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setIsLoading(true);
        const response = await dashboardService.getStats();
        setStats(response);
      } finally {
        setIsLoading(false);
      }
    }

    void loadDashboard();
  }, []);

  if (isLoading) {
    return <Loader label="Loading dashboard..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description="High-level ERP overview across sites, stock, vendors, labour, and receivables."
        title="Dashboard"
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total Sites" value={stats?.total_sites ?? 0} />
        <StatCard label="Total Materials" value={stats?.total_materials ?? 0} />
        <StatCard label="Total Vendors" value={stats?.total_vendors ?? 0} />
        <StatCard label="Total Labour" value={stats?.total_labour ?? 0} />
        <StatCard
          label="Pending Payments"
          value={stats?.pending_vendor_amounts ?? 0}
        />
        <StatCard label="Receivables" value={stats?.pending_receivables ?? 0} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
            Recent Sites
          </h2>
          <div className="mt-4 space-y-3">
            {stats?.recent_sites.map((site) => (
              <div
                className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800"
                key={site.id}
              >
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {site.name}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {site.location}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
            Recent Materials
          </h2>
          <div className="mt-4 space-y-3">
            {stats?.recent_materials.map((material) => (
              <div
                className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800"
                key={material.id}
              >
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {material.name}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Unit: {material.unit}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
            Recent Vendors
          </h2>
          <div className="mt-4 space-y-3">
            {stats?.recent_vendors.map((vendor) => (
              <div
                className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800"
                key={vendor.id}
              >
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {vendor.name}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {vendor.phone}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
