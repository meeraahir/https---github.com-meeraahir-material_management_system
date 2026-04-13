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
import { attendanceReportsService } from "../../services/attendanceService";
import { labourReportsService } from "../../services/labourService";
import { reportsService } from "../../services/reportsService";
import type { ReportFilters, ReportModuleKey } from "../../types/erp.types";
import type { TableColumn } from "../../types/ui.types";
import { getErrorMessage } from "../../utils/apiError";
import { downloadCsv } from "../../utils/download";
import { formatCurrency, formatDate, formatNumber } from "../../utils/format";

const reportModuleOptions: Array<{ label: string; value: ReportModuleKey }> = [
  { label: "Dashboard", value: "dashboard" },
  { label: "Materials", value: "materials" },
  { label: "Vendors", value: "vendors" },
  { label: "Labour", value: "labour" },
  { label: "Receivables", value: "receivables" },
];

const numericReportKeyPattern =
  /(amount|balance|cost|credit|debit|paid|pending|quantity|received|stock|total|used|wage)/i;

function formatReportValue(key: string, value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "number") {
    return value;
  }

  if (
    typeof value === "string" &&
    numericReportKeyPattern.test(key) &&
    value.trim() !== "" &&
    Number.isFinite(Number(value))
  ) {
    return formatNumber(Number(value));
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}

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
    accessor: (row) => formatReportValue(key, row[key]),
    sortValue: (row) => {
      const value = row[key];
      return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
        ? value
        : String(value ?? "");
    },
  }));
}

