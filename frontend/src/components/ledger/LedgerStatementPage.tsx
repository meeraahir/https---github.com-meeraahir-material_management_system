import { useState } from "react";

import { useToast } from "../feedback/useToast";
import { PageHeader } from "../layout/PageHeader";
import { DataTable } from "../table/DataTable";
import { Button } from "../ui/Button";
import { FormError } from "../ui/FormError";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import type { TableAction, TableColumn } from "../../types/ui.types";
import { getErrorMessage } from "../../utils/apiError";
import { formatCurrency } from "../../utils/format";

interface LedgerOption {
  label: string;
  value: number;
}

interface LedgerTotals {
  paidLabel: string;
  paidValue: number;
  pendingLabel: string;
  pendingValue: number;
  totalLabel: string;
  totalValue: number;
}

interface LedgerStatementPageProps<TEntry> {
  actions?: TableAction<TEntry>[];
  columns: TableColumn<TEntry>[];
  description: string;
  emptyDescription: string;
  entityLabel: string;
  entityOptions: LedgerOption[];
  getRowId: (row: TEntry, index: number) => number | string;
  loadLedger: (entityId: number) => Promise<{ entries: TEntry[]; name: string; totals: LedgerTotals }>;
  referenceError?: string;
  searchPlaceholder: string;
  title: string;
}

export function LedgerStatementPage<TEntry>({
  actions,
  columns,
  description,
  emptyDescription,
  entityLabel,
  entityOptions,
  getRowId,
  loadLedger,
  referenceError,
  searchPlaceholder,
  title,
}: LedgerStatementPageProps<TEntry>) {
  const { showError } = useToast();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [ledgerName, setLedgerName] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<TEntry[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [selectedId, setSelectedId] = useState(0);
  const [totals, setTotals] = useState<LedgerTotals | null>(null);

  function validateFilters() {
    if (!selectedId) {
      return `${entityLabel} is required.`;
    }

    return "";
  }

  async function handleLoad() {
    const validationMessage = validateFilters();

    if (validationMessage) {
      setError(validationMessage);
      showError("Unable to load ledger", validationMessage);
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      const response = await loadLedger(selectedId);
      setRows(response.entries);
      setLedgerName(response.name);
      setTotals(response.totals);
      setPage(1);
      setSearchValue("");
    } catch (loadError) {
      const message = getErrorMessage(loadError);
      setError(message);
      setRows([]);
      setTotals(null);
      showError("Unable to load ledger", message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description={description}
        search={
          <Input
            label="Search"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
          />
        }
        title={title}
      />

      <FormError message={referenceError || error} />

      <section className="grid gap-4 rounded-2xl border border-blue-100/90 bg-white/94 p-4 shadow-md shadow-blue-950/5 dark:border-blue-100/90 dark:bg-white/94 md:grid-cols-[minmax(0,1fr)_auto]">
        <Select
          label={entityLabel}
          options={entityOptions}
          placeholder={`Select ${entityLabel.toLowerCase()}`}
          value={selectedId || ""}
          onChange={(event) => setSelectedId(event.target.value ? Number(event.target.value) : 0)}
        />
        <div className="flex items-end">
          <Button
            className="w-full md:w-auto"
            isLoading={isLoading}
            onClick={() => void handleLoad()}
            type="button"
          >
            Load Ledger
          </Button>
        </div>
      </section>

      {totals ? (
        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[1.5rem] border border-blue-100 bg-white/95 p-4 shadow-sm shadow-blue-950/5 dark:border-blue-100 dark:bg-white/95">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-600">
              {totals.totalLabel}
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950 dark:text-slate-950">
              {formatCurrency(totals.totalValue)}
            </p>
          </article>
          <article className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm dark:border-emerald-200 dark:bg-emerald-50/80">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-700">
              {totals.paidLabel}
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950 dark:text-slate-950">
              {formatCurrency(totals.paidValue)}
            </p>
          </article>
          <article className="rounded-[1.5rem] border border-amber-200 bg-amber-50/80 p-4 shadow-sm dark:border-amber-200 dark:bg-amber-50/80">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700 dark:text-amber-700">
              {totals.pendingLabel}
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950 dark:text-slate-950">
              {formatCurrency(totals.pendingValue)}
            </p>
          </article>
        </section>
      ) : null}

      <DataTable
        actions={actions}
        clientPagination
        columns={columns}
        data={rows}
        emptyDescription={emptyDescription}
        emptyTitle="No Ledger Entries"
        isLoading={isLoading}
        keyExtractor={getRowId}
        page={page}
        searchPlaceholder={searchPlaceholder}
        searchValue={searchValue}
        title={ledgerName ? `${ledgerName} Ledger` : `${title} Preview`}
        totalCount={rows.length}
        onPageChange={setPage}
        onSearchChange={setSearchValue}
      />
    </div>
  );
}
