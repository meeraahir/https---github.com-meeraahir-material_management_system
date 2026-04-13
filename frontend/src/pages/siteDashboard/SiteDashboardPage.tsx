import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { useToast } from "../../components/feedback/useToast";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatCard } from "../../components/layout/StatCard";
import { DataTable } from "../../components/table/DataTable";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { siteDashboardService } from "../../services/sitesService";
import type {
  SiteDashboardData,
  SiteDashboardFinanceSummary,
  SiteDashboardLabourSummary,
  SiteDashboardMaterialSummary,
  SiteDashboardVendorSummary,
} from "../../types/erp.types";
import { getErrorMessage } from "../../utils/apiError";
import { formatCurrency } from "../../utils/format";

export function SiteDashboardPage() {
  const { siteId } = useParams();
  const { showError } = useToast();
  const parsedSiteId = Number(siteId);
  const [data, setData] = useState<SiteDashboardData | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [error, setError] = useState("");
  const [isExporting, setIsExporting] = useState<"" | "excel" | "pdf">("");
  const [isLoading, setIsLoading] = useState(true);
  const [financePage, setFinancePage] = useState(1);
  const [labourPage, setLabourPage] = useState(1);
  const [materialPage, setMaterialPage] = useState(1);
  const [vendorPage, setVendorPage] = useState(1);

  useEffect(() => {
    async function loadDashboard() {
      if (!parsedSiteId) {
        setError("Invalid site selected.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError("");
        const response = await siteDashboardService.getDashboard(parsedSiteId, {
          dateFrom,
          dateTo,
        });
        setData(response);
      } catch (loadError) {
        const message = getErrorMessage(loadError);
        setError(message);
        showError("Unable to load site dashboard", message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadDashboard();
  }, [dateFrom, dateTo, parsedSiteId, showError]);

  const totals = useMemo(() => {
    if (!data) {
      return {
        financePending: 0,
        labourPending: 0,
        materialCost: 0,
        vendorPending: 0,
      };
    }

    return {
      financePending: data.finance_summary.reduce(
        (total, row) => total + row.pending_amount,
        0,
      ),
      labourPending: data.labour_summary.reduce(
        (total, row) => total + row.pending_amount,
        0,
      ),
      materialCost: data.material_summary.reduce(
        (total, row) => total + row.total_cost,
        0,
      ),
      vendorPending: data.vendor_summary.reduce(
        (total, row) => total + row.pending_amount,
        0,
      ),
    };
  }, [data]);

  const site = data?.site ?? {
    description: "",
    id: parsedSiteId || 0,
    location: "-",
    name: "Selected Site",
  };
  const materialSummary = data?.material_summary ?? [];
  const vendorSummary = data?.vendor_summary ?? [];
  const labourSummary = data?.labour_summary ?? [];
  const financeSummary = data?.finance_summary ?? [];

  async function handleExport(format: "excel" | "pdf") {
    if (!parsedSiteId) {
      return;
    }

    try {
      setIsExporting(format);
      await siteDashboardService.exportDashboard(parsedSiteId, format, {
        dateFrom,
        dateTo,
      });
    } catch (exportError) {
      showError("Unable to export site dashboard", getErrorMessage(exportError));
    } finally {
      setIsExporting("");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button
              isLoading={isExporting === "excel"}
              onClick={() => void handleExport("excel")}
              type="button"
              variant="secondary"
            >
              Export Excel
            </Button>
            <Button
              isLoading={isExporting === "pdf"}
              onClick={() => void handleExport("pdf")}
              type="button"
            >
              Export PDF
            </Button>
          </>
        }
        description="Site-wise material, vendor, labour, and finance snapshot."
        search={
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Date From"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
            <Input
              label="Date To"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </div>
        }
        title="Site Dashboard"
      />

      <ErrorMessage message={error} />

      {data ? (
        <>
          <section className="rounded-[2rem] border border-blue-100 bg-white/95 p-5 shadow-md shadow-blue-950/5 dark:border-blue-100 dark:bg-white/95">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">
                  Site Overview
                </p>
                <h2 className="mt-2 text-3xl font-black text-slate-950">
                  {site.name}
                </h2>
                <p className="mt-2 text-sm font-medium text-slate-600">
                  {site.location}
                </p>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
                  {site.description || "No site description provided."}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                  <StatCard
                    label="Material Cost"
                    value={formatCurrency(totals.materialCost)}
                  />
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                  <StatCard
                    label="Vendor Pending"
                    value={formatCurrency(totals.vendorPending)}
                  />
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <StatCard
                    label="Labour Pending"
                    value={formatCurrency(totals.labourPending)}
                  />
                </div>
                <div className="rounded-2xl border border-cyan-200 bg-cyan-50/70 p-4">
                  <StatCard
                    label="Finance Pending"
                    value={formatCurrency(totals.financePending)}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <DataTable<SiteDashboardMaterialSummary>
              clientPagination
              columns={[
                {
                  key: "material",
                  header: "Material",
                  accessor: (row) => row.material__name,
                  sortValue: (row) => row.material__name,
                },
                {
                  key: "received",
                  header: "Received",
                  accessor: (row) => row.total_received,
                  sortValue: (row) => row.total_received,
                },
                {
                  key: "used",
                  header: "Used",
                  accessor: (row) => row.total_used,
                  sortValue: (row) => row.total_used,
                },
                {
                  key: "remaining",
                  header: "Remaining",
                  accessor: (row) => row.remaining_stock,
                  sortValue: (row) => row.remaining_stock,
                },
                {
                  key: "cost",
                  header: "Total Cost",
                  accessor: (row) => row.total_cost,
                  sortValue: (row) => row.total_cost,
                },
              ]}
              data={materialSummary}
              emptyDescription="No material summary is available for this site."
              emptyTitle="No Materials"
              isLoading={isLoading}
              keyExtractor={(row) => row.material__id}
              page={materialPage}
              searchValue=""
              totalCount={materialSummary.length}
              onPageChange={setMaterialPage}
              onSearchChange={() => undefined}
            />

            <DataTable<SiteDashboardVendorSummary>
              clientPagination
              columns={[
                {
                  key: "vendor",
                  header: "Vendor",
                  accessor: (row) => row.vendor_name,
                  sortValue: (row) => row.vendor_name,
                },
                {
                  key: "total",
                  header: "Total Amount",
                  accessor: (row) => row.total_amount,
                  sortValue: (row) => row.total_amount,
                },
                {
                  key: "paid",
                  header: "Paid Amount",
                  accessor: (row) => row.paid_amount,
                  sortValue: (row) => row.paid_amount,
                },
                {
                  key: "pending",
                  header: "Pending Amount",
                  accessor: (row) => row.pending_amount,
                  sortValue: (row) => row.pending_amount,
                },
              ]}
              data={vendorSummary}
              emptyDescription="No vendor purchase data is available for this site."
              emptyTitle="No Vendors"
              isLoading={isLoading}
              keyExtractor={(row) => row.vendor_id}
              page={vendorPage}
              searchValue=""
              totalCount={vendorSummary.length}
              onPageChange={setVendorPage}
              onSearchChange={() => undefined}
            />

            <DataTable<SiteDashboardLabourSummary>
              clientPagination
              columns={[
                {
                  key: "labour",
                  header: "Labour",
                  accessor: (row) => row.labour_name,
                  sortValue: (row) => row.labour_name,
                },
                {
                  key: "present",
                  header: "Present",
                  accessor: (row) => row.present_count,
                  sortValue: (row) => row.present_count,
                },
                {
                  key: "absent",
                  header: "Absent",
                  accessor: (row) => row.absent_count,
                  sortValue: (row) => row.absent_count,
                },
                {
                  key: "wage",
                  header: "Total Wage",
                  accessor: (row) => row.total_wage,
                  sortValue: (row) => row.total_wage,
                },
                {
                  key: "pending",
                  header: "Pending Amount",
                  accessor: (row) => row.pending_amount,
                  sortValue: (row) => row.pending_amount,
                },
              ]}
              data={labourSummary}
              emptyDescription="No labour summary is available for this site."
              emptyTitle="No Labour"
              isLoading={isLoading}
              keyExtractor={(row) => row.labour_id}
              page={labourPage}
              searchValue=""
              totalCount={labourSummary.length}
              onPageChange={setLabourPage}
              onSearchChange={() => undefined}
            />

            <DataTable<SiteDashboardFinanceSummary>
              clientPagination
              columns={[
                {
                  key: "party",
                  header: "Party",
                  accessor: (row) => row.party__name,
                  sortValue: (row) => row.party__name,
                },
                {
                  key: "total",
                  header: "Total Amount",
                  accessor: (row) => row.total_amount,
                  sortValue: (row) => row.total_amount,
                },
                {
                  key: "received",
                  header: "Received Amount",
                  accessor: (row) => row.received_amount,
                  sortValue: (row) => row.received_amount,
                },
                {
                  key: "pending",
                  header: "Pending Amount",
                  accessor: (row) => row.pending_amount,
                  sortValue: (row) => row.pending_amount,
                },
              ]}
              data={financeSummary}
              emptyDescription="No finance summary is available for this site."
              emptyTitle="No Finance Data"
              isLoading={isLoading}
              keyExtractor={(row) => row.party__id}
              page={financePage}
              searchValue=""
              totalCount={financeSummary.length}
              onPageChange={setFinancePage}
              onSearchChange={() => undefined}
            />
          </section>
        </>
      ) : (
        <section className="rounded-[2rem] border border-blue-100 bg-white/95 p-6 text-sm font-medium text-slate-600 shadow-md shadow-blue-950/5 dark:border-blue-100 dark:bg-white/95">
          {isLoading ? "Loading site dashboard..." : "Select a valid site to load dashboard data."}
        </section>
      )}
    </div>
  );
}
