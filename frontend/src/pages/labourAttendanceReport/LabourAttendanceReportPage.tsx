import { useEffect, useState } from "react";

import { useToast } from "../../components/feedback/useToast";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { PageHeader } from "../../components/layout/PageHeader";
import { DataTable } from "../../components/table/DataTable";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { useReferenceData } from "../../hooks/useReferenceData";
import { labourReportsService } from "../../services/labourService";
import type { LabourAttendanceMonthlyReport } from "../../types/erp.types";
import { getErrorMessage } from "../../utils/apiError";
import { formatCurrency, formatDate, formatNumber } from "../../utils/format";

export function LabourAttendanceReportPage() {
  const { showError } = useToast();
  const references = useReferenceData();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [labourId, setLabourId] = useState(0);
  const [month, setMonth] = useState(0);
  const [page, setPage] = useState(1);
  const [report, setReport] = useState<LabourAttendanceMonthlyReport | null>(
    null,
  );
  const [siteId, setSiteId] = useState(0);
  const [year, setYear] = useState("");

  useEffect(() => {
    async function loadReport() {
      if (!labourId) {
        setError("");
        setReport(null);
        setPage(1);
        return;
      }

      if (month && !year.trim()) {
        setError("Year is required when month is selected.");
        setReport(null);
        setPage(1);
        return;
      }

      try {
        setIsLoading(true);
        setError("");
        const response = await labourReportsService.getMonthlyAttendanceReport(
          labourId,
          {
            dateFrom,
            dateTo,
            month: month || undefined,
            site: siteId || undefined,
            year: year.trim() ? Number(year) : undefined,
          },
        );
        setReport(response);
        setPage(1);
      } catch (loadError) {
        const message = getErrorMessage(loadError);
        setError(message);
        setReport(null);
        showError("Unable to load monthly attendance", message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadReport();
  }, [dateFrom, dateTo, labourId, month, showError, siteId, year]);

  return (
    <div className="space-y-6">
      <PageHeader
        description="Month-wise labour attendance and wage report for one labour record."
        title="Monthly Attendance"
      />

      <ErrorMessage message={error || references.error} />

      <section className="grid gap-4 rounded-2xl border border-blue-100/90 bg-white/94 p-4 shadow-md shadow-blue-950/5 md:grid-cols-2 xl:grid-cols-3">
        <Select
          label="Labour"
          options={references.labour.map((labour) => ({
            label: labour.name,
            value: labour.id,
          }))}
          value={labourId || ""}
          onChange={(event) =>
            setLabourId(event.target.value ? Number(event.target.value) : 0)
          }
        />
        <Select
          label="Site"
          options={references.sites.map((site) => ({
            label: site.name,
            value: site.id,
          }))}
          value={siteId || ""}
          onChange={(event) =>
            setSiteId(event.target.value ? Number(event.target.value) : 0)
          }
        />
        <Input
          label="Year"
          max={2100}
          min={2000}
          placeholder="2026"
          type="number"
          value={year}
          onChange={(event) => setYear(event.target.value)}
        />
        <Select
          label="Month"
          options={Array.from({ length: 12 }, (_, index) => ({
            label: new Date(2026, index, 1).toLocaleString("en-IN", {
              month: "long",
            }),
            value: index + 1,
          }))}
          value={month || ""}
          onChange={(event) =>
            setMonth(event.target.value ? Number(event.target.value) : 0)
          }
        />
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
      </section>

      {report ? (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <div className="rounded-[1.5rem] border border-blue-100 bg-white/95 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                Labour
              </p>
              <p className="mt-2 text-xl font-black text-slate-950">
                {report.labour_name}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Present Days
              </p>
              <p className="mt-2 text-2xl font-black text-slate-950">
                {formatNumber(report.totals.present_days)}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50/80 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                Absent Days
              </p>
              <p className="mt-2 text-2xl font-black text-slate-950">
                {formatNumber(report.totals.absent_days)}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-cyan-200 bg-cyan-50/80 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                Total Wage
              </p>
              <p className="mt-2 text-2xl font-black text-slate-950">
                {formatCurrency(report.totals.total_wage)}
              </p>
            </div>
          </section>

          <DataTable
            clientPagination
            columns={[
              {
                key: "month",
                header: "Month",
                accessor: (row) => row.month,
                sortValue: (row) => row.month,
              },
              {
                key: "month_start",
                header: "Month Start",
                accessor: (row) => formatDate(row.month_start),
                sortValue: (row) => row.month_start,
              },
              {
                key: "present_days",
                header: "Present Days",
                accessor: (row) => row.present_days,
                sortValue: (row) => row.present_days,
              },
              {
                key: "absent_days",
                header: "Absent Days",
                accessor: (row) => row.absent_days,
                sortValue: (row) => row.absent_days,
              },
              {
                key: "total_days",
                header: "Total Days",
                accessor: (row) => row.total_days,
                sortValue: (row) => row.total_days,
              },
              {
                key: "total_wage",
                header: "Total Wage",
                accessor: (row) => row.total_wage,
                sortValue: (row) => row.total_wage,
              },
            ]}
            data={report.months}
            emptyDescription="No monthly attendance data found for the selected filters."
            emptyTitle="No Attendance Data"
            isLoading={isLoading}
            keyExtractor={(row) => row.month}
            page={page}
            searchValue=""
            totalCount={report.months.length}
            onPageChange={setPage}
            onSearchChange={() => undefined}
          />
        </>
      ) : null}
    </div>
  );
}
