import { useEffect, useState } from "react";

import { useToast } from "../../components/feedback/useToast";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { PageHeader } from "../../components/layout/PageHeader";
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
  const [report, setReport] = useState<LabourAttendanceMonthlyReport | null>(
    null,
  );
  const [siteId, setSiteId] = useState(0);
  const [year, setYear] = useState("");
  const selectedMonthEntry = report
    ? month
      ? report.months.find((entry) => entry.month === `${year}-${String(month).padStart(2, "0")}`) ??
        report.months.at(-1) ??
        null
      : report.months.at(-1) ?? null
    : null;

  useEffect(() => {
    async function loadReport() {
      if (!labourId) {
        setError("");
        setReport(null);
        return;
      }

      if (month && !year.trim()) {
        setError("Year is required when month is selected.");
        setReport(null);
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

          <section className="rounded-[2rem] border border-blue-100 bg-white/95 p-5 shadow-md shadow-blue-950/5">
            <div className="mb-4">
              <h2 className="text-lg font-black text-slate-950">Monthly Breakdown</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                One focused monthly summary card for the selected labour and month.
              </p>
              {isLoading ? (
                <p className="mt-2 text-sm font-medium text-slate-500">
                  Loading monthly attendance summary...
                </p>
              ) : null}
            </div>

            {selectedMonthEntry ? (
              (() => {
                const safeTotalDays = Math.max(selectedMonthEntry.total_days, 0);
                const presentDays = Math.max(selectedMonthEntry.present_days, 0);
                const absentDays = Math.max(selectedMonthEntry.absent_days, 0);
                const presentPercentage =
                  safeTotalDays > 0 ? Math.min((presentDays / safeTotalDays) * 100, 100) : 0;
                const absentPercentage =
                  safeTotalDays > 0 ? Math.min((absentDays / safeTotalDays) * 100, 100) : 0;

                return (
                  <article className="rounded-[1.85rem] border border-blue-100 bg-gradient-to-br from-white to-slate-50/70 p-5 shadow-sm shadow-blue-950/5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Showing Month
                        </p>
                        <h3 className="mt-2 text-2xl font-black text-slate-950">
                          {new Date(selectedMonthEntry.month_start).toLocaleString("en-IN", {
                            month: "long",
                            year: "numeric",
                          })}
                        </h3>
                        <p className="mt-1 text-sm font-medium text-slate-600">
                          Month start: {formatDate(selectedMonthEntry.month_start)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-cyan-200 bg-cyan-50/80 px-4 py-3 text-left lg:min-w-[10rem] lg:text-right">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
                          Total Wage
                        </p>
                        <p className="mt-2 text-3xl font-black text-slate-950">
                          {formatCurrency(selectedMonthEntry.total_wage)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                          Present Days
                        </p>
                        <p className="mt-2 text-3xl font-black text-slate-950">
                          {formatNumber(presentDays)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                          Absent Days
                        </p>
                        <p className="mt-2 text-3xl font-black text-slate-950">
                          {formatNumber(absentDays)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                          Total Days
                        </p>
                        <p className="mt-2 text-3xl font-black text-slate-950">
                          {formatNumber(safeTotalDays)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 rounded-2xl border border-slate-200 bg-white/70 px-4 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-medium text-slate-600">
                        <span>
                          Present {formatNumber(presentDays)} / {formatNumber(safeTotalDays)} days
                        </span>
                        <span>Absent {formatNumber(absentDays)} days</span>
                      </div>
                      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                        <div className="flex h-full w-full">
                          <div
                            className="bg-emerald-500"
                            style={{ width: `${presentPercentage}%` }}
                          />
                          <div
                            className="bg-amber-400"
                            style={{ width: `${absentPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })()
            ) : (
              <div className="rounded-[1.75rem] border border-dashed border-blue-200 bg-slate-50/70 px-5 py-10 text-center text-sm font-medium text-slate-600">
                No monthly attendance data found for the selected filters.
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
