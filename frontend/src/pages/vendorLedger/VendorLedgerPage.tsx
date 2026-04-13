import { useState } from "react";

import { LedgerStatementPage } from "../../components/ledger/LedgerStatementPage";
import { Modal } from "../../components/modal/Modal";
import { Button } from "../../components/ui/Button";
import { useReferenceData } from "../../hooks/useReferenceData";
import { reportsService } from "../../services/reportsService";
import { vendorPaymentsService } from "../../services/vendorPaymentsService";
import { vendorPurchasesService } from "../../services/vendorPurchasesService";
import type { Purchase, VendorPayment } from "../../types/erp.types";
import { formatCurrency, formatDate } from "../../utils/format";

interface VendorLedgerMovement {
  balance: number;
  credit: number;
  date: string;
  debit: number;
  description: string | null;
  id: number | string;
  reference: string;
  type: "payment" | "purchase";
}

interface VendorLedgerSummaryRow {
  billAmount: number;
  date: string;
  description: string | null;
  id: number;
  invoice: string;
  material: string;
  movements: VendorLedgerMovement[];
  paidAmount: number;
  pendingAmount: number;
  site: string;
  status: "Paid" | "Partial" | "Pending";
}

function getInvoiceLabel(purchase: Purchase) {
  return purchase.invoice_number || `Purchase #${purchase.id}`;
}

function getPaymentReference(payment: VendorPayment) {
  return payment.reference_number || `Payment #${payment.id}`;
}

function getStatus(paidAmount: number, pendingAmount: number): VendorLedgerSummaryRow["status"] {
  if (pendingAmount <= 0) {
    return "Paid";
  }

  if (paidAmount > 0) {
    return "Partial";
  }

  return "Pending";
}

function getStatusClassName(status: VendorLedgerSummaryRow["status"]) {
  if (status === "Paid") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300";
  }

  if (status === "Partial") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300";
  }

  return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300";
}

function buildPurchaseMovements(purchase: Purchase, payments: VendorPayment[]) {
  const movements: VendorLedgerMovement[] = [
    {
      balance: purchase.total_amount,
      credit: 0,
      date: purchase.date,
      debit: purchase.total_amount,
      description: purchase.description,
      id: `purchase-${purchase.id}`,
      reference: getInvoiceLabel(purchase),
      type: "purchase" as const,
    },
    ...payments
      .filter((payment) => payment.purchase === purchase.id)
      .map((payment) => ({
        balance: 0,
        credit: payment.amount,
        date: payment.date,
        debit: 0,
        description: payment.remarks,
        id: `payment-${payment.id}`,
        reference: getPaymentReference(payment),
        type: "payment" as const,
      })),
  ].sort((left, right) => {
    const dateCompare = left.date.localeCompare(right.date);

    if (dateCompare !== 0) {
      return dateCompare;
    }

    if (left.type !== right.type) {
      return left.type === "purchase" ? -1 : 1;
    }

    return String(left.id).localeCompare(String(right.id));
  });

  let runningBalance = 0;

  return movements.map((movement) => {
    runningBalance += movement.debit - movement.credit;

    return {
      ...movement,
      balance: runningBalance,
    };
  });
}

function buildSummaryRows(
  vendorId: number,
  purchases: Purchase[],
  payments: VendorPayment[],
) {
  return purchases
    .filter((purchase) => purchase.vendor === vendorId)
    .map((purchase) => {
      const purchasePayments = payments.filter((payment) => payment.purchase === purchase.id);
      const movements = buildPurchaseMovements(purchase, purchasePayments);

      return {
        billAmount: purchase.total_amount,
        date: purchase.date,
        description: purchase.description,
        id: purchase.id,
        invoice: getInvoiceLabel(purchase),
        material: purchase.material_name || "-",
        movements,
        paidAmount: purchase.paid_amount,
        pendingAmount: purchase.pending_amount,
        site: purchase.site_name,
        status: getStatus(purchase.paid_amount, purchase.pending_amount),
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
  row: VendorLedgerSummaryRow | null;
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
      title={row ? `${row.invoice} Movement` : "Vendor Ledger Movement"}
    >
      {row ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4 dark:border-blue-900/70 dark:from-blue-950/30 dark:via-slate-950 dark:to-cyan-950/20">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600 dark:text-blue-300">
              Invoice Summary
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Site</p>
                <p className="font-semibold text-slate-950 dark:text-slate-50">{row.site}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Material</p>
                <p className="font-semibold text-slate-950 dark:text-slate-50">{row.material}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Bill Amount</p>
                <p className="font-semibold text-slate-950 dark:text-slate-50">
                  {formatCurrency(row.billAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Pending</p>
                <p className="font-black text-amber-800 dark:text-amber-200">
                  {formatCurrency(row.pendingAmount)}
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-900/80">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Activity</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Reference</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Bill</th>
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
                        {movement.type === "purchase" ? "Bill Created" : "Payment Done"}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                        <span className="block max-w-[12rem] overflow-hidden text-ellipsis whitespace-nowrap" title={movement.reference}>
                          {movement.reference}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(movement.debit)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 font-bold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-100">
                          {formatCurrency(movement.credit)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 font-bold text-amber-900 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-100">
                          {formatCurrency(movement.balance)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
            Bill Created se pending balance badhta hai. Payment Done se wahi pending balance kam hota hai.
          </p>
        </div>
      ) : null}
    </Modal>
  );
}

export function VendorLedgerPage() {
  const references = useReferenceData();
  const [selectedRow, setSelectedRow] =
    useState<VendorLedgerSummaryRow | null>(null);

  return (
    <>
      <LedgerStatementPage<VendorLedgerSummaryRow>
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
            header: "Invoice",
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
            key: "material",
            header: "Material",
            accessor: (row) => row.material,
            sortValue: (row) => row.material,
          },
          {
            key: "billAmount",
            header: "Bill Amount",
            accessor: (row) => formatCurrency(row.billAmount),
            sortValue: (row) => row.billAmount,
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
        description="View invoice-wise vendor bill, paid amount, and pending balance. Use View for detailed purchase and payment movement."
        emptyDescription="Select a vendor and load the ledger to view invoice-wise vendor balance."
        entityLabel="Vendor"
        entityOptions={references.vendors.map((vendor) => ({
          label: `${vendor.name} (${vendor.phone})`,
          value: vendor.id,
        }))}
        getRowId={(row) => row.id}
        loadLedger={async (vendorId) => {
          const [ledger, purchases, payments] = await Promise.all([
            reportsService.getVendorLedger(vendorId),
            vendorPurchasesService.getOptions(),
            vendorPaymentsService.getOptions(),
          ]);

          return {
            entries: buildSummaryRows(vendorId, purchases, payments),
            name: ledger.vendor,
            totals: {
              paidLabel: "Paid Amount",
              paidValue: ledger.totals.paid_amount,
              pendingLabel: "Pending Amount",
              pendingValue: ledger.totals.pending_amount,
              totalLabel: "Purchase Amount",
              totalValue: ledger.totals.total_amount,
            },
          };
        }}
        referenceError={references.error}
        searchPlaceholder="Search vendor ledger"
        showLoadButton={false}
        showSearch={false}
        autoLoadOnSelect
        title="Vendor Ledger"
      />
      <MovementDetailsModal row={selectedRow} onClose={() => setSelectedRow(null)} />
    </>
  );
}
