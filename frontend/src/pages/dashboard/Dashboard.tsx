import { useCallback, useEffect, useMemo, useState } from "react";

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
import { EntityFormModal } from "../../components/forms/EntityFormModal";
import { StatCard } from "../../components/layout/StatCard";
import { dashboardService } from "../../services/dashboardService";
import { sitesService } from "../../services/sitesService";
import type {
  DashboardStats,
  MaterialWiseReportRow,
  SiteFormValues,
  SiteWiseMaterialReportRow,
} from "../../types/erp.types";
import { getErrorMessage } from "../../utils/apiError";
import { formatCurrency, formatNumber } from "../../utils/format";
import { Button } from "../../components/ui/Button";
import {
  siteDefaultValues,
  siteFormFields,
  siteSchema,
} from "../sites/siteFormConfig";
import { DashboardLabourAttendanceModal } from "./DashboardLabourAttendanceModal";

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
  const { showError, showSuccess } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [materialReport, setMaterialReport] = useState<MaterialWiseReportRow[]>([]);
  const [siteReport, setSiteReport] = useState<SiteWiseMaterialReportRow[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);

  const loadDashboard = useCallback(async () => {
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
  }, [showError]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

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

  async function handleSiteCreate(values: SiteFormValues) {
    await sitesService.create(values);
    showSuccess("Site created", "New site has been added successfully.");
    setIsSiteModalOpen(false);
    await loadDashboard();
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-end gap-3">
        <Button onClick={() => setIsSiteModalOpen(true)} type="button">
          Add Site
        </Button>
        <Button
          onClick={() => setIsAttendanceModalOpen(true)}
          type="button"
          variant="secondary"
        >
          Labour Attendance
        </Button>
      </section>

      <ErrorMessage message={error} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div
                className="rounded-[2rem] border border-blue-100 bg-white/95 p-4 shadow-sm dark:border-blue-100 dark:bg-white/95"
                key={index}
              >
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-3 h-8 w-2/3" />
                <Skeleton className="mt-2 h-4 w-1/2" />
              </div>
            ))
          : summaryCards.map((card) => (
              <div
                className={`rounded-[2rem] border border-blue-100 bg-gradient-to-br ${card.accent} p-1 shadow-md shadow-blue-950/5 dark:border-blue-100`}
                key={card.label}
              >
                <div className="rounded-[1.7rem] bg-white/95 px-4 py-3.5 dark:bg-white/95">
                  <StatCard label={card.label} value={card.value} />
                  <p className="mt-2 text-[0.82rem] font-medium leading-5 text-slate-600 dark:text-slate-600">
                    {card.helper}
                  </p>
                </div>
              </div>
            ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <ChartCard
          description="Total quantity used by material based on the material-wise report."
          emptyDescription="No material usage has been recorded yet. Add material receipts with used quantity to populate this chart."
          isEmpty={materialUsageChartData.length === 0}
          isLoading={isLoading}
          title="Material Usage"
        >
          <MaterialUsageBarChart data={materialUsageChartData} />
        </ChartCard>

        <ChartCard
          description="Material cost movement across tracked materials."
          emptyDescription="No material cost data is available yet. Add material receipts with cost details to see cost movement."
          isEmpty={costTrackingChartData.length === 0}
          isLoading={isLoading}
          title="Cost Tracking"
        >
          <CostTrackingLineChart data={costTrackingChartData} />
        </ChartCard>

        <ChartCard
          description="Site-wise share of material stock and allocation."
          emptyDescription="No site stock distribution is available yet. Add receipts against sites to build this chart."
          isEmpty={siteDistributionChartData.length === 0}
          isLoading={isLoading}
          title="Site-wise Material Distribution"
        >
          <SiteDistributionPieChart data={siteDistributionChartData} />
        </ChartCard>

        <ChartCard
          description="Overall used versus remaining stock position."
          emptyDescription="No stock movement is available yet. Add received and used quantities to compare stock."
          isEmpty={stockComparisonChartData.length === 0}
          isLoading={isLoading}
          title="Stock Overview"
        >
          <StockComparisonChart data={stockComparisonChartData} />
        </ChartCard>
      </section>

      <EntityFormModal<SiteFormValues>
        defaultValues={siteDefaultValues}
        description="Create a new site from the dashboard."
        fields={siteFormFields}
        onClose={() => {
          setIsSiteModalOpen(false);
        }}
        onSubmit={handleSiteCreate}
        open={isSiteModalOpen}
        schema={siteSchema}
        title="Create Site"
      />

      <DashboardLabourAttendanceModal
        onClose={() => {
          setIsAttendanceModalOpen(false);
        }}
        open={isAttendanceModalOpen}
      />
    </div>
  );
}
