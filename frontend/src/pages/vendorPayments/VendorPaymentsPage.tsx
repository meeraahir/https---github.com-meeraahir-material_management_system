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
  cheque_number: z.string().max(50, "Cheque number must be 50 characters or fewer."),
  date: z.string().min(1, "Payment date is required."),
  payment_mode: z.enum(["cash", "check", "bank_transfer", "upi", "other"]),
  purchase: z.number().min(1, "Purchase is required."),
  receiver_name: z.string().max(255, "Receiver name must be 255 characters or fewer."),
  reference_number: z
    .string()
    .max(50, "Reference number must be 50 characters or fewer."),
  remarks: z
    .string()
    .max(600, "Remarks must be 600 characters or fewer."),
  sender_name: z.string().max(255, "Sender name must be 255 characters or fewer."),
}).superRefine((value, context) => {
  if (value.payment_mode === "cash" && !value.sender_name.trim() && !value.receiver_name.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Sender name or receiver name is required for cash payments.",
      path: ["sender_name"],
    });
  }

  if (value.payment_mode === "check" && !value.cheque_number.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Cheque number is required for check payments.",
      path: ["cheque_number"],
    });
  }
});

function getPurchaseLabel(purchase: Purchase) {
  const reference = `Purchase #${purchase.id}`;
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
          accessor: (row) => `Purchase #${row.purchase}`,
          sortValue: (row) => row.purchase,
        },
        { key: "vendor", header: "Vendor", accessor: (row) => row.vendor_name, sortValue: (row) => row.vendor_name },
        { key: "site", header: "Site", accessor: (row) => row.site_name, sortValue: (row) => row.site_name },
        { key: "amount", header: "Amount", accessor: (row) => row.amount, sortValue: (row) => row.amount },
        { key: "date", header: "Date", accessor: (row) => row.date, sortValue: (row) => row.date },
        {
          key: "payment_mode",
          header: "Payment Mode",
          accessor: (row) => row.payment_mode || "-",
          sortValue: (row) => row.payment_mode || "",
        },
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
        cheque_number: "",
        date: new Date().toISOString().slice(0, 10),
        payment_mode: "cash",
        purchase: 0,
        receiver_name: "",
        reference_number: "",
        remarks: "",
        sender_name: "",
      }}
      description="Record vendor payments against existing purchases and keep purchase pending balances in sync."
      emptyDescription="No vendor payments have been recorded."
      emptyTitle="No vendor payments found"
      externalError={purchaseError}
      fields={[
        {
          kind: "select",
          label: "Purchase",
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
          kind: "select",
          label: "Payment Mode",
          name: "payment_mode",
          options: [
            { label: "Cash", value: "cash" },
            { label: "Check", value: "check" },
            { label: "Bank Transfer", value: "bank_transfer" },
            { label: "UPI", value: "upi" },
            { label: "Other", value: "other" },
          ],
          required: true,
        },
        {
          kind: "text",
          label: "Sender Name",
          maxLength: 255,
          name: "sender_name",
          placeholder: "Who paid this amount",
        },
        {
          kind: "text",
          label: "Receiver Name",
          maxLength: 255,
          name: "receiver_name",
          placeholder: "Who received this amount",
        },
        {
          kind: "text",
          label: "Cheque Number",
          maxLength: 50,
          name: "cheque_number",
          placeholder: "Required for check payments",
        },
        {
          kind: "text",
          label: "Reference Number",
          maxLength: 50,
          name: "reference_number",
          placeholder: "UTR, cheque, or cash reference",
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
        cheque_number: entity.cheque_number || "",
        date: entity.date,
        payment_mode: entity.payment_mode || "cash",
        purchase: entity.purchase,
        receiver_name: entity.receiver_name || "",
        reference_number: entity.reference_number || "",
        remarks: entity.remarks || "",
        sender_name: entity.sender_name || "",
      })}
      getId={(entity) => entity.id}
      schema={vendorPaymentSchema}
      searchPlaceholder="Search vendor payments"
      service={vendorPaymentsService}
      title="Vendor Payments"
      viewFields={[
        { label: "Record ID", value: (row) => row.id, highlight: true },
        { label: "Purchase", value: (row) => `Purchase #${row.purchase}`, highlight: true },
        { label: "Vendor", value: (row) => row.vendor_name, highlight: true },
        { label: "Site", value: (row) => row.site_name, highlight: true },
        { label: "Purchase Total Amount", value: (row) => row.purchase_total_amount },
        { label: "Payment Amount", value: (row) => row.amount, highlight: true },
        { label: "Payment Date", value: (row) => row.date },
        { label: "Payment Mode", value: (row) => row.payment_mode },
        { label: "Sender Name", value: (row) => row.sender_name },
        { label: "Receiver Name", value: (row) => row.receiver_name },
        { label: "Cheque Number", value: (row) => row.cheque_number },
        { label: "Reference Number", value: (row) => row.reference_number },
        { label: "Pending After Payment", value: (row) => row.pending_after_payment ?? row.purchase_pending_amount, highlight: true },
        { label: "Purchase Pending Amount", value: (row) => row.purchase_pending_amount },
        { label: "Remarks", value: (row) => row.remarks, span: "full" },
      ]}
    />
  );
}
