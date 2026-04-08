import { z } from "zod";

import { CrudModulePage } from "../../components/forms/CrudModulePage";
import { useReferenceData } from "../../hooks/useReferenceData";
import { vendorPurchasesService } from "../../services/vendorPurchasesService";
import type { Purchase, PurchaseFormValues } from "../../types/erp.types";

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

export function VendorPurchasesPage() {
  const references = useReferenceData();

  return (
    <CrudModulePage<Purchase, PurchaseFormValues>
      canManage
      columns={[
        { key: "vendor", header: "Vendor", accessor: (row) => row.vendor_name, sortValue: (row) => row.vendor_name },
        { key: "site", header: "Site", accessor: (row) => row.site_name, sortValue: (row) => row.site_name },
        { key: "material", header: "Material", accessor: (row) => row.material_name || "-", sortValue: (row) => row.material_name || "" },
        { key: "total", header: "Total", accessor: (row) => row.total_amount, sortValue: (row) => row.total_amount },
        { key: "paid", header: "Paid", accessor: (row) => row.paid_amount, sortValue: (row) => row.paid_amount },
        { key: "pending", header: "Pending", accessor: (row) => row.pending_amount, sortValue: (row) => row.pending_amount },
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
          label: "Paid Amount",
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
    />
  );
}
