import { useState } from "react";

import { LedgerStatementPage } from "../../components/ledger/LedgerStatementPage";
import { Modal } from "../../components/modal/Modal";
import { Button } from "../../components/ui/Button";
import { useReferenceData } from "../../hooks/useReferenceData";
import { receivablesService } from "../../services/receivablesService";
import { reportsService } from "../../services/reportsService";
import type { Receivable } from "../../types/erp.types";
import { formatCurrency, formatDate } from "../../utils/format";

interface PartyLedgerMovement {
  balance: number;
  credit: number;
  date: string;
  debit: number;
  id: number | string;
  reference: string;
  type: "invoice" | "receipt";
}

interface PartyLedgerSummaryRow {
  date: string;
  id: number;
  invoice: string;
  invoiceAmount: number;
  movements: PartyLedgerMovement[];
  pendingAmount: number;
  receivedAmount: number;
  site: string;
  status: "Pending" | "Partial" | "Received";
}

function getStatus(
  receivedAmount: number,
  pendingAmount: number,
): PartyLedgerSummaryRow["status"] {
  if (pendingAmount <= 0) {
    return "Received";
  }

  if (receivedAmount > 0) {
    return "Partial";
  }

  return "Pending";
}

function getStatusClassName(status: PartyLedgerSummaryRow["status"]) {
  if (status === "Received") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300";
  }

  if (status === "Partial") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300";
  }

  return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300";
}

function buildMovements(receivable: Receivable, receivedAmount: number) {
  const invoiceLabel = `Receivable #${receivable.id}`;
  const movements: PartyLedgerMovement[] = [
    {
      balance: receivable.amount,
      credit: 0,
      date: receivable.date,
      debit: receivable.amount,
      id: `invoice-${receivable.id}`,
      reference: invoiceLabel,
      type: "invoice",
    },
  ];

  if (receivedAmount > 0) {
    movements.push({
      balance: receivable.amount - receivedAmount,
      credit: receivedAmount,
      date: receivable.date,
      debit: 0,
      id: `receipt-${receivable.id}`,
      reference: `${invoiceLabel} receipt`,
      type: "receipt",
    });
  }

  return movements;
}

function buildSummaryRows(
  partyId: number,
  receivables: Receivable[],
  siteNameById: Map<number, string>,
) {
  return receivables
    .filter((receivable) => receivable.party === partyId)
    .map((receivable) => {
      const pendingAmount =
        receivable.pending_amount ??
        (receivable.received ? 0 : receivable.amount);
      const receivedAmount =
        receivable.current_received_amount ?? receivable.amount - pendingAmount;

      return {
        date: receivable.date,
        id: receivable.id,
        invoice: `Receivable #${receivable.id}`,
        invoiceAmount: receivable.amount,
        movements: buildMovements(receivable, receivedAmount),
        pendingAmount,
        receivedAmount,
        site: siteNameById.get(receivable.site) || `Site #${receivable.site}`,
        status: getStatus(receivedAmount, pendingAmount),
      };
    })
    .sort((left, right) => {
      const dateCompare = right.date.localeCompare(left.date);

      if (dateCompare !== 0) {
        return dateCompare;
      }

      return right.id - left.id;
    });
}

