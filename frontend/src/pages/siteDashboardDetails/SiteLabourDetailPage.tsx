import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { ErrorMessage } from "../../components/common/ErrorMessage";
import { useToast } from "../../components/feedback/useToast";
import { attendanceReportsService } from "../../services/attendanceService";
import { labourReportsService, labourService } from "../../services/labourService";
import { paymentsService } from "../../services/paymentsService";
import { siteDashboardService } from "../../services/sitesService";
import type {
  Attendance,
  Labour,
  LabourAttendanceMonth,
  LabourPaymentLedgerEntry,
  Payment,
  SiteDashboardLabourSummary,
} from "../../types/erp.types";
import { getErrorMessage } from "../../utils/apiError";
import { formatCurrency, formatDate, formatNumber } from "../../utils/format";
import {
  DetailEmptyState,
  SiteDashboardDetailHeader,
} from "./SiteDashboardDetailShared";

function LabourDetailSection({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="space-y-1">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function formatPeriodRange(start?: string, end?: string) {
  if (!start && !end) {
    return "-";
  }

  return `${start ? formatDate(start) : "-"} to ${end ? formatDate(end) : "-"}`;
}

export function SiteLabourDetailPage() {
  const { labourId, siteId } = useParams();
  const { showError } = useToast();
  const parsedLabourId = Number(labourId);
  const parsedSiteId = Number(siteId);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [siteName, setSiteName] = useState("");
  const [labour, setLabour] = useState<Labour | null>(null);
  const [summary, setSummary] = useState<SiteDashboardLabourSummary | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<Attendance[]>([]);
  const [monthlyAttendance, setMonthlyAttendance] = useState<LabourAttendanceMonth[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LabourPaymentLedgerEntry[]>([]);

  useEffect(() => {
    async function loadDetails() {
      if (!parsedLabourId || !parsedSiteId) {
        setError("Invalid labour detail requested.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError("");
        const [dashboard, labours, allPayments, allAttendance, monthlyReport, ledger] =
          await Promise.all([
            siteDashboardService.getDashboard(parsedSiteId),
            labourService.getOptions(),
            paymentsService.getOptions(),
            attendanceReportsService.getLabourAttendance(parsedLabourId),
            labourReportsService.getMonthlyAttendanceReport(parsedLabourId, {
              site: parsedSiteId,
            }),
            labourReportsService.getPaymentLedger(parsedLabourId),
          ]);

        setSiteName(dashboard.site.name);
        setLabour(labours.find((entry) => entry.id === parsedLabourId) ?? null);
        setSummary(
          dashboard.labour_summary.find((entry) => entry.labour_id === parsedLabourId) ?? null,
        );
        setPayments(
          allPayments
            .filter((entry) => entry.labour === parsedLabourId && entry.site === parsedSiteId)
            .sort((left, right) => (right.date || "").localeCompare(left.date || "")),
        );
        setAttendanceRows(
          allAttendance
            .filter((entry) => entry.site === parsedSiteId)
            .sort((left, right) => right.date.localeCompare(left.date)),
        );
        setMonthlyAttendance(
          [...monthlyReport.months].sort((left, right) => right.month_start.localeCompare(left.month_start)),
        );
        setLedgerEntries(
          [...ledger.payments].sort((left, right) => right.date.localeCompare(left.date)),
        );
      } catch (loadError) {
        const message = getErrorMessage(loadError);
        setError(message);
        showError("Unable to load labour detail", message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadDetails();
  }, [parsedLabourId, parsedSiteId, showError]);

  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const currentMonthPresentDays = useMemo(
    () =>
      attendanceRows.filter(
        (entry) => entry.present && entry.date.startsWith(currentMonthKey),
      ).length,
    [attendanceRows, currentMonthKey],
  );

  const totalPaid =
    summary?.paid_amount ?? payments.reduce((total, entry) => total + entry.paid_amount, 0);
  const totalPending =
    summary?.pending_amount ??
    payments.reduce((total, entry) => total + entry.pending_amount, 0);

  if (!parsedLabourId || !parsedSiteId) {
    return <DetailEmptyState message="Invalid labour detail requested." />;
  }

  return (
    <div className="space-y-6">
      <SiteDashboardDetailHeader
        description="Review labour profile, site payments, attendance history, and monthly attendance summary."
        siteId={parsedSiteId}
        siteName={siteName || `Site ${parsedSiteId}`}
        title={labour?.name || summary?.labour_name || "Labour Detail"}
      />

      <ErrorMessage message={error} />

      {!labour && !summary && !isLoading ? (
        <DetailEmptyState message="Labour detail was not found for this site." />
      ) : (
        <div className="space-y-8">
          <section className="grid gap-4 border-b border-slate-200 pb-6 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Paid Amount", value: formatCurrency(totalPaid) },
              { label: "Pending Amount", value: formatCurrency(totalPending) },
              { label: "Present Days This Month", value: formatNumber(currentMonthPresentDays) },
              { label: "Per Day Wage", value: formatCurrency(labour?.per_day_wage) },
            ].map((item) => (
              <div className="border-b border-slate-200 pb-3 last:border-b-0 md:last:border-b" key={item.label}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {item.label}
                </p>
                <p className="mt-2 text-xl font-semibold text-slate-950">{item.value}</p>
              </div>
            ))}
          </section>

          <section className="space-y-4 border-b border-slate-200 pb-6">
            <LabourDetailSection
              description="Profile and site-specific summary for this labour."
              title="Overview"
            />
            <dl className="grid gap-x-8 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
              {[
                { label: "Labour Name", value: labour?.name || summary?.labour_name || "-" },
                { label: "Phone", value: labour?.phone || "-" },
                { label: "Per Day Wage", value: formatCurrency(labour?.per_day_wage) },
                { label: "Site", value: siteName || `Site ${parsedSiteId}` },
                { label: "Attendance Days", value: formatNumber(summary?.present_count ?? currentMonthPresentDays) },
                { label: "Total Wage", value: formatCurrency(summary?.total_wage) },
              ].map((item) => (
                <div className="border-b border-slate-200 pb-3" key={item.label}>
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {item.label}
                  </dt>
                  <dd className="mt-2 text-sm font-semibold text-slate-950">{item.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="space-y-4 border-b border-slate-200 pb-6">
            <LabourDetailSection
              description="Labour payment history for the selected site."
              title="Payments"
            />
            {payments.length ? (
              <div className="space-y-4">
                {payments.map((payment) => (
                  <article
                    className="grid gap-3 border-b border-slate-200 pb-4 last:border-b-0 last:pb-0 md:grid-cols-[1.3fr_0.9fr]"
                    key={payment.id}
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {formatDate(payment.date)}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Period: {formatPeriodRange(payment.period_start, payment.period_end)}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Notes: {payment.notes?.trim() || "-"}
                      </p>
                    </div>
                    <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-3 md:grid-cols-1 md:text-right">
                      <p>
                        Wage: <span className="font-semibold text-slate-950">{formatCurrency(payment.total_amount)}</span>
                      </p>
                      <p>
                        Paid: <span className="font-semibold text-emerald-700">{formatCurrency(payment.paid_amount)}</span>
                      </p>
                      <p>
                        Pending: <span className="font-semibold text-amber-700">{formatCurrency(payment.pending_amount)}</span>
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                No labour payment history is available for this site.
              </p>
            )}
          </section>

          <section className="space-y-4 border-b border-slate-200 pb-6">
            <LabourDetailSection
              description="Daily attendance entries for the selected site."
              title="Attendance"
            />
            {attendanceRows.length ? (
              <div className="space-y-3">
                {attendanceRows.map((entry) => (
                  <div
                    className="flex flex-col gap-2 border-b border-slate-200 pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                    key={entry.id}
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {formatDate(entry.date)}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">{entry.site_name}</p>
                    </div>
                    <span
                      className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        entry.present
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {entry.present ? "Present" : "Absent"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                No attendance records are available for this labour on this site.
              </p>
            )}
          </section>

          <section className="space-y-4 border-b border-slate-200 pb-6">
            <LabourDetailSection
              description="Month-wise attendance summary using the existing monthly attendance endpoint for this labour and site."
              title="Monthly Attendance Summary"
            />
            {monthlyAttendance.length ? (
              <div className="space-y-4">
                {monthlyAttendance.map((entry) => (
                  <article
                    className="grid gap-2 border-b border-slate-200 pb-4 last:border-b-0 last:pb-0 md:grid-cols-[1.1fr_1fr]"
                    key={entry.month}
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{entry.month}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Month Start: {formatDate(entry.month_start)}
                      </p>
                    </div>
                    <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
                      <p>
                        Present: <span className="font-semibold text-slate-950">{formatNumber(entry.present_days)}</span>
                      </p>
                      <p>
                        Absent: <span className="font-semibold text-slate-950">{formatNumber(entry.absent_days)}</span>
                      </p>
                      <p>
                        Total Days: <span className="font-semibold text-slate-950">{formatNumber(entry.total_days)}</span>
                      </p>
                      <p>
                        Total Wage: <span className="font-semibold text-slate-950">{formatCurrency(entry.total_wage)}</span>
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                No monthly attendance summary is available for this labour on this site.
              </p>
            )}
          </section>

          <section className="space-y-4">
            <LabourDetailSection
              description="Overall labour payment ledger from the existing frontend report service."
              title="Ledger"
            />
            {ledgerEntries.length ? (
              <div className="space-y-4">
                {ledgerEntries.map((entry) => (
                  <article
                    className="grid gap-2 border-b border-slate-200 pb-4 last:border-b-0 last:pb-0 md:grid-cols-[1.1fr_1fr]"
                    key={entry.id}
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {entry.entry_type}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {formatDate(entry.date)} | {entry.site}
                      </p>
                    </div>
                    <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-3 md:text-right">
                      <p>
                        Wage: <span className="font-semibold text-slate-950">{formatCurrency(entry.debit)}</span>
                      </p>
                      <p>
                        Paid: <span className="font-semibold text-emerald-700">{formatCurrency(entry.credit)}</span>
                      </p>
                      <p>
                        Pending: <span className="font-semibold text-amber-700">{formatCurrency(entry.balance)}</span>
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600">No labour ledger entries are available.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
