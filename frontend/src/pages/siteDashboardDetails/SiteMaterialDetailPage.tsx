import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { ErrorMessage } from "../../components/common/ErrorMessage";
import { useToast } from "../../components/feedback/useToast";
import { DataTable } from "../../components/table/DataTable";
import { materialReceiptsService } from "../../services/materialReceiptsService";
import { materialUsageService, materialsService } from "../../services/materialsService";
import { siteDashboardService } from "../../services/sitesService";
import type {
  Material,
  MaterialUsage,
  Receipt,
  SiteDashboardMaterialSummary,
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

interface MaterialActivityRow {
  date: string;
  details: string;
  id: string;
  quantity: number;
  type: "Receipt" | "Usage";
  value: number | null;
}

export function SiteMaterialDetailPage() {
  const { materialId, siteId } = useParams();
  const { showError } = useToast();
  const parsedMaterialId = Number(materialId);
  const parsedSiteId = Number(siteId);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [material, setMaterial] = useState<Material | null>(null);
  const [siteName, setSiteName] = useState("");
  const [summary, setSummary] = useState<SiteDashboardMaterialSummary | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [usages, setUsages] = useState<MaterialUsage[]>([]);
  const [receiptPage, setReceiptPage] = useState(1);
  const [usagePage, setUsagePage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);

  useEffect(() => {
    async function loadDetails() {
      if (!parsedMaterialId || !parsedSiteId) {
        setError("Invalid material detail requested.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError("");
        const [dashboard, materials, allReceipts, allUsages] = await Promise.all([
          siteDashboardService.getDashboard(parsedSiteId),
          materialsService.getOptions(),
          materialReceiptsService.getOptions(),
          materialUsageService.getAll({ material: parsedMaterialId, site: parsedSiteId }),
        ]);

        setMaterial(materials.find((entry) => entry.id === parsedMaterialId) ?? null);
        setSiteName(dashboard.site.name);
        setSummary(
          dashboard.material_summary.find((entry) => entry.material__id === parsedMaterialId) ?? null,
        );
        setReceipts(
          allReceipts
            .filter((entry) => entry.site === parsedSiteId && entry.material === parsedMaterialId)
            .sort((left, right) => right.date.localeCompare(left.date)),
        );
        setUsages(allUsages.sort((left, right) => right.date.localeCompare(left.date)));
        setReceiptPage(1);
        setUsagePage(1);
        setActivityPage(1);
      } catch (loadError) {
        const message = getErrorMessage(loadError);
        setError(message);
        showError("Unable to load material detail", message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadDetails();
  }, [parsedMaterialId, parsedSiteId, showError]);

  const averageRate = useMemo(() => {
    if (!receipts.length) {
      return 0;
    }

    return receipts.reduce((total, entry) => total + entry.cost_per_unit, 0) / receipts.length;
  }, [receipts]);

  const activityRows = useMemo<MaterialActivityRow[]>(
    () =>
      [
        ...receipts.map((entry) => ({
          date: entry.date,
          details: entry.invoice_number || `Receipt #${entry.id}`,
          id: `receipt-${entry.id}`,
          quantity: entry.quantity_received,
          type: "Receipt" as const,
          value: entry.total_cost,
        })),
        ...usages.map((entry) => ({
          date: entry.date,
          details: entry.receipt_invoice_number || `Usage #${entry.id}`,
          id: `usage-${entry.id}`,
          quantity: entry.quantity,
          type: "Usage" as const,
          value: null,
        })),
      ].sort((left, right) => right.date.localeCompare(left.date)),
    [receipts, usages],
  );

  if (!parsedMaterialId || !parsedSiteId) {
    return <DetailEmptyState message="Invalid material detail requested." />;
  }

  return (
    <div className="space-y-6">
      <SiteDashboardDetailHeader
        description="Review site-specific material movement, stock position, receipts, usage, and cost history."
        siteId={parsedSiteId}
        siteName={siteName || `Site ${parsedSiteId}`}
        title={material?.name || summary?.material__name || "Material Detail"}
      />

      <ErrorMessage message={error} />

      {!material && !summary && !isLoading ? (
        <DetailEmptyState message="Material detail was not found for this site." />
      ) : (
        <>
          <DetailMetricGrid>
            <DetailMetricCard accentClassName="border-blue-100 bg-white" label="Total Received" value={formatNumber(summary?.total_received ?? receipts.reduce((total, entry) => total + entry.quantity_received, 0))} />
            <DetailMetricCard accentClassName="border-amber-200 bg-amber-50/70" label="Total Used" value={formatNumber(summary?.total_used ?? usages.reduce((total, entry) => total + entry.quantity, 0))} />
            <DetailMetricCard accentClassName="border-emerald-200 bg-emerald-50/70" label="Remaining Stock" value={formatNumber(summary?.remaining_stock ?? receipts.reduce((total, entry) => total + entry.remaining_stock, 0))} />
            <DetailMetricCard accentClassName="border-cyan-200 bg-cyan-50/70" label="Total Cost" value={formatCurrency(summary?.total_cost ?? receipts.reduce((total, entry) => total + entry.total_cost, 0))} />
          </DetailMetricGrid>

          <DetailSection description="Quick reference for the selected material in this site context." title="Overview">
            <DetailInfoGrid
              items={[
                { label: "Material Name", value: material?.name || summary?.material__name || "-" },
                { label: "Unit", value: material?.unit || receipts[0]?.material_unit || "-" },
                { label: "Site", value: siteName || `Site ${parsedSiteId}` },
                { label: "Receipt Entries", value: formatNumber(receipts.length) },
                { label: "Usage Entries", value: formatNumber(usages.length) },
                { label: "Average Rate", value: formatCurrency(averageRate) },
              ]}
            />
          </DetailSection>

          <DetailSection description="All receipt entries available for this material on the selected site." title="Receipts">
            <DataTable
              clientPagination
              columns={[
                { key: "date", header: "Date", accessor: (row) => formatDate(row.date), sortValue: (row) => row.date },
                { key: "invoice", header: "Invoice", accessor: (row) => row.invoice_number || "-", sortValue: (row) => row.invoice_number || "" },
                { key: "received", header: "Received Qty", accessor: (row) => row.quantity_received, sortValue: (row) => row.quantity_received },
                { key: "used", header: "Used Qty", accessor: (row) => row.quantity_used, sortValue: (row) => row.quantity_used },
                { key: "remaining", header: "Remaining", accessor: (row) => row.remaining_stock, sortValue: (row) => row.remaining_stock },
                { key: "cost", header: "Total Cost", accessor: (row) => row.total_cost, sortValue: (row) => row.total_cost },
              ]}
              data={receipts}
              emptyDescription="No receipt history is available for this material on this site."
              emptyTitle="No Receipts"
              isLoading={isLoading}
              keyExtractor={(row) => row.id}
              page={receiptPage}
              searchValue=""
              totalCount={receipts.length}
              onPageChange={setReceiptPage}
              onSearchChange={() => undefined}
            />
          </DetailSection>

          <DetailSection description="Material usage entries captured for this site and material." title="Usage">
            <DataTable
              clientPagination
              columns={[
                { key: "date", header: "Date", accessor: (row) => formatDate(row.date), sortValue: (row) => row.date },
                { key: "receipt", header: "Receipt Ref", accessor: (row) => row.receipt_invoice_number || `Receipt #${row.receipt}`, sortValue: (row) => row.receipt_invoice_number || row.receipt },
                { key: "quantity", header: "Used Qty", accessor: (row) => row.quantity, sortValue: (row) => row.quantity },
                { key: "notes", header: "Notes", accessor: (row) => row.notes || "-", sortValue: (row) => row.notes || "" },
              ]}
              data={usages}
              emptyDescription="No usage entries are available for this material on this site."
              emptyTitle="No Usage"
              isLoading={isLoading}
              keyExtractor={(row) => row.id}
              page={usagePage}
              searchValue=""
              totalCount={usages.length}
              onPageChange={setUsagePage}
              onSearchChange={() => undefined}
            />
          </DetailSection>

          <DetailSection description="Combined receipt and usage activity for quick review." title="Activity Timeline">
            <DataTable
              clientPagination
              columns={[
                { key: "date", header: "Date", accessor: (row) => formatDate(row.date), sortValue: (row) => row.date },
                { key: "type", header: "Activity", accessor: (row) => row.type, sortValue: (row) => row.type },
                { key: "details", header: "Reference", accessor: (row) => row.details, sortValue: (row) => row.details },
                { key: "quantity", header: "Quantity", accessor: (row) => row.quantity, sortValue: (row) => row.quantity },
                { key: "value", header: "Amount", accessor: (row) => (row.value === null ? "-" : formatCurrency(row.value)), sortValue: (row) => row.value ?? -1 },
              ]}
              data={activityRows}
              emptyDescription="No material activity is available for this site and material."
              emptyTitle="No Activity"
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
