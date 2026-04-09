import { useMemo, useState } from "react";

import { ChartCard } from "../../components/charts/ChartCard";
import { LabourLedgerChart } from "../../components/charts/DashboardCharts";
import { useToast } from "../../components/feedback/useToast";
import { LabourFilter } from "../../components/forms/LabourFilter";
import { PageHeader } from "../../components/layout/PageHeader";
import { DataTable } from "../../components/common/DataTable";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { useLabourReport } from "../../hooks/useLabourReport";
import { useReferenceData } from "../../hooks/useReferenceData";
import { labourReportsService } from "../../services/labourService";
import { reportsService } from "../../services/reportsService";
import type { ReportFilters, ReportModuleKey } from "../../types/erp.types";
import type { TableColumn } from "../../types/ui.types";
import { getErrorMessage } from "../../utils/apiError";
import { formatCurrency, formatDate } from "../../utils/format";

const reportModuleOptions: Array<{ label: string; value: ReportModuleKey }> = [
  { label: "Dashboard", value: "dashboard" },
  { label: "Materials", value: "materials" },
  { label: "Vendors", value: "vendors" },
  { label: "Labour", value: "labour" },
  { label: "Receivables", value: "receivables" },
];

function buildColumns(
  rows: Record<string, unknown>[],
): TableColumn<Record<string, unknown>>[] {
  const firstRow = rows[0];

  if (!firstRow) {
    return [];
  }

  return Object.keys(firstRow).map((key) => ({
    key,
    header: key.replaceAll("_", " "),
    accessor: (row) => String(row[key] ?? "-"),
    sortValue: (row) => {
      const value = row[key];
      return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
        ? value
        : String(value ?? "");
    },
  }));
}

