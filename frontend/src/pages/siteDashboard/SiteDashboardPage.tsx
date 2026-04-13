import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { z } from "zod";

import { useToast } from "../../components/feedback/useToast";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { EntityFormModal } from "../../components/forms/EntityFormModal";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatCard } from "../../components/layout/StatCard";
import { DataTable } from "../../components/table/DataTable";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { icons } from "../../assets/icons";
import { useReferenceData } from "../../hooks/useReferenceData";
import { attendanceService } from "../../services/attendanceService";
import { receivablesService } from "../../services/receivablesService";
import { siteDashboardService } from "../../services/sitesService";
import { vendorPurchasesService } from "../../services/vendorPurchasesService";
import type {
  AttendanceFormValues,
  PurchaseFormValues,
  ReceivableFormValues,
  SiteDashboardData,
  SiteDashboardFinanceSummary,
  SiteDashboardLabourSummary,
  SiteDashboardMaterialSummary,
  SiteDashboardVendorSummary,
} from "../../types/erp.types";
import { getErrorMessage } from "../../utils/apiError";
import { formatCurrency } from "../../utils/format";
import { SiteMaterialReceiptModal } from "./SiteDashboardEntryModals";

const siteDashboardToday = new Date().toISOString().slice(0, 10);

const purchaseSchema = z
  .object({
    date: z.string().min(1, "Date is required."),
    description: z.string().max(300, "Description must be 300 characters or fewer."),
    invoice_number: z.string().max(60, "Invoice number must be 60 characters or fewer."),
    material: z.number().min(0, "Material is invalid."),
    paid_amount: z.number().min(0, "Paid amount must be zero or more."),
    site: z.number().min(1, "Site is required."),
    total_amount: z.number().gt(0, "Total amount must be greater than zero."),
    vendor: z.number().min(1, "Vendor is required."),
  })
  .refine((value) => value.paid_amount <= value.total_amount, {
    message: "Paid amount cannot exceed total amount.",
    path: ["paid_amount"],
  });

const receivableSchema = z
  .object({
    amount: z.number().gt(0, "Amount must be greater than zero."),
    date: z.string().min(1, "Invoice date is required."),
    party: z.number().min(1, "Party is required."),
    received_amount: z.number().min(0, "Received amount must be zero or more.").optional(),
    site: z.number().min(1, "Site is required."),
  })
  .superRefine((value, context) => {
    if ((value.received_amount ?? 0) > value.amount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Received amount cannot exceed invoice amount.",
        path: ["received_amount"],
      });
    }
  });

const attendanceSchema = z.object({
  date: z
    .string()
    .min(1, "Date is required.")
    .refine((value) => value <= siteDashboardToday, "Future dates are not allowed."),
  labour: z.number().min(1, "Labour is required."),
  present: z.boolean(),
  site: z.number().min(1, "Site is required."),
});

function AddSectionButton({
  ariaLabel,
  onClick,
}: {
  ariaLabel: string;
  onClick: () => void;
}) {
  return (
    <Button
      aria-label={ariaLabel}
      className="h-9 w-9 rounded-xl px-0"
      onClick={onClick}
      size="sm"
      title={ariaLabel}
      type="button"
      variant="secondary"
    >
      {icons.plus({ className: "h-4 w-4" })}
    </Button>
  );
}

