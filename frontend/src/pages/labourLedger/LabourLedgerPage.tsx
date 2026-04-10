import { useState } from "react";

import { LedgerStatementPage } from "../../components/ledger/LedgerStatementPage";
import { Modal } from "../../components/modal/Modal";
import { Button } from "../../components/ui/Button";
import { useReferenceData } from "../../hooks/useReferenceData";
import { labourReportsService } from "../../services/labourService";
import { paymentsService } from "../../services/paymentsService";
import type { Payment } from "../../types/erp.types";
import { formatCurrency, formatDate } from "../../utils/format";

interface LabourLedgerMovement {
  balance: number;
  credit: number;
  date: string;
  debit: number;
  id: number | string;
  reference: string;
  type: "payment" | "wage";
}

interface LabourLedgerSummaryRow {
  date: string;
  id: number;
  movements: LabourLedgerMovement[];
  paidAmount: number;
  pendingAmount: number;
  period: string;
  site: string;
  status: "Paid" | "Partial" | "Pending";
  wageAmount: number;
}

function getPeriodLabel(payment: Payment) {
  if (payment.period_start && payment.period_end) {
    return payment.period_start === payment.period_end
      ? payment.period_start
      : `${payment.period_start} to ${payment.period_end}`;
  }

  return payment.date || "-";
}

function getStatus(
  paidAmount: number,
  pendingAmount: number,
): LabourLedgerSummaryRow["status"] {
  if (pendingAmount <= 0) {
    return "Paid";
  }

  if (paidAmount > 0) {
    return "Partial";
  }

  return "Pending";
}

function getStatusClassName(status: LabourLedgerSummaryRow["status"]) {
  if (status === "Paid") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300";
  }

  if (status === "Partial") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300";
  }

  return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300";
}

function buildMovements(payment: Payment) {
  const wageLabel = `Wage #${payment.id}`;
  const date = payment.date || payment.period_end || payment.period_start || "";
  const movements: LabourLedgerMovement[] = [
    {
      balance: payment.total_amount,
      credit: 0,
      date,
      debit: payment.total_amount,
      id: `wage-${payment.id}`,
      reference: wageLabel,
      type: "wage",
    },
  ];

  if (payment.paid_amount > 0) {
    movements.push({
      balance: payment.pending_amount,
      credit: payment.paid_amount,
      date,
      debit: 0,
      id: `payment-${payment.id}`,
      reference: `${wageLabel} payment`,
      type: "payment",
    });
  }

  return movements;
}

function buildSummaryRows(labourId: number, payments: Payment[]) {
  return payments
    .filter((payment) => payment.labour === labourId)
    .map((payment) => ({
      date: payment.date || payment.period_end || payment.period_start || "",
      id: payment.id,
      movements: buildMovements(payment),
      paidAmount: payment.paid_amount,
      pendingAmount: payment.pending_amount,
      period: getPeriodLabel(payment),
      site: payment.site_name || "All Sites",
      status: getStatus(payment.paid_amount, payment.pending_amount),
      wageAmount: payment.total_amount,
    }))
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
  row: LabourLedgerSummaryRow | null;
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
      title={row ? `${row.period} Movement` : "Labour Ledger Movement"}
    >
      {row ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4 dark:border-blue-900/70 dark:from-blue-950/30 dark:via-slate-950 dark:to-cyan-950/20">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600 dark:text-blue-300">
              Wage Summary
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Site</p>
                <p className="font-semibold text-slate-950 dark:text-slate-50">
                  {row.site}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Wage Amount</p>
                <p className="font-semibold text-slate-950 dark:text-slate-50">
                  {formatCurrency(row.wageAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Paid</p>
                <p className="font-semibold text-slate-950 dark:text-slate-50">
                  {formatCurrency(row.paidAmount)}
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
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Wage</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Paid</th>
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
                        {movement.type === "wage" ? "Wage Created" : "Payment Done"}
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
            Wage Created se labour ko dene wala amount badhta hai. Payment Done se pending amount kam hota hai.
          </p>
        </div>
      ) : null}
    </Modal>
  );
}

export function LabourLedgerPage() {
  const references = useReferenceData();
  const [selectedRow, setSelectedRow] =
    useState<LabourLedgerSummaryRow | null>(null);

  return (
    <>
      <LedgerStatementPage<LabourLedgerSummaryRow>
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
            key: "period",
            header: "Period",
            accessor: (row) => row.period,
            sortValue: (row) => row.period,
          },
          {
            key: "site",
            header: "Site",
            accessor: (row) => row.site,
            sortValue: (row) => row.site,
          },
          {
            key: "wageAmount",
            header: "Wage Amount",
            accessor: (row) => formatCurrency(row.wageAmount),
            sortValue: (row) => row.wageAmount,
          },
          {
            key: "paidAmount",
            header: "Paid Amount",
            accessor: (row) => formatCurrency(row.paidAmount),
            sortValue: (row) => row.paidAmount,
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
        description="View labour wage-wise balance with paid amount and pending amount. Use View for movement details."
        emptyDescription="Select a labour record and load the ledger to view wage-wise balance."
        entityLabel="Labour"
        entityOptions={references.labour.map((labour) => ({
          label: `${labour.name} (${labour.phone})`,
          value: labour.id,
        }))}
        getRowId={(row) => row.id}
        loadLedger={async (labourId) => {
          const [ledger, payments] = await Promise.all([
            labourReportsService.getPaymentLedger(labourId),
            paymentsService.getOptions(),
          ]);

          return {
            entries: buildSummaryRows(labourId, payments),
            name: ledger.labour,
            totals: {
              paidLabel: "Paid Amount",
              paidValue: ledger.totals.paid_amount,
              pendingLabel: "Pending Amount",
              pendingValue: ledger.totals.pending_amount,
              totalLabel: "Wage Amount",
              totalValue: ledger.totals.total_amount,
            },
          };
        }}
        referenceError={references.error}
        searchPlaceholder="Search labour ledger"
        title="Labour Ledger"
      />
      <MovementDetailsModal
        row={selectedRow}
        onClose={() => setSelectedRow(null)}
      />
    </>
  );
}