function MovementDetailsModal({
  row,
  onClose,
}: {
  row: PartyLedgerSummaryRow | null;
  onClose: () => void;
}) {
  return (
    <Modal
      footer={
        <div className="flex justify-end">
          <Button onClick={onClose} type="button" variant="secondary">
            Close
          </Button>
        </div>
      }
      onClose={onClose}
      open={Boolean(row)}
      size="xl"
      title={row ? `${row.invoice} Movement` : "Party Ledger Movement"}
    >
      {row ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4 dark:border-blue-900/70 dark:from-blue-950/30 dark:via-slate-950 dark:to-cyan-950/20">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600 dark:text-blue-300">
              Receivable Summary
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Site</p>
                <p className="font-semibold text-slate-950 dark:text-slate-50">
                  {row.site}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Invoice Amount</p>
                <p className="font-semibold text-slate-950 dark:text-slate-50">
                  {formatCurrency(row.invoiceAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Received</p>
                <p className="font-semibold text-slate-950 dark:text-slate-50">
                  {formatCurrency(row.receivedAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Pending</p>
                <p className="font-semibold text-slate-950 dark:text-slate-50">
                  {formatCurrency(row.pendingAmount)}
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] divide-y divide-slate-200 text-sm dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-900/80">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Activity</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Reference</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Invoice</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Received</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Pending</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                  {row.movements.map((movement) => (
                    <tr key={movement.id} className="bg-white dark:bg-slate-950">
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                        {formatDate(movement.date)}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                        {movement.type === "invoice" ? "Invoice Created" : "Receipt Received"}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                        {movement.reference}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(movement.debit)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-700 dark:text-emerald-300">
                        {formatCurrency(movement.credit)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-amber-700 dark:text-amber-300">
                        {formatCurrency(movement.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
            Invoice Created se party se lene wala amount badhta hai. Receipt Received se pending amount kam hota hai.
          </p>
        </div>
      ) : null}
    </Modal>
  );
}

export function PartyLedgerPage() {
  const references = useReferenceData();
  const [selectedRow, setSelectedRow] =
    useState<PartyLedgerSummaryRow | null>(null);

  return (
    <>
      <LedgerStatementPage<PartyLedgerSummaryRow>
        actions={[
          {
            label: "View",
            onClick: (row) => setSelectedRow(row),
            variant: "secondary",
          },
        ]}
        columns={[
          {
            key: "date",
            header: "Date",
            accessor: (row) => row.date,
            sortValue: (row) => row.date,
          },
          {
            key: "invoice",
            header: "Receivable",
            accessor: (row) => row.invoice,
            sortValue: (row) => row.invoice,
          },
          {
            key: "site",
            header: "Site",
            accessor: (row) => row.site,
            sortValue: (row) => row.site,
          },
          {
            key: "invoiceAmount",
            header: "Invoice Amount",
            accessor: (row) => formatCurrency(row.invoiceAmount),
            sortValue: (row) => row.invoiceAmount,
          },
          {
            key: "receivedAmount",
            header: "Received",
            accessor: (row) => formatCurrency(row.receivedAmount),
            sortValue: (row) => row.receivedAmount,
          },
          {
            key: "pendingAmount",
            header: "Pending",
            accessor: (row) => formatCurrency(row.pendingAmount),
            sortValue: (row) => row.pendingAmount,
          },
          {
            key: "status",
            header: "Status",
            accessor: (row) => (
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClassName(row.status)}`}
              >
                {row.status}
              </span>
            ),
            sortValue: (row) => row.status,
          },
        ]}
        description="View party receivables invoice-wise with received amount and pending balance. Use View for movement details."
        emptyDescription="Select a party and load the ledger to view receivable-wise balance."
        entityLabel="Party"
        entityOptions={references.parties.map((party) => ({
          label: `${party.name} (${party.contact})`,
          value: party.id,
        }))}
        getRowId={(row) => row.id}
        loadLedger={async (partyId) => {
          const [ledger, receivables] = await Promise.all([
            reportsService.getPartyLedger(partyId),
            receivablesService.getOptions(),
          ]);
          const siteNameById = new Map(
            references.sites.map((site) => [site.id, site.name]),
          );

          return {
            entries: buildSummaryRows(partyId, receivables, siteNameById),
            name: ledger.party,
            totals: {
              paidLabel: "Received Amount",
              paidValue: ledger.totals.received_amount,
              pendingLabel: "Pending Amount",
              pendingValue: ledger.totals.pending_amount,
              totalLabel: "Invoice Amount",
              totalValue: ledger.totals.total_amount,
            },
          };
        }}
        referenceError={references.error}
        searchPlaceholder="Search party ledger"
        title="Party Ledger"
      />
      <MovementDetailsModal
        row={selectedRow}
        onClose={() => setSelectedRow(null)}
      />
    </>
  );
}
