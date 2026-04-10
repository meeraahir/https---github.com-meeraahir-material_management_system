import { useEffect, useMemo, useState } from "react";

import { ChartCard } from "../../components/charts/ChartCard";
import {
  CostTrackingLineChart,
  MaterialUsageBarChart,
  SiteDistributionPieChart,
  StockComparisonChart,
} from "../../components/charts/DashboardCharts";
import { useToast } from "../../components/feedback/useToast";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { Skeleton } from "../../components/common/Skeleton";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatCard } from "../../components/layout/StatCard";
import { dashboardService } from "../../services/dashboardService";
import type {
  DashboardStats,
  MaterialWiseReportRow,
  SiteWiseMaterialReportRow,
} from "../../types/erp.types";
import { getErrorMessage } from "../../utils/apiError";
import { formatCurrency, formatNumber } from "../../utils/format";

function getSiteLabel(row: SiteWiseMaterialReportRow) {
  return row.site_name || row.name || "Unknown Site";
}

function getSiteMetric(row: SiteWiseMaterialReportRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key as keyof SiteWiseMaterialReportRow];

    if (typeof value === "number") {
      return value;
    }
  }

  return 0;
}

export function DashboardPage() {
  const { showError } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [materialReport, setMaterialReport] = useState<MaterialWiseReportRow[]>([]);
  const [siteReport, setSiteReport] = useState<SiteWiseMaterialReportRow[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setIsLoading(true);
        setError("");

        const [statsResponse, materialUsageResponse, siteDistributionResponse] =
          await Promise.all([
            dashboardService.getStats(),
            dashboardService.getMaterialUsageReport(),
            dashboardService.getSiteDistributionReport(),
          ]);

        setStats(statsResponse);
        setMaterialReport(materialUsageResponse);
        setSiteReport(siteDistributionResponse);
      } catch (loadError) {
        const message = getErrorMessage(loadError);
        setError(message);
        showError("Unable to load dashboard", message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadDashboard();
  }, [showError]);

  const materialUsageChartData = useMemo(
    () =>
      materialReport
        .map((row) => ({
          material: row.material_name,
          used: row.total_quantity_used,
        }))
        .filter((row) => row.used > 0),
    [materialReport],
  );

  const costTrackingChartData = useMemo(
    () =>
      materialReport.map((row) => ({
        cost: row.total_cost,
        label: row.material_name,
      })),
    [materialReport],
  );

  const siteDistributionChartData = useMemo(
    () =>
      siteReport
        .map((row) => ({
          site: getSiteLabel(row),
          value: getSiteMetric(row, [
            "remaining_stock",
            "total_quantity_received",
            "total_quantity_used",
            "total_cost",
            "total_amount",
          ]),
        }))
        .filter((row) => row.value > 0),
    [siteReport],
  );

  const stockComparisonChartData = useMemo(() => {
    const used = materialReport.reduce(
      (total, row) => total + row.total_quantity_used,
      0,
    );
    const remaining = materialReport.reduce(
      (total, row) => total + row.remaining_stock,
      0,
    );

    return [
      { name: "Used", value: used },
      { name: "Remaining", value: remaining },
    ].filter((entry) => entry.value > 0);
  }, [materialReport]);

  const summaryCards = [
    {
      accent: "from-blue-600/20 to-cyan-500/5",
      helper: "Projects tracked across the ERP",
      label: "Total Sites",
      value: formatNumber(stats?.total_sites),
    },
    {
      accent: "from-teal-600/20 to-emerald-500/5",
      helper: "Active material masters",
      label: "Total Materials",
      value: formatNumber(stats?.total_materials),
    },
    {
      accent: "from-amber-500/25 to-orange-500/5",
      helper: "Outstanding client collections",
      label: "Pending Receivables",
      value: formatCurrency(stats?.pending_receivables),
    },
    {
      accent: "from-rose-500/20 to-pink-500/5",
      helper: "Vendor balances still due",
      label: "Pending Vendor Amounts",
      value: formatCurrency(stats?.pending_vendor_amounts),
    },
    {
      accent: "from-indigo-500/20 to-sky-500/5",
      helper: "Current workforce on record",
      label: "Total Labour",
      value: formatNumber(stats?.total_labour),
    },
    {
      accent: "from-slate-500/20 to-slate-400/5",
      helper: "Total stock volume available",
      label: "Material Stock",
      value: formatNumber(stats?.total_material_stock),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        description="A visual command center for material consumption, cost movement, stock position, and site distribution."
        title="Dashboard"
      />

      <ErrorMessage message={error} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div
                className="rounded-[2rem] border border-slate-200 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/75"
                key={index}
              >
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-4 h-10 w-2/3" />
                <Skeleton className="mt-3 h-4 w-1/2" />
              </div>
            ))
          : summaryCards.map((card) => (
              <div
                className={`rounded-[2rem] border border-slate-200 bg-gradient-to-br ${card.accent} p-1 shadow-sm dark:border-slate-800`}
                key={card.label}
              >
                <div className="rounded-[1.7rem] bg-white/95 p-5 dark:bg-slate-950/80">
                  <StatCard label={card.label} value={card.value} />
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    {card.helper}
                  </p>
                </div>
              </div>
            ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <ChartCard
          description="Total quantity used by material based on the material-wise report."
          isEmpty={materialUsageChartData.length === 0}
          isLoading={isLoading}
          title="Material Usage"
        >
          <MaterialUsageBarChart data={materialUsageChartData} />
        </ChartCard>

        <ChartCard
          description="Material cost movement across tracked materials."
          isEmpty={costTrackingChartData.length === 0}
          isLoading={isLoading}
          title="Cost Tracking"
        >
          <CostTrackingLineChart data={costTrackingChartData} />
        </ChartCard>

        <ChartCard
          description="Site-wise share of material stock and allocation."
          isEmpty={siteDistributionChartData.length === 0}
          isLoading={isLoading}
          title="Site-wise Material Distribution"
        >
          <SiteDistributionPieChart data={siteDistributionChartData} />
        </ChartCard>

        <ChartCard
          description="Overall used versus remaining stock position."
          isEmpty={stockComparisonChartData.length === 0}
          isLoading={isLoading}
          title="Stock Overview"
        >
          <StockComparisonChart data={stockComparisonChartData} />
        </ChartCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <article className="rounded-[2rem] border border-slate-200 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/75">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
            Recent Sites
          </h2>
          <div className="mt-4 space-y-3">
            {stats?.recent_sites?.length ? (
              stats.recent_sites.map((site) => (
                <div
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50"
                  key={site.id}
                >
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {site.name}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {site.location}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No recent sites available.
              </p>
            )}
          </div>
        </article>

        <article className="rounded-[2rem] border border-slate-200 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/75">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
            Recent Materials
          </h2>
          <div className="mt-4 space-y-3">
            {stats?.recent_materials?.length ? (
              stats.recent_materials.map((material) => (
                <div
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50"
                  key={material.id}
                >
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {material.name}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Unit: {material.unit}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No recent materials available.
              </p>
            )}
          </div>
        </article>

        <article className="rounded-[2rem] border border-slate-200 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/75">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
            Recent Vendors
          </h2>
          <div className="mt-4 space-y-3">
            {stats?.recent_vendors?.length ? (
              stats.recent_vendors.map((vendor) => (
                <div
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50"
                  key={vendor.id}
                >
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {vendor.name}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {vendor.phone}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No recent vendors available.
              </p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
