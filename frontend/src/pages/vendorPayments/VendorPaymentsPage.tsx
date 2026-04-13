import { useEffect, useState } from "react";
import { z } from "zod";

import { useToast } from "../../components/feedback/useToast";
import { CrudModulePage } from "../../components/forms/CrudModulePage";
import { useAuth } from "../../hooks/useAuth";
import { vendorPaymentsService } from "../../services/vendorPaymentsService";
import { vendorPurchasesService } from "../../services/vendorPurchasesService";
import type {
  Purchase,
  VendorPayment,
  VendorPaymentFormValues,
} from "../../types/erp.types";
import { getErrorMessage } from "../../utils/apiError";
import { formatNumber } from "../../utils/format";
import { getCrudPermissions } from "../../utils/permissions";

const vendorPaymentSchema = z.object({
  amount: z.number().gt(0, "Payment amount must be greater than zero."),
  date: z.string().min(1, "Payment date is required."),
  purchase: z.number().min(1, "Purchase is required."),
  reference_number: z
    .string()
    .max(50, "Reference number must be 50 characters or fewer."),
  remarks: z
    .string()
    .max(600, "Remarks must be 600 characters or fewer."),
});

function getPurchaseLabel(purchase: Purchase) {
  const reference = purchase.invoice_number || `Purchase #${purchase.id}`;
  const material = purchase.material_name ? ` | ${purchase.material_name}` : "";
  return `${purchase.vendor_name} | ${reference}${material} | Pending ${formatNumber(purchase.pending_amount)}`;
}

export function VendorPaymentsPage() {
  const { user } = useAuth();
  const { showError } = useToast();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchaseError, setPurchaseError] = useState("");
  const permissions = getCrudPermissions(user);

  useEffect(() => {
    async function loadPurchases() {
      try {
        setPurchaseError("");
        setPurchases(await vendorPurchasesService.getOptions());
      } catch (error) {
        const message = getErrorMessage(error);
        setPurchaseError(message);
        showError("Unable to load vendor purchases", message);
      }
    }

    void loadPurchases();
  }, [showError]);

  return (
    <CrudModulePage<VendorPayment, VendorPaymentFormValues>
      canCreate={permissions.canCreate}
      canDelete={permissions.canDelete}
      canEdit={permissions.canEdit}
      columns={[
        {
          key: "purchase",
          header: "Purchase",
          accessor: (row) => row.purchase_invoice_number || `Purchase #${row.purchase}`,
          sortValue: (row) => row.purchase_invoice_number || row.purchase,
        },
        { key: "vendor", header: "Vendor", accessor: (row) => row.vendor_name, sortValue: (row) => row.vendor_name },
        { key: "site", header: "Site", accessor: (row) => row.site_name, sortValue: (row) => row.site_name },
        { key: "amount", header: "Amount", accessor: (row) => row.amount, sortValue: (row) => row.amount },
        { key: "date", header: "Date", accessor: (row) => row.date, sortValue: (row) => row.date },
        {
          key: "reference",
          header: "Reference",
          accessor: (row) => row.reference_number || "-",
          sortValue: (row) => row.reference_number || "",
        },
        {
          key: "pending",
          header: "Pending After Payment",
          accessor: (row) => row.pending_after_payment ?? row.purchase_pending_amount,
          sortValue: (row) => row.pending_after_payment ?? row.purchase_pending_amount,
        },
      ]}
      createLabel="Record Vendor Payment"
      defaultValues={{
        amount: 0,
        date: new Date().toISOString().slice(0, 10),
        purchase: 0,
        reference_number: "",
        remarks: "",
      }}
      description="Record vendor payments against existing purchase invoices and keep purchase pending balances in sync."
      emptyDescription="No vendor payments have been recorded."
      emptyTitle="No vendor payments found"
      externalError={purchaseError}
      fields={[
        {
          kind: "select",
          label: "Purchase Invoice",
          name: "purchase",
          options: purchases.map((purchase) => ({
            label: getPurchaseLabel(purchase),
            value: purchase.id,
          })),
          required: true,
          valueType: "number",
          wrapperClassName: "md:col-span-2",
        },
        {
          kind: "number",
          label: "Payment Amount",
          min: 0,
          name: "amount",
          required: true,
          valueType: "number",
        },
        { kind: "date", label: "Payment Date", name: "date", required: true },
        {
          kind: "text",
          label: "Reference Number",
          maxLength: 50,
          name: "reference_number",
          placeholder: "Invoice, UTR, cheque, or cash reference",
          wrapperClassName: "md:col-span-2",
        },
        {
          kind: "textarea",
          label: "Remarks",
          name: "remarks",
          placeholder: "Optional payment remarks",
          rows: 4,
          wrapperClassName: "md:col-span-2",
        },
      ]}
      getEditValues={(entity) => ({
        amount: entity.amount,
        date: entity.date,
        purchase: entity.purchase,
        reference_number: entity.reference_number || "",
        remarks: entity.remarks || "",
      })}
      getId={(entity) => entity.id}
      schema={vendorPaymentSchema}
      searchPlaceholder="Search vendor payments"
      service={vendorPaymentsService}
      title="Vendor Payments"
      viewFields={[
        { label: "Record ID", value: (row) => row.id, highlight: true },
        { label: "Purchase Invoice", value: (row) => row.purchase_invoice_number || `Purchase #${row.purchase}`, highlight: true },
        { label: "Vendor", value: (row) => row.vendor_name, highlight: true },
        { label: "Site", value: (row) => row.site_name, highlight: true },
        { label: "Purchase Total Amount", value: (row) => row.purchase_total_amount },
        { label: "Payment Amount", value: (row) => row.amount, highlight: true },
        { label: "Payment Date", value: (row) => row.date },
        { label: "Reference Number", value: (row) => row.reference_number },
        { label: "Pending After Payment", value: (row) => row.pending_after_payment ?? row.purchase_pending_amount, highlight: true },
        { label: "Purchase Pending Amount", value: (row) => row.purchase_pending_amount },
        { label: "Remarks", value: (row) => row.remarks, span: "full" },
      ]}
    />
  );
}
