import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { ErrorMessage } from "../../components/common/ErrorMessage";
import { useToast } from "../../components/feedback/useToast";
import { DataTable } from "../../components/table/DataTable";
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
  DetailInfoGrid,
  DetailMetricCard,
  DetailMetricGrid,
  DetailSection,
  SiteDashboardDetailHeader,
} from "./SiteDashboardDetailShared";

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
  const [paymentPage, setPaymentPage] = useState(1);
  const [attendancePage, setAttendancePage] = useState(1);
  const [monthlyPage, setMonthlyPage] = useState(1);
  const [ledgerPage, setLedgerPage] = useState(1);

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
        setPaymentPage(1);
        setAttendancePage(1);
        setMonthlyPage(1);
        setLedgerPage(1);
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
        <>
          <DetailMetricGrid>
            <DetailMetricCard accentClassName="border-blue-100 bg-white" label="Paid Amount" value={formatCurrency(totalPaid)} />
            <DetailMetricCard accentClassName="border-amber-200 bg-amber-50/70" label="Pending Amount" value={formatCurrency(totalPending)} />
            <DetailMetricCard accentClassName="border-emerald-200 bg-emerald-50/70" label="Present Days This Month" value={formatNumber(currentMonthPresentDays)} />
            <DetailMetricCard accentClassName="border-cyan-200 bg-cyan-50/70" label="Per Day Wage" value={formatCurrency(labour?.per_day_wage)} />
          </DetailMetricGrid>

          <DetailSection description="Basic labour information and site context." title="Overview">
            <DetailInfoGrid
              items={[
                { label: "Labour Name", value: labour?.name || summary?.labour_name || "-" },
                { label: "Phone", value: labour?.phone || "-" },
                { label: "Per Day Wage", value: formatCurrency(labour?.per_day_wage) },
                { label: "Site", value: siteName || `Site ${parsedSiteId}` },
                { label: "Attendance Days", value: formatNumber(summary?.present_count ?? currentMonthPresentDays) },
                { label: "Total Wage", value: formatCurrency(summary?.total_wage) },
              ]}
            />
          </DetailSection>

          <DetailSection description="Labour payment history for the selected site." title="Payments">
            <DataTable
              clientPagination
              columns={[
                { key: "date", header: "Date", accessor: (row) => formatDate(row.date), sortValue: (row) => row.date || "" },
                {
                  key: "period",
                  header: "Period",
                  accessor: (row) =>
                    row.period_start || row.period_end
                      ? `${formatDate(row.period_start)} to ${formatDate(row.period_end)}`
                      : "-",
                  sortValue: (row) => row.period_start || row.period_end || "",
                },
                { key: "total", header: "Wage Amount", accessor: (row) => row.total_amount, sortValue: (row) => row.total_amount },
                { key: "paid", header: "Paid", accessor: (row) => row.paid_amount, sortValue: (row) => row.paid_amount },
                { key: "pending", header: "Pending", accessor: (row) => row.pending_amount, sortValue: (row) => row.pending_amount },
                { key: "notes", header: "Notes", accessor: (row) => row.notes || "-", sortValue: (row) => row.notes || "" },
              ]}
              data={payments}
              emptyDescription="No labour payment history is available for this site."
              emptyTitle="No Payments"
              isLoading={isLoading}
              keyExtractor={(row) => row.id}
              page={paymentPage}
              searchValue=""
              totalCount={payments.length}
              onPageChange={setPaymentPage}
              onSearchChange={() => undefined}
            />
          </DetailSection>

          <DetailSection description="Daily attendance entries for the selected site. Payment history is kept separate above for clarity." title="Attendance">
            <DataTable
              clientPagination
              columns={[
                { key: "date", header: "Date", accessor: (row) => formatDate(row.date), sortValue: (row) => row.date },
                { key: "site", header: "Site", accessor: (row) => row.site_name, sortValue: (row) => row.site_name },
                { key: "present", header: "Present", accessor: (row) => (row.present ? "Yes" : "No"), sortValue: (row) => row.present },
              ]}
              data={attendanceRows}
              emptyDescription="No attendance records are available for this labour on this site."
              emptyTitle="No Attendance"
              isLoading={isLoading}
              keyExtractor={(row) => row.id}
              page={attendancePage}
              searchValue=""
              totalCount={attendanceRows.length}
              onPageChange={setAttendancePage}
              onSearchChange={() => undefined}
            />
          </DetailSection>

          <DetailSection description="Month-wise attendance summary using the existing monthly attendance endpoint for this labour and site." title="Monthly Attendance Summary">
            <DataTable
              clientPagination
              columns={[
                { key: "month", header: "Month", accessor: (row) => row.month, sortValue: (row) => row.month },
                { key: "month_start", header: "Month Start", accessor: (row) => formatDate(row.month_start), sortValue: (row) => row.month_start },
                { key: "present_days", header: "Present Days", accessor: (row) => row.present_days, sortValue: (row) => row.present_days },
                { key: "absent_days", header: "Absent Days", accessor: (row) => row.absent_days, sortValue: (row) => row.absent_days },
                { key: "total_days", header: "Total Days", accessor: (row) => row.total_days, sortValue: (row) => row.total_days },
                { key: "total_wage", header: "Total Wage", accessor: (row) => row.total_wage, sortValue: (row) => row.total_wage },
              ]}
              data={monthlyAttendance}
              emptyDescription="No monthly attendance summary is available for this labour on this site."
              emptyTitle="No Monthly Attendance"
              isLoading={isLoading}
              keyExtractor={(row) => row.month}
              page={monthlyPage}
              searchValue=""
              totalCount={monthlyAttendance.length}
              onPageChange={setMonthlyPage}
              onSearchChange={() => undefined}
            />
          </DetailSection>

          <DetailSection description="Overall labour payment ledger from the existing frontend report service." title="Ledger">
            <DataTable
              clientPagination
              columns={[
                { key: "date", header: "Date", accessor: (row) => formatDate(row.date), sortValue: (row) => row.date },
                { key: "entry_type", header: "Activity", accessor: (row) => row.entry_type, sortValue: (row) => row.entry_type },
                { key: "site", header: "Site", accessor: (row) => row.site, sortValue: (row) => row.site },
                { key: "debit", header: "Wage", accessor: (row) => row.debit, sortValue: (row) => row.debit },
                { key: "credit", header: "Paid", accessor: (row) => row.credit, sortValue: (row) => row.credit },
                { key: "balance", header: "Pending", accessor: (row) => row.balance, sortValue: (row) => row.balance },
              ]}
              data={ledgerEntries}
              emptyDescription="No labour ledger entries are available."
              emptyTitle="No Ledger Entries"
              isLoading={isLoading}
              keyExtractor={(row) => row.id}
              page={ledgerPage}
              searchValue=""
              totalCount={ledgerEntries.length}
              onPageChange={setLedgerPage}
              onSearchChange={() => undefined}
            />
          </DetailSection>
        </>
      )}
    </div>
  );
}