export function ReportsPage() {
  const { showError, showSuccess } = useToast();
  const references = useReferenceData();
  const labourReportState = useLabourReport();
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: "",
    dateTo: "",
    labourId: undefined,
    labourQuery: "",
    module: "materials",
    partyId: undefined,
    partyQuery: "",
    vendorId: undefined,
    vendorQuery: "",
  });
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [tablePage, setTablePage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isExportingLabour, setIsExportingLabour] = useState(false);
  const [error, setError] = useState("");

  const partyOptions = useMemo(
    () =>
      references.parties
        .map((party) => ({
          label: `${party.name} (#${party.id})`,
          value: party.id,
        })),
    [references.parties],
  );

  const vendorOptions = useMemo(
    () =>
      references.vendors
        .map((vendor) => ({
          label: `${vendor.name} (#${vendor.id})`,
          value: vendor.id,
        })),
    [references.vendors],
  );

  async function handleLabourCsvExport() {
    if (!filters.labourId || !labourReportState.report) {
      showError("No labour selected", "Choose a labour record before exporting.");
      return;
    }

    const selectedLabour = references.labour.find((labour) => labour.id === filters.labourId);

    if (!selectedLabour) {
      showError("Export failed", "The selected labour details could not be found.");
      return;
    }

    try {
      setIsExportingLabour(true);

      const attendanceRows = await attendanceReportsService.getLabourAttendance(
        filters.labourId,
        {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        },
      );

      const siteNameMap = new Map(references.sites.map((site) => [site.id, site.name]));
      const lines = [
        ["Labour Details"],
        ["Labour ID", String(selectedLabour.id)],
        ["Labour Name", selectedLabour.name],
        ["Phone", selectedLabour.phone],
        ["Per Day Wage", String(selectedLabour.per_day_wage)],
        ["Date From", filters.dateFrom || "-"],
        ["Date To", filters.dateTo || "-"],
        [],
        ["Summary"],
        ["Total Wage", String(labourReportState.report.summary.totalAmount)],
        ["Paid Amount", String(labourReportState.report.summary.paidAmount)],
        ["Pending Amount", String(labourReportState.report.summary.pendingAmount)],
        [],
        ["Attendance"],
        ["Date", "Site", "Present"],
        ...attendanceRows.map((row) => [
          row.date,
          siteNameMap.get(row.site) || String(row.site),
          row.present ? "Yes" : "No",
        ]),
        [],
        ["Work Data"],
        ["Date", "Type", "Site", "Debit", "Credit", "Balance"],
        ...labourReportState.report.ledger.payments.map((entry) => [
          entry.date,
          entry.entry_type,
          entry.site,
          String(entry.debit),
          String(entry.credit),
          String(entry.balance),
        ]),
      ];

      const csvContent = lines
        .map((line) =>
          line
            .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
            .join(","),
        )
        .join("\n");

      downloadCsv(csvContent, `labour-${filters.labourId}-report.csv`);
      showSuccess("Export complete", "The selected labour report was exported as CSV.");
    } catch (exportError) {
      showError("Unable to export labour report", getErrorMessage(exportError));
    } finally {
      setIsExportingLabour(false);
    }
  }

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

    if (filters.module === "receivables" && filters.partyId) {
      setIsLoading(true);

      try {
        setError("");
        const response = await reportsService.getPartyLedger(filters.partyId, {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        });
        setRows(response.transactions as unknown as Record<string, unknown>[]);
        setTablePage(1);
        labourReportState.reset();
      } catch (previewError) {
        const message = getErrorMessage(previewError);
        setError(message);
        setRows([]);
        showError("Unable to load receivable report", message);
      } finally {
        setIsLoading(false);
      }

      return;
    }

    if (filters.module === "vendors" && filters.vendorId) {
      setIsLoading(true);

      try {
        setError("");
        const response = await reportsService.getVendorLedger(filters.vendorId, {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        });
        setRows(response.transactions as unknown as Record<string, unknown>[]);
        setTablePage(1);
        labourReportState.reset();
      } catch (previewError) {
        const message = getErrorMessage(previewError);
        setError(message);
        setRows([]);
        showError("Unable to load vendor report", message);
      } finally {
        setIsLoading(false);
      }

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
      labourReportState.reset();
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
        await labourReportsService.exportLedger(filters.labourId, format, {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        });
        return;
      }

      if (filters.module === "receivables" && filters.partyId) {
        await reportsService.exportPartyLedger(filters.partyId, format, {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        });
        return;
      }

      if (filters.module === "vendors" && filters.vendorId) {
        await reportsService.exportVendorLedger(filters.vendorId, format, {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        });
        return;
      }

      if (format === "excel") {
        await reportsService.exportExcel(filters.module, {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        });
        return;
      }

      await reportsService.exportPdf(filters.module, {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      });
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

  function handleExportCsv() {
    if (activeRows.length === 0 || columns.length === 0) {
      showError("No data to export", "Preview a report before exporting CSV.");
      return;
    }

    const csvRows = [
      columns.map((column) => column.header),
      ...activeRows.map((row) =>
        columns.map((column) => String(column.accessor(row) ?? "")),
      ),
    ];
    const csvContent = csvRows
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");

    downloadCsv(csvContent, `${filters.module}-report.csv`);
    showSuccess("Export complete", "The report preview was exported as CSV.");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button onClick={() => void handleExport("excel")} type="button" variant="secondary">
              Export Excel
            </Button>
            <Button onClick={() => handleExportCsv()} type="button" variant="secondary">
              Export CSV
            </Button>
            <Button onClick={() => void handleExport("pdf")} type="button">
              Export PDF
            </Button>
          </>
        }
        description="Preview backend-supported reports, with a dedicated labour ledger view for worker-specific analysis."
        title="Reports"
      />

      <ErrorMessage message={error || labourReportState.error || references.error} />

      <section
        className={
          filters.module === "vendors" || filters.module === "receivables"
            ? "grid gap-4 rounded-2xl border border-blue-100/90 bg-white/94 p-4 shadow-md shadow-blue-950/5 dark:border-blue-100/90 dark:bg-white/94 md:grid-cols-2 xl:grid-cols-6"
            : filters.module === "labour"
              ? "grid gap-4 rounded-2xl border border-blue-100/90 bg-white/94 p-4 shadow-md shadow-blue-950/5 dark:border-blue-100/90 dark:bg-white/94 md:grid-cols-1"
            : "grid gap-4 rounded-2xl border border-blue-100/90 bg-white/94 p-4 shadow-md shadow-blue-950/5 dark:border-blue-100/90 dark:bg-white/94 md:grid-cols-2 lg:grid-cols-4"
        }
      >
        <Select
          label="Module"
          options={reportModuleOptions}
          value={filters.module}
          onChange={(event) =>
            setFilters((currentValue) => ({
              ...currentValue,
                labourId: undefined,
                labourQuery: "",
                module: event.target.value as ReportModuleKey,
                partyId: undefined,
                partyQuery: "",
                vendorId: undefined,
                vendorQuery: "",
              }))
          }
        />
        {filters.module === "receivables" ? (
          <>
            <Select
              description="Select a party to preview and export that receivable ledger."
              label="Party"
              options={partyOptions}
              value={filters.partyId ?? ""}
              onChange={(event) =>
                setFilters((currentValue) => ({
                  ...currentValue,
                  partyId: event.target.value ? Number(event.target.value) : undefined,
                }))
              }
            />
          </>
        ) : null}
        {filters.module === "vendors" ? (
          <>
            <Select
              description="Select a vendor to preview and export that vendor ledger."
              label="Vendor"
              options={vendorOptions}
              value={filters.vendorId ?? ""}
              onChange={(event) =>
                setFilters((currentValue) => ({
                  ...currentValue,
                  vendorId: event.target.value ? Number(event.target.value) : undefined,
                }))
              }
            />
          </>
        ) : null}
        {filters.module !== "labour" ? (
          <>
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
          </>
        ) : null}
      </section>

      {filters.module === "labour" ? (
        <>
          <LabourFilter
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            isLoading={labourReportState.isLoading || references.isLoading}
            labourId={filters.labourId}
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
            onSubmit={() => {
              void handlePreview();
            }}
          />

          {filters.labourId && labourReportState.report ? (
            <>
              <section className="grid gap-4 md:grid-cols-3">
                <article className="rounded-[2rem] border border-blue-100 bg-white/95 p-5 shadow-sm dark:border-blue-100 dark:bg-white/95">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-600">Labour</p>
                  <p className="mt-3 text-2xl font-black text-slate-950 dark:text-slate-950">
                    {labourReportState.report.summary.labourName}
                  </p>
                </article>
                <article className="rounded-[2rem] border border-blue-100 bg-white/95 p-5 shadow-sm dark:border-blue-100 dark:bg-white/95">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-600">Total Wage</p>
                  <p className="mt-3 text-2xl font-black text-slate-950 dark:text-slate-950">
                    {formatCurrency(labourReportState.report.summary.totalAmount)}
                  </p>
                </article>
                <article className="rounded-[2rem] border border-blue-100 bg-white/95 p-5 shadow-sm dark:border-blue-100 dark:bg-white/95">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-600">Pending Amount</p>
                  <p className="mt-3 text-2xl font-black text-slate-950 dark:text-slate-950">
                    {formatCurrency(labourReportState.report.summary.pendingAmount)}
                  </p>
                </article>
              </section>

              <div className="flex justify-end">
                <Button
                  isLoading={isExportingLabour}
                  onClick={() => void handleLabourCsvExport()}
                  type="button"
                  variant="secondary"
                >
                  Export Selected Labour CSV
                </Button>
              </div>

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
        searchPlaceholder=""
        searchValue=""
        title={filters.module === "labour" && filters.labourId ? "Labour Report" : "Report Preview"}
        totalCount={activeRows.length}
        onPageChange={setTablePage}
        onSearchChange={() => undefined}
      />
    </div>
  );
}