export function SiteDashboardPage() {
  const { siteId } = useParams();
  const { showError, showSuccess } = useToast();
  const references = useReferenceData();
  const parsedSiteId = Number(siteId);
  const [data, setData] = useState<SiteDashboardData | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [error, setError] = useState("");
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<"" | "excel" | "pdf">("");
  const [isLoading, setIsLoading] = useState(true);
  const [isMaterialReceiptModalOpen, setIsMaterialReceiptModalOpen] = useState(false);
  const [isReceivableModalOpen, setIsReceivableModalOpen] = useState(false);
  const [isVendorPurchaseModalOpen, setIsVendorPurchaseModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [materials, setMaterials] = useState(references.materials);

  useEffect(() => {
    setMaterials(references.materials);
  }, [references.materials]);

  useEffect(() => {
    async function loadDashboard() {
      if (!parsedSiteId) {
        setError("Invalid site selected.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError("");
        const response = await siteDashboardService.getDashboard(parsedSiteId, {
          dateFrom,
          dateTo,
        });
        setData(response);
      } catch (loadError) {
        const message = getErrorMessage(loadError);
        setError(message);
        showError("Unable to load site dashboard", message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadDashboard();
  }, [dateFrom, dateTo, parsedSiteId, refreshKey, showError]);

  const totals = useMemo(() => {
    if (!data) {
      return {
        financePending: 0,
        labourPending: 0,
        materialCost: 0,
        vendorPending: 0,
      };
    }

    return {
      financePending: data.finance_summary.reduce(
        (total, row) => total + row.pending_amount,
        0,
      ),
      labourPending: data.labour_summary.reduce(
        (total, row) => total + row.pending_amount,
        0,
      ),
      materialCost: data.material_summary.reduce(
        (total, row) => total + row.total_cost,
        0,
      ),
      vendorPending: data.vendor_summary.reduce(
        (total, row) => total + row.pending_amount,
        0,
      ),
    };
  }, [data]);

  const site = data?.site ?? {
    description: "",
    id: parsedSiteId || 0,
    location: "-",
    name: "Selected Site",
  };
  const materialSummary = data?.material_summary ?? [];
  const vendorSummary = data?.vendor_summary ?? [];
  const labourSummary = data?.labour_summary ?? [];
  const financeSummary = data?.finance_summary ?? [];
  const siteOption = useMemo(
    () => [{ label: site.name, value: site.id }],
    [site.id, site.name],
  );

  async function handleExport(format: "excel" | "pdf") {
    if (!parsedSiteId) {
      return;
    }

    try {
      setIsExporting(format);
      await siteDashboardService.exportDashboard(parsedSiteId, format, {
        dateFrom,
        dateTo,
      });
    } catch (exportError) {
      showError("Unable to export site dashboard", getErrorMessage(exportError));
    } finally {
      setIsExporting("");
    }
  }

  function refreshDashboardData() {
    setRefreshKey((currentValue) => currentValue + 1);
  }

  function addMaterialOption(material: (typeof materials)[number]) {
    setMaterials((currentValue) => {
      if (currentValue.some((item) => item.id === material.id)) {
        return currentValue;
      }

      return [...currentValue, material];
    });
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
        description="Review site activity and add new entries from one workspace."
        search={
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Date From"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
            <Input
              label="Date To"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </div>
        }
        title={`Site Dashboard${site.name ? ` - ${site.name}` : ""}`}
      />

      <ErrorMessage message={references.error || error} />

      {data ? (
        <>
          <section className="rounded-[2rem] border border-blue-100 bg-white/95 p-5 shadow-md shadow-blue-950/5 dark:border-blue-100 dark:bg-white/95">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">
                  Site Overview
                </p>
                <h2 className="mt-2 text-3xl font-black text-slate-950">
                  {site.name}
                </h2>
                <p className="mt-2 text-sm font-medium text-slate-600">
                  {site.location}
                </p>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
                  {site.description || "No site description provided."}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                  <StatCard
                    label="Material Cost"
                    value={formatCurrency(totals.materialCost)}
                  />
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                  <StatCard
                    label="Vendor Pending"
                    value={formatCurrency(totals.vendorPending)}
                  />
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <StatCard
                    label="Labour Pending"
                    value={formatCurrency(totals.labourPending)}
                  />
                </div>
                <div className="rounded-2xl border border-cyan-200 bg-cyan-50/70 p-4">
                  <StatCard
                    label="Finance Pending"
                    value={formatCurrency(totals.financePending)}
                  />
                </div>
              </div>
            </div>
          </section>

          <div className="space-y-5">
            <DataTable<SiteDashboardMaterialSummary>
              columns={[
                {
                  key: "material",
                  header: "Material",
                  accessor: (row) => row.material__name,
                  sortValue: (row) => row.material__name,
                },
                {
                  key: "received",
                  header: "Received",
                  accessor: (row) => row.total_received,
                  sortValue: (row) => row.total_received,
                },
                {
                  key: "used",
                  header: "Used",
                  accessor: (row) => row.total_used,
                  sortValue: (row) => row.total_used,
                },
                {
                  key: "remaining",
                  header: "Remaining",
                  accessor: (row) => row.remaining_stock,
                  sortValue: (row) => row.remaining_stock,
                },
                {
                  key: "cost",
                  header: "Total Cost",
                  accessor: (row) => row.total_cost,
                  sortValue: (row) => row.total_cost,
                },
              ]}
              data={materialSummary}
              emptyDescription="No material summary is available for this site."
              emptyTitle="No Materials"
              headerActions={
                <AddSectionButton
                  ariaLabel="Add Material Receipt"
                  onClick={() => setIsMaterialReceiptModalOpen(true)}
                />
              }
              headerTitle="Materials"
              hidePagination
              isLoading={isLoading}
              keyExtractor={(row) => row.material__id}
              page={1}
              searchValue=""
              totalCount={materialSummary.length}
              onPageChange={() => undefined}
              onSearchChange={() => undefined}
            />

            <DataTable<SiteDashboardVendorSummary>
              columns={[
                {
                  key: "vendor",
                  header: "Vendor",
                  accessor: (row) => row.vendor_name,
                  sortValue: (row) => row.vendor_name,
                },
                {
                  key: "total",
                  header: "Total Amount",
                  accessor: (row) => row.total_amount,
                  sortValue: (row) => row.total_amount,
                },
                {
                  key: "paid",
                  header: "Paid Amount",
                  accessor: (row) => row.paid_amount,
                  sortValue: (row) => row.paid_amount,
                },
                {
                  key: "pending",
                  header: "Pending Amount",
                  accessor: (row) => row.pending_amount,
                  sortValue: (row) => row.pending_amount,
                },
              ]}
              data={vendorSummary}
              emptyDescription="No vendor purchase data is available for this site."
              emptyTitle="No Vendors"
              headerActions={
                <AddSectionButton
                  ariaLabel="Add Vendor Entry"
                  onClick={() => setIsVendorPurchaseModalOpen(true)}
                />
              }
              headerTitle="Vendors"
              hidePagination
              isLoading={isLoading}
              keyExtractor={(row) => row.vendor_id}
              page={1}
              searchValue=""
              totalCount={vendorSummary.length}
              onPageChange={() => undefined}
              onSearchChange={() => undefined}
            />

            <DataTable<SiteDashboardFinanceSummary>
              columns={[
                {
                  key: "party",
                  header: "Party",
                  accessor: (row) => row.party__name,
                  sortValue: (row) => row.party__name,
                },
                {
                  key: "total",
                  header: "Total Amount",
                  accessor: (row) => row.total_amount,
                  sortValue: (row) => row.total_amount,
                },
                {
                  key: "received",
                  header: "Received Amount",
                  accessor: (row) => row.received_amount,
                  sortValue: (row) => row.received_amount,
                },
                {
                  key: "pending",
                  header: "Pending Amount",
                  accessor: (row) => row.pending_amount,
                  sortValue: (row) => row.pending_amount,
                },
              ]}
              data={financeSummary}
              emptyDescription="No finance summary is available for this site."
              emptyTitle="No Finance Data"
              headerActions={
                <AddSectionButton
                  ariaLabel="Add Party Entry"
                  onClick={() => setIsReceivableModalOpen(true)}
                />
              }
              headerTitle="Parties / Finance"
              hidePagination
              isLoading={isLoading}
              keyExtractor={(row) => row.party__id}
              page={1}
              searchValue=""
              totalCount={financeSummary.length}
              onPageChange={() => undefined}
              onSearchChange={() => undefined}
            />

            <DataTable<SiteDashboardLabourSummary>
              columns={[
                {
                  key: "labour",
                  header: "Labour",
                  accessor: (row) => row.labour_name,
                  sortValue: (row) => row.labour_name,
                },
                {
                  key: "present",
                  header: "Present",
                  accessor: (row) => row.present_count,
                  sortValue: (row) => row.present_count,
                },
                {
                  key: "absent",
                  header: "Absent",
                  accessor: (row) => row.absent_count,
                  sortValue: (row) => row.absent_count,
                },
                {
                  key: "wage",
                  header: "Total Wage",
                  accessor: (row) => row.total_wage,
                  sortValue: (row) => row.total_wage,
                },
                {
                  key: "pending",
                  header: "Pending Amount",
                  accessor: (row) => row.pending_amount,
                  sortValue: (row) => row.pending_amount,
                },
              ]}
              data={labourSummary}
              emptyDescription="No labour summary is available for this site."
              emptyTitle="No Labour"
              headerActions={
                <AddSectionButton
                  ariaLabel="Add Labour Entry"
                  onClick={() => setIsAttendanceModalOpen(true)}
                />
              }
              headerTitle="Labour"
              hidePagination
              isLoading={isLoading}
              keyExtractor={(row) => row.labour_id}
              page={1}
              searchValue=""
              totalCount={labourSummary.length}
              onPageChange={() => undefined}
              onSearchChange={() => undefined}
            />
          </div>
        </>
      ) : (
        <section className="rounded-[2rem] border border-blue-100 bg-white/95 p-6 text-sm font-medium text-slate-600 shadow-md shadow-blue-950/5 dark:border-blue-100 dark:bg-white/95">
          {isLoading ? "Loading site dashboard..." : "Select a valid site to load dashboard data."}
        </section>
      )}

      <SiteMaterialReceiptModal
        materials={materials}
        onClose={() => setIsMaterialReceiptModalOpen(false)}
        onMaterialAdded={addMaterialOption}
        onSaved={refreshDashboardData}
        open={isMaterialReceiptModalOpen}
        siteId={site.id}
        siteName={site.name}
      />

      <EntityFormModal<PurchaseFormValues>
        defaultValues={{
          date: siteDashboardToday,
          description: "",
          invoice_number: "",
          material: 0,
          paid_amount: 0,
          site: site.id,
          total_amount: 0,
          vendor: 0,
        }}
        description="Create or update vendor purchases."
        fields={[
          {
            kind: "select",
            label: "Vendor",
            name: "vendor",
            options: references.vendors.map((vendor) => ({
              label: vendor.name,
              value: vendor.id,
            })),
            required: true,
            valueType: "number",
          },
          {
            clearable: false,
            kind: "select",
            label: "Site",
            name: "site",
            options: siteOption,
            required: true,
            valueType: "number",
          },
          {
            kind: "select",
            label: "Material",
            name: "material",
            options: materials.map((material) => ({
              label: material.name,
              value: material.id,
            })),
            valueType: "number",
          },
          { kind: "date", label: "Date", name: "date", required: true },
          {
            kind: "text",
            label: "Invoice Number",
            maxLength: 60,
            name: "invoice_number",
            placeholder: "Invoice reference",
          },
          {
            kind: "textarea",
            label: "Description",
            name: "description",
            placeholder: "Purchase notes",
            rows: 4,
          },
          {
            kind: "number",
            label: "Total Amount",
            min: 0,
            name: "total_amount",
            required: true,
            valueType: "number",
          },
          {
            kind: "number",
            label: "Initial Paid Amount",
            min: 0,
            name: "paid_amount",
            required: true,
            valueType: "number",
          },
        ]}
        onClose={() => setIsVendorPurchaseModalOpen(false)}
        onSubmit={async (values) => {
          await vendorPurchasesService.create(values);
          setIsVendorPurchaseModalOpen(false);
          refreshDashboardData();
          showSuccess("Vendor entry added", "Vendor purchase has been created for this site.");
        }}
        open={isVendorPurchaseModalOpen}
        schema={purchaseSchema}
        title="Add Vendor Entry"
      />

      <EntityFormModal<ReceivableFormValues>
        defaultValues={{
          amount: 0,
          date: siteDashboardToday,
          party: 0,
          received_amount: 0,
          site: site.id,
        }}
        description="Create or update receivables."
        fields={[
          {
            kind: "select",
            label: "Party",
            name: "party",
            options: references.parties.map((party) => ({
              label: party.name,
              value: party.id,
            })),
            required: true,
            valueType: "number",
          },
          {
            clearable: false,
            kind: "select",
            label: "Site",
            name: "site",
            options: siteOption,
            required: true,
            valueType: "number",
          },
          {
            kind: "number",
            label: "Amount",
            min: 0,
            name: "amount",
            required: true,
            valueType: "number",
          },
          { kind: "date", label: "Invoice Date", name: "date", required: true },
          {
            kind: "number",
            label: "Received Amount",
            min: 0,
            name: "received_amount",
            required: true,
            valueType: "number",
          },
        ]}
        onClose={() => setIsReceivableModalOpen(false)}
        onSubmit={async (values) => {
          await receivablesService.create(values);
          setIsReceivableModalOpen(false);
          refreshDashboardData();
          showSuccess("Party entry added", "Receivable has been created for this site.");
        }}
        open={isReceivableModalOpen}
        schema={receivableSchema}
        title="Add Party Entry"
      />

      <EntityFormModal<AttendanceFormValues>
        defaultValues={{
          date: siteDashboardToday,
          labour: 0,
          present: true,
          site: site.id,
        }}
        description="Create or update labour attendance."
        fields={[
          {
            kind: "select",
            label: "Labour",
            name: "labour",
            options: references.labour.map((labour) => ({
              label: labour.name,
              value: labour.id,
            })),
            required: true,
            valueType: "number",
          },
          {
            clearable: false,
            kind: "select",
            label: "Site",
            name: "site",
            options: siteOption,
            required: true,
            valueType: "number",
          },
          {
            kind: "date",
            label: "Date",
            max: siteDashboardToday,
            name: "date",
            required: true,
          },
          { kind: "checkbox", label: "Present", name: "present" },
        ]}
        onClose={() => setIsAttendanceModalOpen(false)}
        onSubmit={async (values) => {
          await attendanceService.create(values);
          setIsAttendanceModalOpen(false);
          refreshDashboardData();
          showSuccess("Labour entry added", "Attendance record has been created for this site.");
        }}
        open={isAttendanceModalOpen}
        schema={attendanceSchema}
        title="Add Labour Entry"
      />
    </div>
  );
}
