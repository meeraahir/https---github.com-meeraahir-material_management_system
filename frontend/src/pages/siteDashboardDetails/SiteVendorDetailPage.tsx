import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { ErrorMessage } from "../../components/common/ErrorMessage";
import { useToast } from "../../components/feedback/useToast";
import { DataTable } from "../../components/table/DataTable";
import { reportsService } from "../../services/reportsService";
import { siteDashboardService } from "../../services/sitesService";
import { vendorPaymentsService } from "../../services/vendorPaymentsService";
import { vendorPurchasesService } from "../../services/vendorPurchasesService";
import { vendorsService } from "../../services/vendorsService";
import type {
  Purchase,
  SiteDashboardVendorSummary,
  Vendor,
  VendorLedgerEntry,
  VendorPayment,
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

interface VendorActivityRow {
  amount: number;
  date: string;
  id: string;
  reference: string;
  type: "Payment" | "Purchase";
}

export function SiteVendorDetailPage() {
  const { siteId, vendorId } = useParams();
  const { showError } = useToast();
  const parsedSiteId = Number(siteId);
  const parsedVendorId = Number(vendorId);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [siteName, setSiteName] = useState("");
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [summary, setSummary] = useState<SiteDashboardVendorSummary | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<VendorPayment[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<VendorLedgerEntry[]>([]);
  const [purchasePage, setPurchasePage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);

  useEffect(() => {
    async function loadDetails() {
      if (!parsedSiteId || !parsedVendorId) {
        setError("Invalid vendor detail requested.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError("");
        const [dashboard, vendors, allPurchases, allPayments, ledger] = await Promise.all([
          siteDashboardService.getDashboard(parsedSiteId),
          vendorsService.getOptions(),
          vendorPurchasesService.getOptions(),
          vendorPaymentsService.getOptions(),
          reportsService.getVendorLedger(parsedVendorId),
        ]);

        setSiteName(dashboard.site.name);
        setVendor(vendors.find((entry) => entry.id === parsedVendorId) ?? null);
        setSummary(
          dashboard.vendor_summary.find((entry) => entry.vendor_id === parsedVendorId) ?? null,
        );
        setPurchases(
          allPurchases
            .filter((entry) => entry.site === parsedSiteId && entry.vendor === parsedVendorId)
            .sort((left, right) => right.date.localeCompare(left.date)),
        );
        setPayments(
          allPayments
            .filter((entry) => entry.site === parsedSiteId && entry.vendor === parsedVendorId)
            .sort((left, right) => right.date.localeCompare(left.date)),
        );
        setLedgerEntries(
          [...ledger.transactions].sort((left, right) => right.date.localeCompare(left.date)),
        );
        setPurchasePage(1);
        setPaymentPage(1);
        setLedgerPage(1);
        setActivityPage(1);
      } catch (loadError) {
        const message = getErrorMessage(loadError);
        setError(message);
        showError("Unable to load vendor detail", message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadDetails();
  }, [parsedSiteId, parsedVendorId, showError]);

  const activityRows = useMemo<VendorActivityRow[]>(
    () =>
      [
        ...purchases.map((entry) => ({
          amount: entry.total_amount,
          date: entry.date,
          id: `purchase-${entry.id}`,
          reference: `Purchase #${entry.id}`,
          type: "Purchase" as const,
        })),
        ...payments.map((entry) => ({
          amount: entry.amount,
          date: entry.date,
          id: `payment-${entry.id}`,
          reference: entry.reference_number || `Payment #${entry.id}`,
          type: "Payment" as const,
        })),
      ].sort((left, right) => right.date.localeCompare(left.date)),
    [payments, purchases],
  );

  const purchaseTotal =
    summary?.total_amount ?? purchases.reduce((total, entry) => total + entry.total_amount, 0);
  const paidTotal =
    summary?.paid_amount ?? payments.reduce((total, entry) => total + entry.amount, 0);
  const pendingTotal =
    summary?.pending_amount ?? purchases.reduce((total, entry) => total + entry.pending_amount, 0);

  if (!parsedSiteId || !parsedVendorId) {
    return <DetailEmptyState message="Invalid vendor detail requested." />;
  }

  return (
    <div className="space-y-6">
      <SiteDashboardDetailHeader
        description="Review vendor profile, site purchases, payment log, and overall ledger activity."
        siteId={parsedSiteId}
        siteName={siteName || `Site ${parsedSiteId}`}
        title={vendor?.name || summary?.vendor_name || "Vendor Detail"}
      />

      <ErrorMessage message={error} />

      {!vendor && !summary && !isLoading ? (
        <DetailEmptyState message="Vendor detail was not found for this site." />
      ) : (
        <>
          <DetailMetricGrid>
            <DetailMetricCard accentClassName="border-blue-100 bg-white" label="Site Purchases" value={formatCurrency(purchaseTotal)} />
            <DetailMetricCard accentClassName="border-emerald-200 bg-emerald-50/70" label="Paid Amount" value={formatCurrency(paidTotal)} />
            <DetailMetricCard accentClassName="border-amber-200 bg-amber-50/70" label="Pending Amount" value={formatCurrency(pendingTotal)} />
            <DetailMetricCard accentClassName="border-cyan-200 bg-cyan-50/70" label="Payment Entries" value={formatNumber(payments.length)} />
          </DetailMetricGrid>

          <DetailSection description="Vendor master information available in the current frontend data flow." title="Overview">
            <DetailInfoGrid
              items={[
                { label: "Vendor Name", value: vendor?.name || summary?.vendor_name || "-" },
                { label: "Phone", value: vendor?.phone || "-" },
                { label: "Email", value: vendor?.email || "-" },
                { label: "Address", value: vendor?.address || "-" },
                { label: "Bank", value: vendor?.bank_name || "-" },
                { label: "Tax Identifier", value: vendor?.tax_identifier || "-" },
              ]}
            />
          </DetailSection>

          <DetailSection description="Purchase history recorded for this vendor within the selected site." title="Purchases">
            <DataTable
              clientPagination
              columns={[
                { key: "date", header: "Date", accessor: (row) => formatDate(row.date), sortValue: (row) => row.date },
                { key: "material", header: "Material", accessor: (row) => row.material_name || "-", sortValue: (row) => row.material_name || "" },
                { key: "total", header: "Total Amount", accessor: (row) => row.total_amount, sortValue: (row) => row.total_amount },
                { key: "paid", header: "Paid", accessor: (row) => row.paid_amount, sortValue: (row) => row.paid_amount },
                { key: "pending", header: "Pending", accessor: (row) => row.pending_amount, sortValue: (row) => row.pending_amount },
              ]}
              data={purchases}
              emptyDescription="No purchase history is available for this vendor on this site."
              emptyTitle="No Purchases"
              isLoading={isLoading}
              keyExtractor={(row) => row.id}
              page={purchasePage}
              searchValue=""
              totalCount={purchases.length}
              onPageChange={setPurchasePage}
              onSearchChange={() => undefined}
            />
          </DetailSection>

          <DetailSection description="Payments made to this vendor for the selected site." title="Payments">
            <DataTable
              clientPagination
              columns={[
                { key: "date", header: "Date", accessor: (row) => formatDate(row.date), sortValue: (row) => row.date },
                { key: "purchase", header: "Purchase Ref", accessor: (row) => `Purchase #${row.purchase}`, sortValue: (row) => row.purchase },
                { key: "amount", header: "Amount", accessor: (row) => row.amount, sortValue: (row) => row.amount },
                { key: "reference", header: "Reference", accessor: (row) => row.reference_number || "-", sortValue: (row) => row.reference_number || "" },
                { key: "remarks", header: "Remarks", accessor: (row) => row.remarks || "-", sortValue: (row) => row.remarks || "" },
              ]}
              data={payments}
              emptyDescription="No payment log is available for this vendor on this site."
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

          <DetailSection description="Ledger-style view from the existing vendor ledger endpoint for complete vendor activity." title="Ledger">
            <DataTable
              clientPagination
              columns={[
                { key: "date", header: "Date", accessor: (row) => formatDate(row.date), sortValue: (row) => row.date },
                { key: "entry_type", header: "Activity", accessor: (row) => row.entry_type, sortValue: (row) => row.entry_type },
                { key: "reference", header: "Reference", accessor: (row) => row.reference, sortValue: (row) => row.reference },
                { key: "site", header: "Site", accessor: (row) => row.site, sortValue: (row) => row.site },
                { key: "debit", header: "Purchase", accessor: (row) => row.debit, sortValue: (row) => row.debit },
                { key: "credit", header: "Payment", accessor: (row) => row.credit, sortValue: (row) => row.credit },
                { key: "balance", header: "Balance", accessor: (row) => row.balance, sortValue: (row) => row.balance },
              ]}
              data={ledgerEntries}
              emptyDescription="No ledger activity is available for this vendor."
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

          <DetailSection description="Combined recent site-specific purchase and payment activity." title="Recent Activity">
            <DataTable
              clientPagination
              columns={[
                { key: "date", header: "Date", accessor: (row) => formatDate(row.date), sortValue: (row) => row.date },
                { key: "type", header: "Activity", accessor: (row) => row.type, sortValue: (row) => row.type },
                { key: "reference", header: "Reference", accessor: (row) => row.reference, sortValue: (row) => row.reference },
                { key: "amount", header: "Amount", accessor: (row) => row.amount, sortValue: (row) => row.amount },
              ]}
              data={activityRows}
              emptyDescription="No recent activity is available for this vendor on this site."
              emptyTitle="No Recent Activity"
              isLoading={isLoading}
              keyExtractor={(row) => row.id}
              page={activityPage}
              searchValue=""
              totalCount={activityRows.length}
              onPageChange={setActivityPage}
              onSearchChange={() => undefined}
            />
          </DetailSection>
        </>
      )}
    </div>
  );
}
