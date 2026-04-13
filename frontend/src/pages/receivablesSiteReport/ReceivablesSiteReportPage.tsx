import { useEffect, useMemo, useState } from "react";

import { useToast } from "../../components/feedback/useToast";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { PageHeader } from "../../components/layout/PageHeader";
import { DataTable } from "../../components/table/DataTable";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { useReferenceData } from "../../hooks/useReferenceData";
import { reportsService } from "../../services/reportsService";
import { getErrorMessage } from "../../utils/apiError";
import { formatCurrency, formatNumber } from "../../utils/format";
import { buildDynamicReportColumns } from "../../utils/reportTable";

function getSumValue(rows: Record<string, unknown>[], keys: string[]) {
  return rows.reduce((total, row) => {
    for (const key of keys) {
      const value = row[key];
      if (typeof value === "number") {
        return total + value;
      }
      if (
        typeof value === "string" &&
        value.trim() !== "" &&
        Number.isFinite(Number(value))
      ) {
        return total + Number(value);
      }
    }

    return total;
  }, 0);
}

export function ReceivablesSiteReportPage() {
  const { showError } = useToast();
  const references = useReferenceData();
  const [error, setError] = useState("");
  const [isExporting, setIsExporting] = useState<"" | "excel" | "pdf">("");
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [siteId, setSiteId] = useState(0);

  useEffect(() => {
    async function loadReport() {
      try {
        setIsLoading(true);
        setError("");
        setRows(await reportsService.getFinanceSiteReport(siteId || undefined));
      } catch (loadError) {
        const message = getErrorMessage(loadError);
        setError(message);
        showError("Unable to load site receivables", message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadReport();
  }, [showError, siteId]);

  const columns = useMemo(() => buildDynamicReportColumns(rows), [rows]);
  const totalAmount = useMemo(
    () => getSumValue(rows, ["total_amount", "amount"]),
    [rows],
  );
  const receivedAmount = useMemo(
    () => getSumValue(rows, ["received_amount", "current_received_amount"]),
    [rows],
  );
  const pendingAmount = useMemo(
    () => getSumValue(rows, ["pending_amount"]),
    [rows],
  );

  async function handleExport(format: "excel" | "pdf") {
    try {
      setIsExporting(format);
      await reportsService.exportFinanceSiteReport(format, siteId || undefined);
    } catch (exportError) {
      showError(
        "Unable to export site receivables",
        getErrorMessage(exportError),
      );
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
        description="Site-wise receivable position with optional single-site drill down."
        search={
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)]">
            <Input
              label="Search"
              placeholder="Search site receivables"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
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
          </div>
        }
        title="Site Receivables"
      />

      <ErrorMessage message={error || references.error} />

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-[1.5rem] border border-blue-100 bg-white/95 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
            Rows
          </p>
          <p className="mt-2 text-2xl font-black text-slate-950">
            {formatNumber(rows.length)}
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-cyan-200 bg-cyan-50/80 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
            Total Amount
          </p>
          <p className="mt-2 text-2xl font-black text-slate-950">
            {formatCurrency(totalAmount)}
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Received Amount
          </p>
          <p className="mt-2 text-2xl font-black text-slate-950">
            {formatCurrency(receivedAmount)}
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50/80 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
            Pending Amount
          </p>
          <p className="mt-2 text-2xl font-black text-slate-950">
            {formatCurrency(pendingAmount)}
          </p>
        </div>
      </section>

      <DataTable<Record<string, unknown>>
        clientPagination
        columns={columns}
        data={rows}
        emptyDescription="No receivable site report data found."
        emptyTitle="No Site Receivables"
        isLoading={isLoading}
        keyExtractor={(row, index) =>
          String(row.site_id ?? row.party_id ?? row.id ?? index)
        }
        page={page}
        searchValue={searchValue}
        totalCount={rows.length}
        onPageChange={setPage}
        onSearchChange={setSearchValue}
      />
    </div>
  );
}