export function ReportsPage() {
  const { showError } = useToast();
  const references = useReferenceData();
  const labourReportState = useLabourReport();
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: "",
    dateTo: "",
    labourId: undefined,
    labourQuery: "",
    module: "materials",
  });
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [tablePage, setTablePage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [error, setError] = useState("");

  async function handlePreview() {
    if (filters.module === "labour" && filters.labourId) {
      await labourReportState.loadLabourReport({
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        labourId: filters.labourId,
        labourRecords: references.labour,
      });
      setRows([]);
      setError("");
      setTablePage(1);
      return;
    }

    setIsLoading(true);

    try {
      setError("");
      const response = await reportsService.getPreview(filters);

      if (Array.isArray(response)) {
        setRows(response as Record<string, unknown>[]);
      } else {
        setRows(
          Object.entries(response).map(([key, value]) => ({
            metric: key,
            value: typeof value === "object" ? JSON.stringify(value) : String(value),
          })),
        );
      }
      setTablePage(1);
    } catch (previewError) {
      const message = getErrorMessage(previewError);
      setError(message);
      setRows([]);
      showError("Unable to load report preview", message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleExport(format: "excel" | "pdf") {
    try {
      if (filters.module === "labour" && filters.labourId) {
        await labourReportsService.exportLedger(filters.labourId, format);
        return;
      }

      if (format === "excel") {
        await reportsService.exportExcel(filters.module);
        return;
      }

      await reportsService.exportPdf(filters.module);
    } catch (exportError) {
      showError("Unable to export report", getErrorMessage(exportError));
    }
  }

  const labourRows = useMemo(
    () =>
      labourReportState.report?.ledger.payments.map((entry) => ({
        balance: formatCurrency(entry.balance),
        credit: formatCurrency(entry.credit),
        date: formatDate(entry.date),
        debit: formatCurrency(entry.debit),
        entry_type: entry.entry_type,
        site: entry.site,
      })) ?? [],
    [labourReportState.report],
  );

  const labourChartData = useMemo(
    () =>
      labourReportState.report?.ledger.payments.map((entry) => ({
        balance: entry.balance,
        credit: entry.credit,
        date: formatDate(entry.date),
        debit: entry.debit,
      })) ?? [],
    [labourReportState.report],
  );

  const activeRows = filters.module === "labour" && filters.labourId ? labourRows : rows;
  const columns = buildColumns(activeRows);

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button onClick={() => void handleExport("excel")} type="button" variant="secondary">
              Export Excel
            </Button>
            <Button onClick={() => void handleExport("pdf")} type="button">
              Export PDF
            </Button>
          </>
        }
        description="Preview backend-supported reports, with a dedicated labour ledger view for worker-specific analysis."
        title="Reports"
      />

      <ErrorMessage message={error || labourReportState.error} />

      <section className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/75 lg:grid-cols-4">
        <Select
          label="Module"
          options={reportModuleOptions}
          value={filters.module}
          onChange={(event) =>
            setFilters((currentValue) => ({
              ...currentValue,
              labourId: undefined,
              module: event.target.value as ReportModuleKey,
            }))
          }
        />
        <Input
          label="Date From"
          type="date"
          value={filters.dateFrom}
          onChange={(event) =>
            setFilters((currentValue) => ({
              ...currentValue,
              dateFrom: event.target.value,
            }))
          }
        />
        <Input
          label="Date To"
          type="date"
          value={filters.dateTo}
          onChange={(event) =>
            setFilters((currentValue) => ({
              ...currentValue,
              dateTo: event.target.value,
            }))
          }
        />
        <div className="flex items-end">
          <Button
            className="w-full"
            isLoading={isLoading}
            onClick={() => void handlePreview()}
            type="button"
          >
            Preview Report
          </Button>
        </div>
      </section>

      {filters.module === "labour" ? (
        <>
          <LabourFilter
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            isLoading={labourReportState.isLoading || references.isLoading}
            labourId={filters.labourId}
            labourQuery={filters.labourQuery ?? ""}
            labourRecords={references.labour}
            onDateFromChange={(value) =>
              setFilters((currentValue) => ({ ...currentValue, dateFrom: value }))
            }
            onDateToChange={(value) =>
              setFilters((currentValue) => ({ ...currentValue, dateTo: value }))
            }
            onLabourIdChange={(value) =>
              setFilters((currentValue) => ({ ...currentValue, labourId: value }))
            }
            onLabourQueryChange={(value) =>
              setFilters((currentValue) => ({ ...currentValue, labourQuery: value }))
            }
            onSubmit={() => {
              void handlePreview();
            }}
          />

          {filters.labourId && labourReportState.report ? (
            <>
              <section className="grid gap-4 md:grid-cols-3">
                <article className="rounded-[2rem] border border-slate-200 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/75">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Labour</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-slate-50">
                    {labourReportState.report.summary.labourName}
                  </p>
                </article>
                <article className="rounded-[2rem] border border-slate-200 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/75">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Total Wage</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-slate-50">
                    {formatCurrency(labourReportState.report.summary.totalAmount)}
                  </p>
                </article>
                <article className="rounded-[2rem] border border-slate-200 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/75">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Pending Amount</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-slate-50">
                    {formatCurrency(labourReportState.report.summary.pendingAmount)}
                  </p>
                </article>
              </section>

              <ChartCard
                description="Wage debit and payment credit movement for the selected labour record."
                isEmpty={labourChartData.length === 0}
                isLoading={labourReportState.isLoading}
                title="Labour Payment Trend"
              >
                <LabourLedgerChart data={labourChartData} />
              </ChartCard>
            </>
          ) : null}
        </>
      ) : null}

      <DataTable
        clientPagination
        columns={columns}
        data={activeRows}
        emptyDescription={
          filters.module === "labour"
            ? "Select a labour record and fetch the report, or use the general preview for summary wage data."
            : "Choose a module and click preview to load report data."
        }
        emptyTitle="No Data Found"
        isLoading={isLoading || labourReportState.isLoading}
        keyExtractor={(row, index) => String(row.metric ?? row.id ?? index)}
        page={tablePage}
        searchPlaceholder="Search preview rows"
        searchValue={searchValue}
        title={filters.module === "labour" && filters.labourId ? "Labour Report" : "Report Preview"}
        totalCount={activeRows.length}
        onPageChange={setTablePage}
        onSearchChange={setSearchValue}
      />
    </div>
  );
}
