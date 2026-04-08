import { useState } from "react";

import { PageHeader } from "../../components/layout/PageHeader";
import { DataTable } from "../../components/table/DataTable";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import { reportsService } from "../../services/reportsService";
import type { ReportFilters, ReportModuleKey } from "../../types/erp.types";
import type { TableColumn } from "../../types/ui.types";

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
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: "",
    dateTo: "",
    module: "materials",
  });
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  async function handlePreview() {
    setIsLoading(true);

    try {
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
    } finally {
      setIsLoading(false);
    }
  }

  const columns = buildColumns(rows);

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button
              onClick={() => void reportsService.exportExcel(filters.module)}
              type="button"
              variant="secondary"
            >
              Export Excel
            </Button>
            <Button
              onClick={() => void reportsService.exportPdf(filters.module)}
              type="button"
            >
              Export PDF
            </Button>
          </>
        }
        description="Preview and export backend-supported reports in Excel and PDF formats."
        title="Reports"
      />

      <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 lg:grid-cols-4">
        <Select
          label="Module"
          options={reportModuleOptions}
          value={filters.module}
          onChange={(event) =>
            setFilters((currentValue) => ({
              ...currentValue,
              module: event.target.value as ReportModuleKey,
            }))
          }
        />
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          <span>Date From</span>
          <input
            className="h-12 rounded-xl border border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-900"
            type="date"
            value={filters.dateFrom}
            onChange={(event) =>
              setFilters((currentValue) => ({
                ...currentValue,
                dateFrom: event.target.value,
              }))
            }
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          <span>Date To</span>
          <input
            className="h-12 rounded-xl border border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-900"
            type="date"
            value={filters.dateTo}
            onChange={(event) =>
              setFilters((currentValue) => ({
                ...currentValue,
                dateTo: event.target.value,
              }))
            }
          />
        </label>
        <div className="flex items-end">
          <Button className="w-full" onClick={() => void handlePreview()} type="button">
            Preview Report
          </Button>
        </div>
      </section>

      <DataTable
        columns={columns}
        data={rows}
        emptyDescription="Choose a module and click preview to load report data."
        emptyTitle="No report preview"
        isLoading={isLoading}
        keyExtractor={(row, index) => String(row.metric ?? row.id ?? index)}
        page={1}
        searchPlaceholder="Search preview rows"
        searchValue={searchValue}
        title="Report Preview"
        totalCount={rows.length}
        onPageChange={() => undefined}
        onSearchChange={setSearchValue}
      />
    </div>
  );
}
