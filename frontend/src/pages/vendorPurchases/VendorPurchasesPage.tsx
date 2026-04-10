import { z } from "zod";

import { CrudModulePage } from "../../components/forms/CrudModulePage";
import { useAuth } from "../../hooks/useAuth";
import { useReferenceData } from "../../hooks/useReferenceData";
import { vendorPurchasesService } from "../../services/vendorPurchasesService";
import type { Purchase, PurchaseFormValues } from "../../types/erp.types";
import { getCrudPermissions } from "../../utils/permissions";

const purchaseSchema = z
  .object({
    date: z.string().min(1, "Date is required."),
    description: z
      .string()
      .max(300, "Description must be 300 characters or fewer."),
    invoice_number: z
      .string()
      .max(60, "Invoice number must be 60 characters or fewer."),
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

function getPaymentStatus(row: Purchase) {
  if (row.pending_amount <= 0) {
    return "Paid";
  }

  if (row.paid_amount > 0) {
    return "Partial";
  }

  return "Pending";
}

export function VendorPurchasesPage() {
  const { user } = useAuth();
  const references = useReferenceData();
  const permissions = getCrudPermissions(user);

  return (
    <CrudModulePage<Purchase, PurchaseFormValues>
      canCreate={permissions.canCreate}
      canDelete={permissions.canDelete}
      canEdit={permissions.canEdit}
      columns={[
        { key: "vendor", header: "Vendor", accessor: (row) => row.vendor_name, sortValue: (row) => row.vendor_name },
        { key: "invoice", header: "Invoice", accessor: (row) => row.invoice_number || "-", sortValue: (row) => row.invoice_number || "" },
        { key: "date", header: "Date", accessor: (row) => row.date, sortValue: (row) => row.date },
        { key: "site", header: "Site", accessor: (row) => row.site_name, sortValue: (row) => row.site_name },
        { key: "material", header: "Material", accessor: (row) => row.material_name || "-", sortValue: (row) => row.material_name || "" },
        { key: "total", header: "Total", accessor: (row) => row.total_amount, sortValue: (row) => row.total_amount },
        { key: "paid", header: "Paid", accessor: (row) => row.paid_amount, sortValue: (row) => row.paid_amount },
        { key: "pending", header: "Pending", accessor: (row) => row.pending_amount, sortValue: (row) => row.pending_amount },
        { key: "status", header: "Status", accessor: (row) => getPaymentStatus(row), sortValue: (row) => getPaymentStatus(row) },
      ]}
      createLabel="Add Purchase"
      defaultValues={{
        date: new Date().toISOString().slice(0, 10),
        description: "",
        invoice_number: "",
        material: 0,
        paid_amount: 0,
        site: 0,
        total_amount: 0,
        vendor: 0,
      }}
      description="Capture vendor purchase entries, invoices, and pending payment values."
      emptyDescription="No vendor purchases are available."
      emptyTitle="No purchases found"
      externalError={references.error}
      fields={[
        {
          kind: "select",
          label: "Vendor",
          name: "vendor",
          options: references.vendors.map((vendor) => ({ label: vendor.name, value: vendor.id })),
          required: true,
          valueType: "number",
        },
        {
          kind: "select",
          label: "Site",
          name: "site",
          options: references.sites.map((site) => ({ label: site.name, value: site.id })),
          required: true,
          valueType: "number",
        },
        {
          kind: "select",
          label: "Material",
          name: "material",
          options: references.materials.map((material) => ({ label: material.name, value: material.id })),
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
          rows: 5,
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
          description: "Use only if some payment was done while creating this purchase. Later payments should be recorded from Vendor Payments.",
          label: "Initial Paid Amount",
          min: 0,
          name: "paid_amount",
          required: true,
          valueType: "number",
        },
      ]}
      getEditValues={(entity) => ({
        date: entity.date,
        description: entity.description || "",
        invoice_number: entity.invoice_number || "",
        material: entity.material || 0,
        paid_amount: entity.paid_amount,
        site: entity.site,
        total_amount: entity.total_amount,
        vendor: entity.vendor,
      })}
      getId={(entity) => entity.id}
      schema={purchaseSchema}
      searchPlaceholder="Search vendor purchases"
      service={vendorPurchasesService}
      title="Vendor Purchases"
      viewFields={[
        { label: "Record ID", value: (row) => row.id, highlight: true },
        { label: "Vendor", value: (row) => row.vendor_name, highlight: true },
        { label: "Site", value: (row) => row.site_name, highlight: true },
        { label: "Material", value: (row) => row.material_name },
        { label: "Invoice Number", value: (row) => row.invoice_number, highlight: true },
        { label: "Purchase Date", value: (row) => row.date },
        { label: "Total Amount", value: (row) => row.total_amount, highlight: true },
        { label: "Initial Paid Amount", value: (row) => row.paid_amount, highlight: true },
        { label: "Pending Amount", value: (row) => row.pending_amount, highlight: true },
        { label: "Payment Status", value: (row) => getPaymentStatus(row), highlight: true },
        { label: "Description", value: (row) => row.description, span: "full" },
      ]}
    />
  );
}
