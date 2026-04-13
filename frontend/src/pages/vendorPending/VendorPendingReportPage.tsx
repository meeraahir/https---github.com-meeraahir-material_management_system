import { useCallback, useEffect, useMemo, useState } from "react";

import { useToast } from "../../components/feedback/useToast";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { PageHeader } from "../../components/layout/PageHeader";
import { DataTable } from "../../components/table/DataTable";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { reportsService } from "../../services/reportsService";
import type { VendorPendingReportRow } from "../../types/erp.types";
import { getErrorMessage } from "../../utils/apiError";
import { formatCurrency, formatNumber } from "../../utils/format";

export function VendorPendingReportPage() {
  const { showError } = useToast();
  const [error, setError] = useState("");
  const [isExporting, setIsExporting] = useState<"" | "excel" | "pdf">("");
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<VendorPendingReportRow[]>([]);
  const [searchValue, setSearchValue] = useState("");

  const loadReport = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      setRows(await reportsService.getVendorPendingReport());
    } catch (loadError) {
      const message = getErrorMessage(loadError);
      setError(message);
      showError("Unable to load vendor dues", message);
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const summary = useMemo(
    () => ({
      paidAmount: rows.reduce((total, row) => total + row.paid_amount, 0),
      pendingAmount: rows.reduce((total, row) => total + row.pending_amount, 0),
    }),
    [rows],
  );

  async function handleExport(format: "excel" | "pdf") {
    try {
      setIsExporting(format);
      await reportsService.exportVendorPendingReport(format);
    } catch (exportError) {
      showError("Unable to export vendor dues", getErrorMessage(exportError));
    } finally {
      setIsExporting("");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button onClick={() => void loadReport()} type="button" variant="secondary">
              Refresh
            </Button>
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
        description="Outstanding vendor dues report for finance and procurement follow-up."
        search={
          <Input
            label="Search"
            placeholder="Search vendor dues"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
          />
        }
        title="Vendor Dues"
      />

      <ErrorMessage message={error} />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.5rem] border border-blue-100 bg-white/95 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
            Vendors With Dues
          </p>
          <p className="mt-2 text-2xl font-black text-slate-950">
            {formatNumber(rows.length)}
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50/80 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
            Pending Amount
          </p>
          <p className="mt-2 text-2xl font-black text-slate-950">
            {formatCurrency(summary.pendingAmount)}
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Paid Amount
          </p>
          <p className="mt-2 text-2xl font-black text-slate-950">
            {formatCurrency(summary.paidAmount)}
          </p>
        </div>
      </section>

      <DataTable<VendorPendingReportRow>
        clientPagination
        columns={[
          {
            key: "vendor_name",
            header: "Vendor",
            accessor: (row) => row.vendor_name,
            sortValue: (row) => row.vendor_name,
          },
          {
            key: "total_amount",
            header: "Total Amount",
            accessor: (row) => row.total_amount,
            sortValue: (row) => row.total_amount,
          },
          {
            key: "paid_amount",
            header: "Paid Amount",
            accessor: (row) => row.paid_amount,
            sortValue: (row) => row.paid_amount,
          },
          {
            key: "pending_amount",
            header: "Pending Amount",
            accessor: (row) => row.pending_amount,
            sortValue: (row) => row.pending_amount,
          },
        ]}
        data={rows}
        emptyDescription="No pending vendor balances found."
        emptyTitle="No Vendor Dues"
        isLoading={isLoading}
        keyExtractor={(row) => row.vendor_id}
        page={page}
        searchValue={searchValue}
        totalCount={rows.length}
        onPageChange={setPage}
        onSearchChange={setSearchValue}
      />
    </div>
  );
}
